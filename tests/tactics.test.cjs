const { test } = require("node:test"),
  assert = require("node:assert/strict");
const E = require("../engine.js"),
  S = require("../saves.js"),
  T = E.tactics;
function career() {
  const s = E.fresh();
  E.start(s, "br-0");
  return s;
}
test("seis desenhos têm onze locais; a troca de titulares preserva identidades sem duplicar", () => {
  const s = career(),
    t = E.team(s);
  for (const formation of Object.keys(T.formations)) {
    T.formation(t, formation);
    assert.equal(T.slots(t).length, 11);
    assert.equal(E.lineup(t).length, 11);
    assert.equal(new Set(E.lineup(t).map((p) => p.id)).size, 11);
  }
  const before = T.positions(t).map((p) => p.id);
  T.select(t, 1, before[2]);
  const after = T.positions(t).map((p) => p.id);
  assert.equal(after[1], before[2]);
  assert.equal(after[2], before[1]);
  assert.deepEqual([...before].sort(), [...after].sort());
  const reserve = t.players.find((p) => !after.includes(p.id));
  reserve.injury = 2;
  assert.throws(() => T.select(t, 2, reserve.id), /lesionado/);
  assert.deepEqual(
    T.positions(t).map((p) => p.id),
    after,
  );
});
test("escolhas manuais são reservadas antes de preencher espaços automáticos; fora de posição afeta força", () => {
  const s = career(),
    t = E.team(s),
    last = t.players
      .filter((p) => p.pos === "ATA")
      .sort((a, b) => b.ovr - a.ovr)[0];
  t.lineup[10] = last.id;
  assert.equal(T.positions(t)[10].id, last.id);
  assert.equal(E.lineup(t).filter((p) => p.id === last.id).length, 1);
  const initial = T.positions(t).map((p) => p.id);
  t.lineup = initial;
  const keeper = initial[0],
    attacker = initial[9],
    before = E.strength(t);
  T.select(t, 0, attacker);
  assert(E.strength(t) < before);
  assert.equal(T.positions(t)[9].id, keeper);
});
test("capitão, vice e cobradores respeitam o onze e aparecem nos eventos de bola parada", () => {
  const s = career(),
    t = E.team(s),
    ps = E.lineup(t);
  T.setAssignment(t, "captain", ps[2].id);
  T.setAssignment(t, "viceCaptain", ps[3].id);
  assert.throws(
    () => T.setAssignment(t, "viceCaptain", ps[2].id),
    /diferentes/,
  );
  for (const key of ["penalties", "freeKicks", "cornersLeft", "cornersRight"])
    T.setAssignment(t, key, ps[9].id);
  let m = E.makeMatch(s),
    side = m.pair.indexOf(t.id);
  assert.equal(m.plans[side].specialists.captain.id, ps[2].id);
  for (const kind of [0, 0.05, 0.12, 0.25]) {
    const values = [0, side === 0 ? 0 : 0.99, kind, 0, 0],
      sample = { ...m, minute: 0, goals: [0, 0], shots: [0, 0], events: [] };
    E.minute(s, sample, () => values.shift() ?? 0);
    assert.equal(sample.goals[side], 1);
    assert(sample.events[0].includes(ps[9].name));
  }
  ps[2].injury = 2;
  assert.equal(T.specialists(t).captain.id, ps[3].id);
});
test("funções, ritmo e pressão têm efeito no plano e no desgaste", () => {
  const s = career(),
    t = E.team(s),
    base = T.ratings(t);
  T.setRole(t, 7, "Armador", "Atacar");
  T.update(t, "tempo", "Rápido");
  T.update(t, "pressing", "Alta");
  T.update(t, "style", "Posse de bola");
  const next = T.ratings(t);
  assert(next.attack > base.attack);
  assert.equal(next.fatigue, 5);
  const m = E.makeMatch(s),
    side = m.pair.indexOf(t.id);
  assert.equal(m.plans[side].instructions.style, "Posse de bola");
  assert.equal(m.plans[side].fatigue, 5);
});
test("planos e bolas paradas persistem com save e continuam disponíveis para clube e seleção", () => {
  const s = career(),
    t = E.team(s);
  T.formation(t, "3-5-2");
  const captain = E.lineup(t)[0];
  T.setAssignment(t, "captain", captain.id);
  invite(s, "nt-Brazil");
  E.assumeNational(s, "nt-Brazil");
  let nt = E.team(s, s.national.job);
  T.formation(nt, "4-4-2");
  s.national.plans = { [nt.id]: nt.tactics };
  s.national.lineups = { [nt.id]: nt.lineup };
  const re = S.parse(S.serialize(s));
  assert.equal(E.team(re).tactics.formation, "3-5-2");
  assert.equal(E.team(re).tactics.assignments.captain, captain.id);
  assert.equal(E.team(re, re.national.job).tactics.formation, "4-4-2");
});
test("orçamento direto altera limites, libera recursos e não altera o caixa; recusa é atômica", () => {
  const s = career(),
    t = E.team(s),
    f = E.finance,
    payroll = f.payroll(t),
    before = t.money;
  f.setBudgets(t, s, 5000000, payroll + 10000);
  assert.equal(t.finance.transferBudget, 5000000);
  assert.equal(t.finance.wageBudget, payroll + 10000);
  assert.equal(t.money, before);
  assert(f.freeCash(t) > 0);
  const snapshot = JSON.stringify(t);
  assert.throws(
    () => f.setBudgets(t, s, Number.MAX_SAFE_INTEGER, payroll),
    /recursos/,
  );
  assert.equal(JSON.stringify(t), snapshot);
  assert.throws(() => f.setBudgets(t, s, 0, payroll - 1), /folha/);
  assert.equal(JSON.stringify(t), snapshot);
  f.setBudgets(t, s, 6000000, payroll + 10000);
  assert.equal(t.money, before);
  assert.equal(t.finance.budgetHistory.length, 2);
  assert.equal(t.finance.budgetHistory[1].funding, 1000000);
  const restored = S.parse(S.serialize(s));
  assert.equal(E.team(restored).finance.transferBudget, 6000000);
});
test("jogo antigo fora da data é arquivado e não mantém acesso ou calendário bloqueado", () => {
  const s = career(),
    f = E.nextFixture(s);
  s.day = 1;
  s.today = 1;
  s.live = {
    ...f,
    day: 0,
    offset: 0,
    minute: 25,
    goals: [0, 0],
    shots: [0, 0],
    events: [],
    mode: "text",
  };
  assert.equal(E.currentMatch(s).available, false);
  E.prepareCareer(s);
  assert.equal(s.live, null);
  assert.equal(s.interruptedMatchArchive.minute, 25);
  assert.equal(E.currentMatch(s).available, false);
  assert.equal(E.simulate(s, 1, "days", () => 0.99).advanced, 1);
});
test("titulares de seleção recebem desgaste do plano sem duplicar seus registros no clube", () => {
  const s = career();
  invite(s, "nt-Argentina");
  E.assumeNational(s, "nt-Argentina");
  let nt = E.team(s, s.national.job);
  T.update(nt, "pressing", "Alta");
  T.update(nt, "tempo", "Rápido");
  s.national.plans = { [nt.id]: nt.tactics };
  while (s.today < 5) {
    if (E.nextFixture(s)) {
      const m = E.makeMatch(s);
      while (m.minute < 90) E.minute(s, m, () => 0.99);
    }
    E.advance(s, () => 0.99);
    s.live = null;
  }
  const player = E.lineup(E.team(s, s.national.job))[0],
    before = player.fitness;
  let m = E.makeMatch(s);
  while (m.minute < 90) E.minute(s, m, () => 0.99);
  E.advance(s, () => 0.99);
  assert.equal(player.fitness, before - E.fatigueLoss(player, 90, 5));
});

