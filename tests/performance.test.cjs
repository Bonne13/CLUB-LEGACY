const { test } = require("node:test"),
  assert = require("node:assert/strict");
const E = require("../engine.js"),
  S = require("../saves.js"),
  PF = E.performance;
function career(regional = false) {
  const s = E.fresh();
  E.start(
    s,
    "es-1",
    { name: "Marina Costa", age: 35, nationality: "Brazil" },
    "test",
    regional ? { calendar: "regional" } : {},
  );
  return s;
}
function forced(m, s, what = "goal", side = 0, type = "jogada") {
  const values = [
    0,
    side === 0 ? 0 : 0.99,
    type === "pênalti"
      ? 0
      : type === "falta direta"
        ? 0.05
        : type === "escanteio"
          ? 0.15
          : 0.5,
  ];
  if (type !== "pênalti" && type !== "falta direta") values.push(0);
  values.push(what === "goal" ? 0 : 0.99);
  if (what !== "goal") values.push(what === "save" ? 0.99 : 0);
  E.minute(s, m, () => values.shift() ?? 0.99);
}
function finish(s, m) {
  while (m.minute < 90) E.minute(s, m, () => 0.99);
  return PF.lines(m, true);
}
function fixture(
  s,
  offset = s.today || 0,
  competition = "es",
  kind = "league",
) {
  const pair = ["es-1", "es-0"];
  return {
    pair,
    competition,
    name: competition === "es" ? "LaLiga" : "Copa",
    kind,
    minute: 0,
    goals: [0, 0],
    shots: [0, 0],
    events: [],
    plans: E.matchPlans(s, { pair, kind }),
    offset,
  };
}
function seeded(seed = 2026) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
test("gols, assistências e autoria do passe vêm do mesmo lance; pênaltis e faltas não inventam assistência", () => {
  const s = career(),
    m = E.makeMatch(s);
  forced(m, s);
  const scorer = m.lastPlay.playerId,
    assist = m.lastPlay.assistId;
  assert(assist && assist !== scorer);
  assert.equal(m.lastPlay.path.at(-3).playerId, assist);
  assert.equal(m.performance.players[scorer].goals, 1);
  assert.equal(m.performance.players[assist].assists, 1);
  forced(m, s, "goal", 0, "pênalti");
  assert.equal(m.lastPlay.assistId, null);
  forced(m, s, "goal", 0, "falta direta");
  assert.equal(m.lastPlay.assistId, null);
  const ps = finish(s, m);
  assert.equal(
    ps.reduce((n, p) => n + p.goals, 0),
    m.goals[0] + m.goals[1],
  );
  assert.equal(
    ps.reduce((n, p) => n + p.assists, 0),
    1,
  );
  assert(
    ps.every((p) => p.rating === null || (p.rating >= 1 && p.rating <= 10)),
  );
});
test("defesas correspondem a chutes no alvo e mudam a nota do goleiro; bolas para fora não viram defesas", () => {
  const s = career(),
    m = E.makeMatch(s);
  for (let i = 0; i < 5; i++) forced(m, s, "save", 0);
  forced(m, s, "wide", 0);
  const keeper = m.plans[1].starters[0].id;
  const p = m.performance.players[keeper];
  assert.equal(p.saves, 5);
  assert.equal(p.faced, 5);
  assert.equal(m.performance.players[m.lastShot.playerId].shots, 6);
  assert.equal(m.performance.players[m.lastShot.playerId].onTarget, 5);
  finish(s, m);
  const before = PF.rating(p, m, true);
  assert.equal(PF.lines(m, true).find((x) => x.id === keeper).cleanSheet, 1);
  assert(before > PF.rating({ ...p, saves: 0, faced: 0 }, m, true));
  assert(
    PF.rating({ ...p, conceded: 3 }, { ...m, goals: [3, 0] }, true) < before,
  );
});
test("melhor em campo é definido pelo desempenho; jogador sem entrar fica sem nota e substituído mantém seus minutos", () => {
  const s = career(),
    m = E.makeMatch(s);
  for (let i = 0; i < 3; i++) forced(m, s);
  const scorer = m.lastPlay.playerId;
  while (m.minute < 45) E.minute(s, m, () => 0.99);
  const incoming = E.tactics.bench(E.team(s))[0];
  E.substitute(s, scorer, incoming.id);
  finish(s, m);
  const lines = PF.lines(m, true);
  assert.equal(lines.find((p) => p.id === scorer).minutes, 45);
  assert.equal(lines.find((p) => p.id === incoming.id).minutes, 45);
  assert.equal(PF.best(m).id, scorer);
  const absent = E.team(s).players.find(
    (p) => !lines.some((x) => x.id === p.id),
  );
  assert(absent);
  assert(!m.performance.players[absent.id]);
  E.advance(s, () => 0.99);
  assert.equal(s.live.performance.playerOfMatch.id, scorer);
  assert.equal(s.fixtureResults[0].playerOfMatch.id, scorer);
  const before = PF.ensure(s).current.players[scorer].goals;
  PF.commit(s, m, { managed: true });
  assert.equal(s.performance.current.players[scorer].goals, before);
  assert.equal(s.performance.matches.length, 1);
});
test("limite de 60 minutos impede jogos sem sofrer gol para reservas e entradas curtas", () => {
  const s = career(),
    m = E.makeMatch(s);
  while (m.minute < 75) E.minute(s, m, () => 0.99);
  const keeper = m.plans[0].starters[0].id,
    sub =
      E.tactics.bench(E.team(s)).find((p) => p.pos === "GOL") ||
      E.tactics.bench(E.team(s))[0];
  assert(sub);
  E.substitute(s, keeper, sub.id);
  finish(s, m);
  const rows = PF.lines(m, true);
  assert.equal(rows.find((p) => p.id === keeper).cleanSheet, 1);
  assert.equal(rows.find((p) => p.id === sub.id).cleanSheet, 0);
  assert.equal(rows.find((p) => p.id === sub.id).rating, null);
});
test("amistosos recebem notas e melhor em campo, mas não alimentam Bola de Ouro, mensal e campeonato", () => {
  const s = career(true);
  E.arrangeFriendly(s, "es-0", 5);
  E.simulate(s, 5);
  const m = E.makeMatch(s);
  forced(m, s);
  finish(s, m);
  E.advance(s, () => 0.99);
  assert(m.performance.playerOfMatch);
  assert.equal(Object.keys(s.performance.current.players).length, 0);
  assert.equal(s.performance.current.month, null);
  assert.equal(s.performance.matches.length, 1);
});
test("mensal separa calendário e campeonato, respeita amostra mínima e publica uma única vez", () => {
  const s = career(true);
  for (const offset of [0, 7]) {
    s.today = offset;
    const m = fixture(s);
    forced(m, s);
    finish(s, m);
    PF.commit(s, m);
  }
  s.today = 31;
  const awards = PF.closeMonth(s);
  assert.equal(awards.length, 1);
  assert.equal(awards[0].month, "2026-07");
  assert.equal(awards[0].competition, "es");
  assert.equal(PF.closeMonth(s).length, 0);
  const m = fixture(s);
  forced(m, s);
  finish(s, m);
  PF.commit(s, m);
  assert.equal(s.performance.current.month.key, "2026-08");
  assert.equal(PF.rank(s, "month", "es")[0].appearances, 1);
  assert.equal(PF.rank(s, "month", "champions").length, 0);
  assert.equal(PF.rank(s, "month", "es", { eligibleOnly: true }).length, 0);
});
test("títulos só pontuam para quem contribuiu no clube vencedor; melhor de campeonato não cruza competições", () => {
  const s = career();
  for (let n = 0; n < 3; n++) {
    s.today = n * 7;
    const m = fixture(s);
    forced(m, s);
    finish(s, m);
    PF.commit(s, m);
  }
  const id = PF.rank(s, "ballon")[0].id;
  s.trophies.push({
    id: "title-test",
    clubId: "es-1",
    competitionId: "es",
    kind: "league",
    season: s.season,
  });
  assert(PF.titles(s, { id }) > 0);
  assert.equal(PF.titles(s, { id: "not-played" }), 0);
  const a = PF.closeCompetition(s, "es");
  assert(a);
  assert.equal(a.type, "competition");
  assert.equal(PF.closeCompetition(s, "es"), null);
  assert.equal(PF.closeCompetition(s, "champions"), null);
});
test("temporada completa premia jogadores e goleiro de todo o universo, persiste, e arquiva sem misturar temporadas", () => {
  const s = career(),
    random = seeded();
  let days = 0;
  while (E.dayInfo(s) && days++ < 366) {
    if (E.nextFixture(s)) {
      const m = E.makeMatch(s);
      while (m.minute < 90) E.minute(s, m, random);
    }
    E.advance(s, random);
    s.live = null;
  }
  assert(days < 366);
  const gold = s.performance.awards.find((a) => a.type === "ballon"),
    keeper = s.performance.awards.find((a) => a.type === "keeper");
  assert(gold && keeper);
  assert.equal(keeper.winner.pos, "GOL");
  assert(keeper.winner.keeperMinutes >= 900);
  assert(keeper.winner.saves > 0);
  assert(s.performance.awards.some((a) => a.type === "month"));
  assert(s.performance.awards.some((a) => a.type === "competition"));
  const len = s.performance.awards.length;
  assert.equal(PF.closeSeason(s).length, 0);
  assert.equal(s.performance.awards.length, len);
  const raw = S.serialize(s);
  assert(raw.length < S.MAX_BYTES);
  const compressed = require("../vendor/lz-string.js").compressToUTF16(raw);
  assert(compressed.length * 2 < 4.5 * 1048576);
  console.log(
    "Save comprimido: " +
      ((compressed.length * 2) / 1048576).toFixed(2) +
      " MiB",
  );
  const restored = S.parse(raw);
  assert.equal(
    restored.performance.awards.find((a) => a.type === "ballon").winner.id,
    gold.winner.id,
  );
  E.nextSeason(restored);
  assert.equal(Object.keys(restored.performance.current.players).length, 0);
  assert(restored.performance.archives.length > 0);
  assert(restored.performance.awards.some((a) => a.id === gold.id));
  assert.doesNotThrow(() => S.serialize(restored));
  console.log(
    "Save com temporada e prêmios: " +
      (raw.length / 1048576).toFixed(2) +
      " MiB",
  );
});
test("save anterior não ganha estatísticas inventadas e a partida recuperada acompanha apenas os minutos novos", () => {
  const s = career();
  s.today = 0;
  const m = E.makeMatch(s);
  forced(m, s);
  m.minute = 20;
  delete m.performance;
  delete s.performance;
  const restored = S.parse(S.serialize(s));
  assert.equal(Object.keys(restored.performance.current.players).length, 0);
  assert.equal(restored.live.performance.fromMinute, 20);
  const before = restored.live.goals[0];
  E.minute(restored, restored.live, () => 0.99);
  assert.equal(PF.lines(restored.live)[0].minutes, 1);
  assert.equal(
    PF.lines(restored.live).reduce((n, p) => n + p.goals, 0),
    0,
  );
  assert.equal(restored.live.goals[0], before);
  const invalid = JSON.parse(S.serialize(restored)).career;
  invalid.live.performance.players[
    Object.keys(invalid.live.performance.players)[0]
  ].minutes = -1;
  assert.throws(() => S.parse(JSON.stringify(invalid)));
});
