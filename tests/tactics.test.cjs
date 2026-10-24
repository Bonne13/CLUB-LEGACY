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
  assert.equal(player.fitness, before - 17);
});