test("Raphinha atua nas duas pontas; todas as posições confirmadas preservam o overall posicional", () => {
  const s = E.fresh(),
    all = [
      ...s.teams.flatMap((t) => [...t.players, ...t.youth]),
      ...s.freeAgents,
    ];
  const available = new Map(
    Object.values(T.formations)
      .flat()
      .map((slot) => [T.targetPosition(slot), slot]),
  );
  let checked = 0;
  for (const p of all)
    for (const code of [
      ...(p.naturalPositions || []),
      ...(p.secondaryPositions || []),
    ]) {
      const slot = available.get(code);
      if (!slot) continue;
      const fit = T.adaptation(p, slot);
      assert.equal(fit.factor, 1, `${p.name} em ${code}`);
      assert.equal(fit.effective, p.ovr, `${p.name} em ${code}`);
      assert.equal(fit.penalty, 0);
      checked++;
    }
  assert(checked > 10000);
  const raphinha = E.team(s, "es-1").players.find((p) => p.id === "tm-411295");
  for (const code of ["PE", "PD"])
    assert.equal(T.fit(raphinha, available.get(code)), 1);
  assert(T.fit(raphinha, available.get("CA")) < 1);
  for (const [id, code] of [
    ["tm-288230", "CA"],
    ["tm-406635", "MC"],
    ["tm-369081", "VOL"],
    ["tm-342229", "PE"],
  ]) {
    const p = all.find((p) => p.id === id);
    assert.equal(T.adaptation(p, available.get(code)).effective, p.ovr, p.name);
  }
});
test("Raphinha atua como ATA sem perda; a função Centroavante mantém a distinção de CA e os lados continuam específicos", () => {
  const s = E.fresh();
  E.start(s, "es-1");
  const t = E.team(s),
    p = t.players.find((p) => p.id === "tm-411295");
  T.select(t, 9, p.id);
  const lineup = [...t.lineup];
  assert(T.positionMatches(p, "ATA"));
  assert.equal(T.targetPosition(T.slots(t)[9]), "ATA");
  assert.equal(T.adaptation(p, T.slots(t)[9]).effective, p.ovr);
  T.setRole(t, 9, "Centroavante", "Atacar");
  assert.equal(T.targetPosition(T.slots(t)[9]), "CA");
  assert(T.fit(p, T.slots(t)[9]) < 1);
  T.setRole(t, 9, "Atacante", "Atacar");
  assert.equal(T.fit(p, T.slots(t)[9]), 1);
  assert.deepEqual(t.lineup, lineup);
  const m = E.makeMatch(s),
    plan = m.plans[m.pair.indexOf(t.id)];
  assert.equal(T.fit(plan.starters[9], plan.slots[9]), 1);
  const real = E.team(s, "es-0"),
    vini = real.players.find((p) => p.id === "tm-371998");
  assert.equal(T.fit(vini, T.slots(real)[8]), 0.68);
  delete plan.positionRevision;
  plan.slots[9] = { ...T.formations["4-3-3"][9] };
  const re = S.parse(S.serialize(s));
  assert.equal(
    T.fit(
      E.team(re).players.find((x) => x.id === p.id),
      T.slots(E.team(re))[9],
    ),
    1,
  );
  const restored = re.live.plans[re.live.pair.indexOf(re.clubId)];
  assert.equal(T.targetPosition(restored.slots[9]), "ATA");
  assert.equal(T.fit(restored.starters[9], restored.slots[9]), 1);
});
test("atualiza posições parciais de um atleta transferido sem desfazer evolução, contrato ou escalação", () => {
  const s = career(),
    t = E.team(s),
    origin = E.team(s, "es-1"),
    p = origin.players.find((p) => p.id === "tm-411295");
  origin.players = origin.players.filter((x) => x.id !== p.id);
  t.players.push(p);
  p.ovr += 2;
  p.salary += 37;
  p.fitness = 81;
  p.fatigue = 28;
  T.select(t, 8, p.id);
  const lineup = [...t.lineup],
    original = {
      ovr: p.ovr,
      salary: p.salary,
      contract: p.contract,
      fitness: p.fitness,
      fatigue: p.fatigue,
      money: t.money,
    };
  p.secondaryPositions = ["ME"];
  delete p.positionRevision;
  E.prepareCareer(s);
  assert(p.secondaryPositions.includes("PD"));
  assert.equal(T.fit(p, T.slots(t)[8]), 1);
  assert.deepEqual(t.lineup, lineup);
  assert.deepEqual(
    {
      ovr: p.ovr,
      salary: p.salary,
      contract: p.contract,
      fitness: p.fitness,
      fatigue: p.fatigue,
      money: t.money,
    },
    original,
  );
  const once = JSON.stringify(s);
  E.prepareCareer(s);
  assert.equal(JSON.stringify(s), once);
  const re = S.parse(S.serialize(s));
  assert.equal(
    T.adaptation(
      E.team(re).players.find((x) => x.id === p.id),
      T.slots(E.team(re))[8],
    ).effective,
    original.ovr,
  );
});
test("filtro reconhece famílias das posições detalhadas mesmo com categoria antiga diferente", () => {
  const s = E.fresh(),
    messi = E.team(s, "us-0").players.find((p) => p.name === "Leo Messi");
  assert.equal(messi.pos, "MEI");
  assert(T.positionMatches(messi, "ATA"));
  assert(T.positionMatches(messi, "PD"));
  assert(!T.positionMatches(messi, "ZAG"));
  const v = E.team(s, "es-0").players.find((p) => p.id === "tm-371998");
  assert(!T.positionMatches(v, "PD"));
  assert.equal(T.fit(v, T.formations["4-3-3"][8]), 0.68);
});
test("corredores compatíveis consideram alternativas do atleta sem liberar o lado oposto", () => {
  const s = E.fresh(),
    all = s.teams.flatMap((t) => t.players),
    right = T.formations["4-3-3"][8],
    left = T.formations["4-3-3"][10];
  for (const id of ["tm-243714", "tm-568177"]) {
    const p = all.find((p) => p.id === id);
    assert(p.secondaryPositions.includes("MD"));
    assert.equal(T.fit(p, right), 1, p.name);
    assert.equal(T.adaptation(p, right).label, "Habitual");
    assert(T.positionMatches(p, "PD"));
  }
  const fullback = {
    id: "lateral",
    pos: "LAT",
    ovr: 80,
    naturalPositions: ["LE"],
    secondaryPositions: [],
  };
  assert.equal(T.fit(fullback, T.formations["3-5-2"][8]), 1);
  assert(T.fit(fullback, T.formations["3-5-2"][4]) < 1);
  const winger = {
    id: "ponta",
    pos: "MEI",
    ovr: 80,
    naturalPositions: ["ME"],
    secondaryPositions: [],
  };
  assert.equal(T.fit(winger, left), 1);
  assert(T.fit(winger, right) < 1);
});
test("partida salva atualiza posições e força sem reiniciar relógio, placar ou relatos", () => {
  const s = E.fresh();
  E.start(s, "es-1");
  const t = E.team(s),
    p = t.players.find((p) => p.id === "tm-411295");
  T.select(t, 8, p.id);
  const m = E.makeMatch(s),
    side = m.pair.indexOf(t.id),
    plan = m.plans[side];
  m.minute = 12;
  m.goals[side] = 1;
  m.events.unshift("12' — Gol registrado antes da atualização.");
  p.secondaryPositions = ["ME"];
  delete p.positionRevision;
  plan.starters.find((x) => x.id === p.id).secondaryPositions = ["ME"];
  delete plan.positionRevision;
  const before =
    plan.starters.reduce(
      (sum, x, i) =>
        sum +
        x.ovr *
          (0.65 + (0.35 * x.fitness) / 100) *
          (1 - (x.fatigue || 0) * 0.001) *
          T.fit(x, plan.slots[i]),
      0,
    ) / 11;
  plan.strength = before;
  plan.baseStrength = before;
  const score = [...m.goals],
    events = [...m.events],
    lineup = [...t.lineup];
  E.prepareCareer(s);
  assert.equal(m.minute, 12);
  assert.deepEqual(m.goals, score);
  assert.deepEqual(m.events, events);
  assert.deepEqual(t.lineup, lineup);
  assert.equal(
    T.fit(
      plan.starters.find((x) => x.id === p.id),
      plan.slots[8],
    ),
    1,
  );
  assert(plan.baseStrength > before);
});

function invite(s, id) {
  s.national.invites.push({
    id: "test-" + id,
    selectionId: id,
    name: E.national.definitions.find((d) => d.id === id).name,
    status: "pending",
    season: s.season,
    offset: s.today,
    expires: s.today + 14,
    required: 35,
    reason: "Convite de teste para verificar convocação e partida.",
  });
}
