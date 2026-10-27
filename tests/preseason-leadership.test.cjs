const { test } = require("node:test"),
  assert = require("node:assert/strict");
const E = require("../engine.js"),
  S = require("../saves.js"),
  T = E.tactics;
function career(id = "es-1", regional = true) {
  const s = E.fresh();
  E.start(
    s,
    id,
    { name: "Marina Costa", age: 35, nationality: "Brazil" },
    "test",
    regional ? { calendar: "regional" } : {},
  );
  return s;
}
function complete(s, goals = [3, 0]) {
  const m = E.makeMatch(s, "2d");
  m.minute = 90;
  m.goals = goals;
  m.minutesPlayed = Object.fromEntries(
    m.plans.flatMap((p) => p.starters.map((x) => [x.id, 90])),
  );
  E.advance(s, () => 0.99);
  s.live = null;
}
test("Raphinha lidera a referência do Barcelona; hierarquia, vice e escolhas manuais usam apenas atletas em campo", () => {
  const s = career(),
    t = E.team(s),
    p = t.players.find((p) => p.id === "tm-411295");
  assert(T.skills(p).leadership >= 94);
  assert.equal(T.specialists(t).captain.id, p.id);
  const ps = T.positions(t).filter(Boolean),
    pedri = t.players.find((p) => p.name === "Pedri");
  assert(ps.includes(pedri));
  assert.equal(
    T.specialists(
      t,
      ps.filter((x) => x !== p),
    ).captain.id,
    pedri.id,
  );
  const selected = ps.find((x) => x !== p && x !== pedri);
  T.setAssignment(t, "captain", selected.id);
  T.setAssignment(t, "viceCaptain", pedri.id);
  assert.equal(T.specialists(t).captain.id, selected.id);
  assert.equal(
    T.specialists(
      t,
      ps.filter((x) => x !== selected),
    ).captain.id,
    pedri.id,
  );
  const r = S.parse(S.serialize(s));
  assert.equal(E.team(r).tactics.assignments.captain, selected.id);
  assert.equal(
    T.skills(E.team(r).players.find((x) => x.id === p.id)).leadership,
    94,
  );
});
test("capitania usa identidades estáveis de 31 clubes e não transfere a braçadeira para homônimos nem atletas ausentes", () => {
  const s = career();
  assert.equal(T.leadership.data.clubs.length, 31);
  for (const c of T.leadership.data.clubs) {
    const t = E.team(s, c.clubId);
    for (const r of c.captains) assert(t.players.some((p) => p.id === r.id));
  }
  const t = E.team(s),
    p = t.players.find((x) => x.name === "Raphinha");
  t.players = t.players.filter((x) => x !== p);
  assert(!T.leadership.hierarchy(t).some((x) => x.id === p.id));
  assert.equal(T.leadership.reference({ ...p, id: "same-name" }), null);
});
test("Europa começa em julho de 2026 e identifica 2026/27; Américas começam em janeiro e save clássico mantém fevereiro", () => {
  const eu = career(),
    sa = career("br-0"),
    classic = career("es-1", false);
  assert.equal(E.schedule.iso(eu), "2026-07-01");
  assert.equal(E.seasonLabel(eu), "2026/27");
  assert.equal(E.schedule.iso(sa), "2026-01-01");
  assert.equal(E.schedule.iso(classic), "2026-02-01");
  assert.equal(E.nextFixture(eu), null);
  assert.equal(E.calendar(eu)[0].offset, 45);
  assert.equal(E.schedule.iso(eu, E.calendar(eu)[0].offset), "2026-08-15");
  assert.equal(E.schedule.iso(eu, 214), "2027-01-31");
  assert.equal(S.parse(S.serialize(eu)).calendarProfile.region, "eu");
  assert.equal(E.calendar(classic).length, 51);
});
test("amistoso para a simulação, usa o motor e desgaste, registra renda uma vez e preserva a tabela oficial", () => {
  const s = career(),
    t = E.team(s),
    table = JSON.stringify(s.leagues.map((l) => l.table));
  E.arrangeFriendly(s, "es-0", 5);
  assert.throws(() => E.arrangeFriendly(s, "es-2", 6), /três dias/);
  assert.throws(() => E.arrangeFriendly(s, "es-3", 45), /três dias/);
  assert.throws(() => E.arrangeFriendly(s, s.clubId, 9));
  const result = E.simulate(s, 10, "days", () => 0.99);
  assert.equal(result.advanced, 5);
  assert.equal(s.today, 5);
  assert.equal(E.nextFixture(s).kind, "friendly");
  assert.equal(E.careerCalendar(s)[0].offset, 5);
  complete(s);
  assert.equal(s.friendlies[0].status, "completed");
  assert.deepEqual(s.fixtureResults[0].goals, [3, 0]);
  assert.equal(JSON.stringify(s.leagues.map((l) => l.table)), table);
  assert(t.players.some((p) => p.fitness < 95));
  assert.equal(
    t.finance.ledger.filter((x) =>
      x.description.includes("Bilheteria de preparação"),
    ).length,
    1,
  );
  const r = S.parse(S.serialize(s));
  assert.equal(r.friendlies[0].status, "completed");
  assert.equal(E.nextFixture(r), null);
  assert.throws(() => E.cancelFriendly(r, r.friendlies[0].id));
});
test("torneio de quatro clubes disputa seis jogos, coroa campeão de preparação e não cria pontos oficiais", () => {
  const s = career(),
    table = JSON.stringify(s.leagues.map((l) => l.table)),
    t = E.organizePreseason(s, ["es-0", "es-2", "es-3"], 5, "Copa Marina");
  assert.equal(s.friendlies.length, 6);
  const initial = S.serialize(s);
  let guard = 0;
  while (s.today <= 13 && guard++ < 20) {
    if (E.nextFixture(s)) complete(s, [10, 0]);
    else E.advance(s, () => 0.99);
  }
  assert(guard < 20);
  assert.equal(t.status, "completed");
  assert(s.friendlies.every((f) => f.status === "completed"));
  assert(t.champion);
  assert.equal(
    s.trophies.find((x) => x.competitionId === t.id).kind,
    "preseason",
  );
  assert.equal(JSON.stringify(s.leagues.map((l) => l.table)), table);
  assert(t.table.every((r) => r.w + r.d + r.l === 3));
  assert.equal(
    S.parse(S.serialize(s)).preseasonTournaments[0].champion,
    t.champion,
  );
  const r = S.parse(initial);
  E.cancelPreseason(r, r.preseasonTournaments[0].id);
  assert(r.friendlies.every((f) => f.status === "cancelled"));
  assert.equal(E.upcomingFixture(r).kind, "league");
});
test("datas conflitantes e convites repetidos não deixam torneios parciais; cancelamento libera o dia", () => {
  const s = career();
  E.arrangeFriendly(s, "es-0", 5);
  assert.throws(() => E.organizePreseason(s, ["es-0", "es-2", "es-3"], 6));
  assert.equal(s.friendlies.length, 1);
  assert.equal(s.preseasonTournaments.length, 0);
  assert.throws(() => E.organizePreseason(s, ["es-0", "es-0", "es-3"], 16));
  E.cancelFriendly(s, s.friendlies[0].id);
  E.arrangeFriendly(s, "es-0", 5);
  assert.equal(s.friendlies.filter((f) => f.status === "scheduled").length, 1);
  const invalid = JSON.parse(S.serialize(s)).career;
  invalid.calendarProfile.preseasonDays = 1;
  assert.throws(() => S.parse(JSON.stringify(invalid)));
  const invalidPair = JSON.parse(S.serialize(s)).career;
  invalidPair.friendlies[0].pair[1] = invalidPair.clubId;
  assert.throws(() => S.parse(JSON.stringify(invalidPair)));
});
test("atualização da liderança em partida salva preserva placar, minuto, trocas e a escolha manual", () => {
  const s = career("es-1", false),
    t = E.team(s),
    p = E.lineup(t)[0];
  T.setAssignment(t, "captain", p.id);
  const m = E.makeMatch(s, "3d");
  m.minute = 15;
  m.goals = [1, 0];
  for (const plan of m.plans) delete plan.leadershipRevision;
  E.prepareCareer(s);
  assert.equal(s.live.minute, 15);
  assert.deepEqual(s.live.goals, [1, 0]);
  assert.equal(s.live.plans[0].specialists.captain.id, p.id);
});

