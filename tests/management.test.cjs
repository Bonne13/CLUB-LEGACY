const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm");
const E = require("../engine.js"),
  S = require("../saves.js"),
  A = require("../autosave.js"),
  L = require("../vendor/lz-string.js");
function career() {
  const s = E.fresh();
  E.start(s, "br-0", undefined, "test");
  E.addTestFunds(s, 600000000);
  E.team(s).finance.wageBudget = E.finance.payroll(E.team(s)) + 5000000;
  return s;
}
function day(s) {
  const f = E.nextFixture(s);
  if (f)
    s.live = {
      ...f,
      day: s.day,
      offset: s.today,
      minute: 90,
      goals: [2, 0],
      shots: [8, 2],
      events: [],
      mode: "2d",
    };
  E.advance(s, () => 0.99);
  s.live = null;
}
function days(s, n) {
  for (let i = 0; i < n; i++) day(s);
}
test("codec em worker mantém o formato CL3 compatível com caracteres reais e emoji", () => {
  let output;
  const context = {
    self: {
      postMessage: (value) => {
        output = value;
      },
    },
  };
  vm.runInNewContext(A.workerSource(), context);
  const state = {
    name: "João, Vinícius, México ⚽",
    players: [{ age: 23, ovr: 84 }],
  };
  context.self.onmessage({ data: { state, generation: 7 } });
  assert.equal(output.generation, 7);
  assert.equal(
    L.decompressFromUTF16(output.encoded.slice(4)),
    JSON.stringify(state),
  );
});
test("autosave coalesce mudanças e não restaura uma carreira excluída", async () => {
  let state = { clubId: "br-0", value: 1 },
    writes = [];
  const saver = A.create({
    getState: () => state,
    write: (x) => writes.push(x),
    delay: 5,
  });
  for (let i = 0; i < 4; i++) {
    state.value = i;
    saver.request();
  }
  await new Promise((r) => setTimeout(r, 35));
  assert.equal(writes.length, 1);
  assert.equal(JSON.parse(L.decompressFromUTF16(writes[0].slice(4))).value, 3);
  saver.request();
  saver.cancel();
  await new Promise((r) => setTimeout(r, 35));
  assert.equal(writes.length, 1);
  state = { clubId: "es-0", value: 8 };
  saver.flush();
  assert.equal(
    JSON.parse(L.decompressFromUTF16(writes.at(-1).slice(4))).clubId,
    "es-0",
  );
  saver.dispose();
});
test("avaliações de habilidade corrigem Messi e preservam evolução ao migrar apenas uma vez", () => {
  const s = career(),
    p = s.teams.flatMap((t) => t.players).find((p) => p.name === "Leo Messi");
  assert.equal(p.ovr, 86);
  assert.equal(p.referenceOverall, 86);
  assert(!p.ratingEstimated);
  assert(p.stamina > 0);
  delete p.ratingRevision;
  delete p.ratingBase;
  p.ovr = 70;
  E.prepareCareer(s);
  assert.equal(p.ovr, 88);
  const now = p.ovr;
  E.prepareCareer(s);
  assert.equal(p.ovr, now);
  assert(S.parse(S.serialize(s)));
});
test("olheiro entrega candidatos reais, sem lesionados, com salário e taxa dentro do orçamento", () => {
  const s = career(),
    bank = E.team(s).money;
  const m = E.scouting.start(s, {
    scope: "market",
    position: "all",
    maxFee: 50000000,
  });
  assert.equal(E.team(s).money, bank - 10000);
  assert.throws(() => E.scouting.start(s, { scope: "market" }), /observação/);
  days(s, 3);
  assert.equal(m.status, "completed");
  const report = s.scouting.reports[0];
  assert(report.players.length > 0);
  for (const item of report.players) {
    const t = s.teams.find((t) =>
        t.players.some((p) => p.id === item.playerId),
      ),
      p = t
        ? t.players.find((p) => p.id === item.playerId)
        : s.freeAgents.find((p) => p.id === item.playerId);
    assert(p.real);
    assert(!p.injury);
    const a = E.scouting.advice(s, p, t);
    assert(a.affordable);
    assert(a.askingFee <= 50000000);
  }
  assert(S.parse(S.serialize(s)));
});
test("observação da base não fabrica atletas e responde depois de cinco dias", () => {
  const s = career(),
    ids = new Set(
      s.teams.flatMap((t) => [...t.players, ...t.youth]).map((p) => p.id),
    );
  const m = E.scouting.start(s, { scope: "youth", maxAge: 21 });
  days(s, 4);
  assert.equal(m.status, "pending");
  days(s, 1);
  assert.equal(m.status, "completed");
  for (const item of s.scouting.reports[0].players) {
    assert(ids.has(item.playerId));
    const p = s.teams
      .flatMap((t) => [...t.players, ...t.youth])
      .find((p) => p.id === item.playerId);
    assert(p.age <= 21 && !p.ageUnknown);
  }
});
test("reputação sozinha não libera seleção: mérito gera um convite que pode ser aceito ou expirado", () => {
  const s = career();
  s.reputation = 90;
  assert.equal(E.national.review(s), null);
  assert.throws(() => E.assumeNational(s, "nt-Brazil"), /convite/);
  const row = E.league(s, "br").table.find((r) => r.id === s.clubId);
  Object.assign(row, { w: 8, p: 24 });
  s.today = 56;
  s.day = E.calendar().findIndex((d) => d.offset >= 56);
  const offer = E.national.review(s);
  assert(offer && offer.status === "pending");
  assert.throws(() => E.assumeNational(s, "nt-Argentina"), /convite/);
  E.assumeNational(s, offer.selectionId);
  assert.equal(offer.status, "accepted");
  assert.equal(s.national.job, offer.selectionId);
  assert(S.parse(S.serialize(s)));
});
test("clube pode ceder abaixo do valor-base e o acordo é debitado só na assinatura", () => {
  const s = career(),
    seller = s.teams.find((t) => t.id !== s.clubId && t.players.length >= 25);
  const p = [...seller.players].sort((a, b) => a.price - b.price)[0],
    base = E.minFee(s, p),
    n = E.negotiateClub(s, p.id, Math.floor(base * 0.98));
  days(s, 2);
  assert.equal(n.stage, "club-counter");
  E.counterClub(s, n.id, Math.floor(n.askFee * 0.95));
  days(s, 2);
  assert.equal(n.stage, "club-counter");
  E.counterClub(s, n.id, Math.ceil(n.askFee * 0.97));
  days(s, 2);
  assert.equal(n.stage, "contract-ready");
  assert(n.fee < base);
  E.negotiatePlayer(s, n.id, 500000, p.age >= 32 ? 2 : 4, 5000000, "important");
  days(s, 2);
  assert.equal(n.stage, "medical-pending");
  days(s, 1);
  assert.equal(n.stage, "completed");
  assert(E.team(s).players.includes(p));
});
test("gol registra autor, origem no jogador e trajetória até o gol; gols do visitante usam o lado correto", () => {
  const s = career(),
    m = E.makeMatch(s, "2d");
  let draws = [0, 0, 0.5, 0, 0];
  E.minute(s, m, () => draws.shift() ?? 0);
  assert.equal(m.goals[0], 1);
  const play = m.lastPlay;
  assert.equal(play.type, "goal");
  assert.equal(play.path.at(-2).playerId, play.playerId);
  assert.deepEqual({ x: play.path.at(-2).x, y: play.path.at(-2).y }, play.from);
  assert.equal(play.target.x, 99);
  assert(
    m.events.some((e) => e.includes(play.playerName) && e.includes("GOL")),
  );
  assert.deepEqual(
    E.matchVisual(m).positions.find((p) => p.id === play.playerId).x,
    play.from.x,
  );
  draws = [0, 0.99, 0.5, 0, 0];
  E.minute(s, m, () => draws.shift() ?? 0);
  assert.equal(m.lastPlay.side, 1);
  assert.equal(m.lastPlay.target.x, 1);
  assert(S.parse(S.serialize(s)));
});
test("intervalo e substituição preservam os minutos de cada jogador e o desgaste individual", () => {
  const s = career(),
    m = E.makeMatch(s, "2d");
  for (let i = 0; i < 30; i++) E.minute(s, m, () => 0.99);
  const side = m.pair.indexOf(s.clubId),
    plan = m.plans[side],
    out = plan.starters[7],
    original = E.team(s).players.find((p) => p.id === out.id),
    incoming = E.team(s).players.find(
      (p) => !plan.starters.some((x) => x.id === p.id) && !p.injury,
    ),
    outBefore = original.fitness,
    inBefore = incoming.fitness;
  E.substitute(s, out.id, incoming.id);
  assert.throws(
    () => E.substitute(s, incoming.id, out.id),
    /reentrada|disponível/,
  );
  while (m.minute < 45) E.minute(s, m, () => 0.99);
  assert(!m.secondHalfStarted);
  E.startSecondHalf(s);
  assert(m.secondHalfStarted);
  while (m.minute < 90) E.minute(s, m, () => 0.99);
  assert.equal(m.minutesPlayed[out.id], 30);
  assert.equal(m.minutesPlayed[incoming.id], 60);
  E.advance(s, () => 0.99);
  assert.equal(
    original.fitness,
    outBefore - E.fatigueLoss(original, 30, plan.fatigue),
  );
  assert.equal(
    incoming.fitness,
    inBefore - E.fatigueLoss(incoming, 60, plan.fatigue),
  );
  const values = new Set(E.team(s).players.map((p) => p.fitness));
  assert(values.size >= 4);
});
test("calendário mantém o placar de partidas anteriores e não muda o dia ao consultar", () => {
  const s = career(),
    initial = E.nextFixture(s);
  day(s);
  const date = s.today,
    events = E.careerCalendar(s),
    prior = events.find(
      (f) => f.offset === 0 && f.pair.join("|") === initial.pair.join("|"),
    );
  assert.deepEqual(prior.goals, [2, 0]);
  assert.equal(s.today, date);
  assert.equal(E.upcomingFixture(s).offset, 7);
  assert.equal(E.transferWindowInfo(s).open, true);
  s.today = 50;
  s.day = E.calendar().findIndex((d) => d.offset >= 50);
  assert.equal(E.windowOpen(s), false);
});
test("título continental gera um troféu único que permanece em novas temporadas", () => {
  const s = career(),
    c = s.cups.find((c) => c.id === "libertadores"),
    opponent = c.entrants.find((id) => id !== s.clubId),
    d = E.calendar().findIndex((d) => d.kind === "cup" && d.round === 12);
  c.rounds.push({ phase: 12, pairs: [[s.clubId, opponent]], results: [] });
  s.day = d;
  s.today = E.calendar()[d].offset;
  const f = E.nextFixture(s);
  assert(f);
  s.live = {
    ...f,
    day: d,
    offset: s.today,
    minute: 90,
    goals: [2, 0],
    shots: [8, 2],
    events: [],
    mode: "2d",
  };
  E.advance(s, () => 0.99);
  const trophy = s.trophies.find((t) => t.competitionId === c.id);
  assert.equal(trophy.clubId, s.clubId);
  assert.equal(trophy.coachId, "you");
  assert.equal(trophy.celebrated, false);
  const id = trophy.id;
  E.prepareCareer(s);
  assert.equal(s.trophies.filter((t) => t.id === id).length, 1);
  s.live = null;
  E.nextSeason(s);
  assert(s.trophies.some((t) => t.id === id));
  assert(S.parse(S.serialize(s)));
});
test("descanso recupera energia e reduz desgaste mais que carga intensa; o plano individual expira", () => {
  const s = career(),
    p = E.team(s).players.find((p) => p.pos !== "GOL");
  p.fitness = 64;
  p.fatigue = 68;
  const intense = E.physical.preview(
      { ...p, trainingPlan: "intense" },
      "Técnica",
      1,
    ),
    rest = E.physical.preview({ ...p, restDays: 2 }, "Técnica", 1);
  assert(rest.energy > intense.energy);
  assert(rest.fatigue < intense.fatigue);
  assert.equal(E.physical.plan({ ...p, trainingPlan: "auto" }), "rest");
  E.setRecoveryPlan(s, p.id, "rest2");
  E.physical.apply(p, { globalMode: "Técnica" });
  assert.equal(p.restDays, 1);
  assert(p.fitness > 64 && p.fatigue < 68);
  E.physical.apply(p, { globalMode: "Técnica" });
  assert.equal(p.restDays, 0);
  p.injury = 3;
  assert.throws(() => E.setRecoveryPlan(s, p.id, "intense"), /médico/);
  assert(S.parse(S.serialize(s)));
});
test("resistência, idade, goleiro e minutos mudam o desgaste sem alterar o overall base", () => {
  const P = E.physical,
    young = {
      id: "p-123",
      pos: "ATA",
      age: 21,
      stamina: 90,
      fitness: 100,
      fatigue: 0,
    },
    old = { ...young, age: 37, stamina: 60 };
  assert(P.loss(old) > P.loss(young));
  assert(P.loss({ ...old, pos: "GOL" }) < P.loss(old));
  assert(P.loss(old, 30) < P.loss(old, 90));
  const before = { ...old, ovr: 85 };
  P.apply(before, { minutes: 90, extra: 5 });
  assert.equal(before.ovr, 85);
  assert(before.fatigue > 0);
  const days = P.restEstimate(before);
  assert(days >= 1 && days <= 8);
});
test("renovação negocia com o próprio atleta fora da janela e altera papel e salário só após assinatura", () => {
  const s = career(),
    p = E.team(s).players.find((p) => p.pos !== "GOL"),
    oldSalary = p.salary,
    oldContract = p.contract;
  s.today = 50;
  s.day = E.calendar().findIndex((d) => d.offset >= 50);
  assert(!E.windowOpen(s));
  const n = E.proposeRenewal(
    s,
    p.id,
    Math.ceil(p.salary * 2),
    p.age >= 32 ? 2 : 4,
    p.salary * 12,
    "key",
  );
  assert.equal(n.kind, "renewal");
  assert.equal(n.stage, "player-pending");
  assert.equal(p.salary, oldSalary);
  days(s, 2);
  assert.equal(n.stage, "signature-pending");
  assert.equal(p.salary, oldSalary);
  days(s, 1);
  assert.equal(n.stage, "completed");
  assert.equal(p.salary, oldSalary * 2);
  assert.equal(p.squadRole, "key");
  assert(p.contract >= oldContract);
  assert(E.team(s).players.includes(p));
  assert.equal(s.transfers.length, 0);
  assert(S.parse(S.serialize(s)));
});
test("número de camisa é único por clube, pode ser editado e persiste no save", () => {
  const s = career(),
    t = E.team(s),
    [a, b] = t.players;
  assert.equal(
    new Set([...t.players, ...t.youth].map((p) => p.shirtNumber)).size,
    t.players.length + t.youth.length,
  );
  const occupied = b.shirtNumber;
  const result = E.setShirtNumber(s, a.id, occupied);
  assert.equal(a.shirtNumber, occupied);
  assert.equal(b.shirtNumber, result.displacedNumber);
  assert.notEqual(a.shirtNumber, b.shirtNumber);
  E.setShirtNumber(s, a.id, 99);
  assert.equal(a.shirtNumber, 99);
  const saved = S.parse(S.serialize(s));
  assert.equal(
    E.team(saved).players.find((p) => p.id === a.id).shirtNumber,
    99,
  );
  const m = E.makeMatch(s, "2d");
  assert(
    m.plans.flatMap((plan) => plan.starters).every((p) => p.shirtNumber >= 1),
  );
  assert.throws(() => E.setShirtNumber(s, a.id, 98), /Conclua/);
});
test("partida antiga em andamento mantém os minutos já disputados ao ganhar o sistema físico", () => {
  const s = career(),
    m = E.makeMatch(s, "2d");
  for (let i = 0; i < 45; i++) E.minute(s, m, () => 0.99);
  delete m.minutesPlayed;
  delete m.secondHalfStarted;
  for (const plan of m.plans)
    for (const p of plan.starters) {
      delete p.fitness;
      delete p.stamina;
      delete p.shirtNumber;
    }
  E.prepareCareer(s);
  assert(
    m.plans
      .flatMap((p) => p.starters)
      .every(
        (p) =>
          m.minutesPlayed[p.id] === 45 &&
          p.fitness > 0 &&
          p.stamina > 0 &&
          p.shirtNumber,
      ),
  );
  assert.equal(m.secondHalfStarted, false);
  assert(S.parse(S.serialize(s)));
});
test("replay mantém o autor e a origem mesmo após ele sair de campo", () => {
  const s = career(),
    m = E.makeMatch(s, "2d");
  let seq = [0, 0, 0.5, 0, 0];
  E.minute(s, m, () => seq.shift() ?? 0);
  const play = m.lastPlay,
    side = play.side,
    actor = play.playerId;
  assert.equal(m.pair[side], s.clubId);
  const incoming = E.team(s).players.find(
    (p) => !m.plans[side].starters.some((x) => x.id === p.id) && !p.injury,
  );
  E.substitute(s, actor, incoming.id);
  assert(!m.plans[side].starters.some((p) => p.id === actor));
  const replay = E.matchVisual(m, play);
  assert(replay.positions.some((p) => p.id === actor));
  assert.equal(replay.positions.find((p) => p.id === actor).x, play.from.x);
  assert(S.parse(S.serialize(s)));
});
test("adversário sem cobertura não cria jogadores fictícios nem quebra uma finalização", () => {
  const s = career(),
    f = E.nextFixture(s),
    opponent = E.team(
      s,
      f.pair.find((id) => id !== s.clubId),
    );
  opponent.players = [];
  opponent.youth = [];
  const m = E.makeMatch(s, "2d");
  let seq = [0, 0.99, 0.5, 0, 0];
  E.minute(s, m, () => seq.shift() ?? 0);
  assert.equal(m.lastPlay.playerId, null);
  assert.equal(m.lastPlay.playerName, "Autoria não disponível na base");
  assert.equal(m.lastPlay.positions.length, 11);
  assert(S.parse(S.serialize(s)));
});
test("planejamento entre temporadas permite concluir negociações e recuperar atletas sem repetir prêmios", () => {
  const s = career();
  s.day = E.calendar().length;
  s.today = E.calendar().at(-1).offset + 1;
  const p = E.team(s).players[0],
    salary = p.salary,
    money = E.team(s).money;
  p.fitness = 70;
  p.fatigue = 55;
  E.setRecoveryPlan(s, p.id, "rest3");
  const n = E.proposeRenewal(
    s,
    p.id,
    Math.ceil(salary * 2),
    p.age >= 32 ? 2 : 4,
    salary * 20,
    "important",
  );
  E.advancePlanning(s, () => 0.99);
  assert.equal(n.stage, "player-pending");
  E.advancePlanning(s, () => 0.99);
  assert.equal(n.stage, "signature-pending");
  E.advancePlanning(s, () => 0.99);
  assert.equal(n.stage, "completed");
  assert(p.fitness > 70 && p.fatigue < 55);
  assert.equal(s.trophies.length, 0);
  assert(E.team(s).money < money);
  assert(S.parse(S.serialize(s)));
});
