const { test } = require("node:test"),
  assert = require("node:assert/strict");
const E = require("../engine.js"),
  S = require("../saves.js"),
  DS = E.discipline,
  PF = E.performance;
const automaticTick = DS.tick;
// Explicit incidents isolate suspension rules from the seeded match incident stream.
DS.tick = () => {};
function career() {
  const s = E.fresh();
  E.start(s, "es-1", { name: "Marina Costa", age: 35, nationality: "Brazil" });
  return s;
}
function match(
  s,
  competition = "es",
  kind = "league",
  pair = ["es-1", "es-0"],
) {
  const m = {
    pair,
    competition,
    kind,
    name: competition,
    season: s.season,
    offset: s.today,
    day: s.day,
    minute: 0,
    goals: [0, 0],
    shots: [0, 0],
    events: [],
    plans: E.matchPlans(s, { pair, competition, kind }),
  };
  PF.begin(m);
  DS.begin(s, m);
  return m;
}
function give(s, m, p, type = "yellow", severity = "normal") {
  m.minute = Math.max(10, m.minute);
  return DS.card(s, m, 0, p.id, type, severity);
}
function complete(s, m) {
  while (m.minute < 90) E.minute(s, m, () => 0.99);
  DS.commit(s, m);
  PF.commit(s, m);
}
test("dois amarelos expulsam, congelam minutos e retiram jogador dos lances e do campo", () => {
  const s = career(),
    m = match(s),
    p = m.plans[0].starters[9];
  for (let i = 0; i < 10; i++) E.minute(s, m, () => 0.99);
  give(s, m, p);
  give(s, m, p);
  assert.equal(DS.active(m.plans[0]).length, 10);
  assert(p.sentOff);
  assert.equal(m.performance.players[p.id].yellowCards, 2);
  assert.equal(m.performance.players[p.id].redCards, 1);
  assert.equal(m.performance.players[p.id].straightReds, undefined);
  assert(!E.matchVisual(m).positions.some((x) => x.id === p.id));
  complete(s, m);
  assert.equal(m.performance.players[p.id].minutes, 10);
  assert.equal(m.minutesPlayed[p.id], 10);
  const original = E.team(s, "es-1").players.find((x) => x.id === p.id);
  assert.equal(DS.suspension(original, "es"), 1);
  assert.equal(DS.counts(original, s, "es").yellows, 2);
  assert.throws(() => DS.card(s, m, 0, p.id, "yellow"));
});
test("limite amarelo, pendurados e penas são separados por competição e não vencem por dias", () => {
  const s = career(),
    m = match(s),
    p = E.team(s, "es-1").players.find(
      (x) => x.id === m.plans[0].starters[5].id,
    );
  p.discipline = {
    cards: { es: { season: s.season, yellows: 4, reds: 0, accumulated: 4 } },
    bans: {},
  };
  give(s, m, p);
  DS.commit(s, m);
  assert.equal(DS.suspension(p, "es"), 1);
  assert.equal(DS.counts(p, s, "es").accumulated, 0);
  assert.equal(DS.commit(s, m).length, 0);
  assert.equal(DS.suspension(p, "es"), 1);
  s.today += 7;
  assert.equal(DS.suspension(p, "es"), 1);
  DS.commit(s, match(s, "champions", "group"));
  assert.equal(DS.suspension(p, "es"), 1);
  DS.commit(s, match(s, "friendly", "friendly"));
  assert.equal(DS.suspension(p, "es"), 1);
  const next = match(s);
  assert(!next.plans[0].starters.some((x) => x.id === p.id));
  DS.commit(s, next);
  assert.equal(DS.suspension(p, "es"), 0);
  assert(
    DS.ensure(s).events.some(
      (e) => e.action === "served" && e.playerId === p.id,
    ),
  );
  assert.equal(DS.rules("br").yellowLimit, 3);
  assert.equal(DS.rules("es").yellowLimit, 5);
  assert.equal(DS.rules("champions", "group").yellowLimit, 3);
});
test("vermelho direto e conduta violenta geram penas distintas; amistoso não gera pena oficial", () => {
  for (const [kind, severity, expected] of [
    ["league", "normal", 2],
    ["league", "violent", 3],
    ["friendly", "violent", 0],
  ]) {
    const s = career(),
      m = match(s, "es", kind),
      p = m.plans[0].starters[4];
    give(s, m, p, "red", severity);
    DS.commit(s, m);
    assert.equal(
      DS.suspension(
        E.team(s, "es-1").players.find((x) => x.id === p.id),
        "es",
      ),
      expected,
    );
    assert.equal(m.performance.players[p.id].straightReds, 1);
    assert.equal(DS.active(m.plans[0]).length, 10);
  }
});
test("suspensão bloqueia escalação e banco e atravessa temporada e transferência", () => {
  const s = career(),
    t = E.team(s, "es-1"),
    p = E.lineup(t)[8];
  p.discipline = {
    cards: { es: { season: s.season, yellows: 5, reds: 1, accumulated: 2 } },
    bans: {
      es: {
        remaining: 2,
        reason: "Falta grave",
        issuedSeason: s.season,
        issuedOffset: 0,
      },
    },
  };
  t.selectionCompetition = "es";
  assert(!E.lineup(t).some((x) => x.id === p.id));
  assert(!E.tactics.bench(t).some((x) => x.id === p.id));
  assert.throws(() => E.tactics.select(t, 8, p.id), /suspenso/);
  assert.throws(() => E.tactics.toggleBench(t, p.id));
  t.selectionCompetition = "champions";
  assert(
    E.matchPlans(s, {
      pair: ["es-1", "es-0"],
      competition: "es",
      kind: "league",
    })[0].starters.every((x) => x.id !== p.id),
  );
  s.season++;
  assert.equal(DS.counts(p, s, "es").accumulated, 0);
  assert.equal(DS.suspension(p, "es"), 2);
  const other = E.team(s, "es-0");
  t.players = t.players.filter((x) => x.id !== p.id);
  other.players.push(p);
  assert.equal(DS.suspension(p, other.leagueId), 2);
  assert.equal(DS.suspension(p, "champions"), 0);
});
test("expulso não pode ser substituído e goleiro expulso recebe cobertura emergencial", () => {
  const s = career(),
    m = E.makeMatch(s, "2d"),
    side = m.pair.indexOf(s.clubId),
    p = m.plans[side].starters[0];
  m.minute = 12;
  DS.card(s, m, side, p.id, "red");
  const plan = m.plans[side];
  assert(!plan.starters[0].sentOff);
  assert.equal(DS.active(plan).length, 10);
  const incoming = E.team(s).players.find(
    (x) => !x.injury && !plan.starters.some((p) => p.id === x.id),
  );
  assert(incoming);
  assert.throws(() => E.substitute(s, p.id, incoming.id));
  assert(!Object.values(plan.specialists).some((x) => x?.id === p.id));
  assert.equal(E.matchVisual(m).positions.length, 21);
  E.minute(s, m, () => 0.99);
  assert.equal(m.performance.players[p.id].minutes, 0);
});
test("menos de sete jogadores encerra o jogo sem inventar gols de atletas", () => {
  const s = career(),
    m = match(s);
  m.minute = 15;
  for (const p of m.plans[0].starters.slice(6)) DS.card(s, m, 0, p.id, "red");
  assert.equal(m.minute, 90);
  assert.equal(m.discipline.forfeit.minute, 15);
  assert.deepEqual(m.goals, [0, 3]);
  assert.equal(
    Object.values(m.performance.players).reduce((sum, p) => sum + p.goals, 0),
    0,
  );
});
test("fair play reduz nota e prêmio; dados anteriores sem cartões continuam neutros", () => {
  const s = career(),
    m = match(s),
    p = m.plans[0].starters[8];
  for (let i = 0; i < 25; i++) E.minute(s, m, () => 0.99);
  const before = PF.lines(m).find((x) => x.id === p.id).rating;
  give(s, m, p);
  give(s, m, p);
  const after = PF.lines(m).find((x) => x.id === p.id).rating;
  assert(after < before);
  complete(s, m);
  const agg = s.performance.current.players[p.id];
  assert.equal(agg.yellowCards, 2);
  assert.equal(agg.redCards, 1);
  assert.equal(PF.score(s, agg).fairPlay, -1.55);
  const old = { ...agg };
  delete old.yellowCards;
  delete old.redCards;
  delete old.straightReds;
  assert.equal(PF.score(s, old).fairPlay, 0);
  assert.equal(
    PF.score(s, {
      ...agg,
      yellowCards: 1000,
      redCards: 1000,
      straightReds: 1000,
    }).fairPlay,
    -20,
  );
});
test("saves preservam incidentes, rejeitam sanções inválidas e aceitam saves sem o módulo", () => {
  const s = career(),
    m = E.makeMatch(s, "2d"),
    side = m.pair.indexOf(s.clubId);
  m.minute = 10;
  DS.card(s, m, side, m.plans[side].starters[8].id, "red");
  S.validate(s);
  const restored = S.parse(S.serialize(s));
  assert.equal(restored.live.discipline.reds.length, 1);
  assert.equal(E.matchVisual(restored.live).positions.length, 21);
  restored.live.discipline.cards[0].side = 3;
  assert.throws(() => S.validate(restored));
  const old = career();
  delete old.discipline;
  S.validate(old);
});
test("incidentes são determinísticos ao recarregar e independentes do gerador de gols", () => {
  const s = career(),
    a = match(s),
    b = JSON.parse(JSON.stringify(a));
  for (let i = 3; i < 90; i++) {
    a.minute = b.minute = i;
    automaticTick(s, a);
    automaticTick(s, b);
  }
  assert.deepEqual(a.discipline, b.discipline);
  assert(a.discipline.cards.length > 0);
  assert(a.discipline.fouls.reduce((a, b) => a + b, 0) > 0);
});
test("jogos da IA têm cartões e minutos físicos reais antes do cumprimento da pena", () => {
  const s = career(),
    m = E.makeMatch(s, "text");
  for (let i = 0; i < 90; i++) E.minute(s, m, () => 0.99);
  // Exercise the automatic incident stream for the world fixtures inside advance.
  DS.tick = automaticTick;
  try {
    E.advance(s, () => 0.99);
  } finally {
    DS.tick = () => {};
  }
  const red = Object.values(s.performance.current.players).find(
    (p) => p.redCards && p.clubId !== s.clubId,
  );
  assert(red);
  assert(red.minutes < 90);
  const p = E.team(s, red.clubId).players.find((x) => x.id === red.id);
  assert(
    p.discipline.bans.es?.remaining ||
      Object.values(p.discipline.bans).some((b) => b.remaining),
  );
  S.validate(s);
});