test("troca do capitão promove o vice sem duplicar postos e mantém habilidades no motor", () => {
  const s = career("es-1", false),
    t = E.team(s),
    m = E.makeMatch(s, "2d"),
    side = m.pair.indexOf(t.id),
    plan = m.plans[side];
  m.minute = 45;
  const previous = plan.specialists.captain.id,
    vice = plan.specialists.viceCaptain.id,
    incoming = T.bench(t)[0];
  E.substitute(s, previous, incoming.id);
  assert.equal(plan.specialists.captain.id, vice);
  assert.notEqual(
    plan.specialists.captain.id,
    plan.specialists.viceCaptain?.id,
  );
  assert(Number.isFinite(plan.specialists.captain.skills.leadership));
  E.startSecondHalf(s);
  while (m.minute < 90) E.minute(s, m, () => 0.005);
  assert.equal(m.minute, 90);
});
test("recuperação da base do próprio clube é aplicada uma vez por dia", () => {
  const s = career(),
    t = E.team(s),
    p = t.players.pop();
  t.youth.push(p);
  p.fitness = 60;
  p.fatigue = 20;
  const prediction = E.physical.preview(
    p,
    "Técnica",
    E.facilities.recoveryLevel(t),
  );
  E.advance(s, () => 0.99);
  assert.equal(p.fitness, prediction.energy);
  assert.equal(p.fatigue, prediction.fatigue);
});
