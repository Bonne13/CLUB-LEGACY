"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const E = require("../engine"),
  S = require("../saves"),
  NUM = require("../squad-numbers");
function career() {
  const s = E.fresh();
  E.start(s, "es-1");
  return s;
}
function forced(s, m, goal = true) {
  const values = [0, 0, 0.5, 0, goal ? 0 : 0.99, 0.99];
  E.minute(s, m, () => values.shift() ?? 0.99);
}
test("o onze fica definido, resiste ao desgaste e as substituições não mudam a escalação permanente", () => {
  const s = career(),
    t = E.team(s),
    before = [...t.lineup],
    bench = [...E.tactics.ensure(t).bench];
  assert.equal(before.length, 11);
  const original = E.lineup(t).map((p) => p.id);
  assert.deepEqual(original, before);
  for (const p of E.lineup(t)) p.fitness = 45;
  assert.deepEqual(
    E.lineup(t).map((p) => p.id),
    before,
  );
  const m = E.makeMatch(s, "2d"),
    side = m.pair.indexOf(t.id),
    out = m.plans[side].starters[8],
    incoming = t.players.find((p) => !before.includes(p.id));
  E.substitute(s, out.id, incoming.id);
  assert.deepEqual(t.lineup, before);
  assert(m.plans[side].starters.some((p) => p.id === incoming.id));
  while (m.minute < 90) E.minute(s, m, () => 0.99);
  E.advance(s, () => 0.99);
  assert.deepEqual(t.lineup, before);
  assert.deepEqual(t.tactics.bench, bench);
  const restored = S.parse(S.serialize(s));
  assert.deepEqual(E.team(restored).lineup, before);
});
test("cobertura de lesionados é temporária; o titular volta sem reorganizar os outros dez", () => {
  const s = career(),
    t = E.team(s),
    ids = [...t.lineup],
    p = t.players.find((p) => p.id === ids[7]);
  p.injury = 3;
  const covered = E.lineup(t).map((p) => p.id);
  assert(!covered.includes(p.id));
  assert.deepEqual(t.lineup, ids);
  p.injury = 0;
  assert.deepEqual(
    E.lineup(t).map((p) => p.id),
    ids,
  );
  t.lineup = [];
  E.tactics.remember(t);
  const next = [...t.lineup];
  t.players.forEach((p) => (p.fitness = 50));
  assert.deepEqual(
    E.lineup(t).map((p) => p.id),
    next,
  );
});
test("construções variam em corredores, passes, dribles e recuperações sem criar chutes ou gols", () => {
  const s = career(),
    m = E.makeMatch(s, "3d"),
    patterns = new Set(),
    lengths = new Set(),
    signatures = new Set();
  for (let n = 0; n < 90; n++) {
    E.minute(s, m, () => 0.99);
    const play = m.lastPlay;
    patterns.add(play.pattern);
    lengths.add(play.path.length);
    signatures.add(
      play.path.map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(";"),
    );
    const present = new Set(
      m.plans.flatMap((plan) =>
        plan.starters.filter((p) => !p.sentOff).map((p) => p.id),
      ),
    );
    assert(play.path.length >= 3 && play.path.length <= 9);
    for (const point of play.path) {
      if (point.playerId) assert(present.has(point.playerId));
      assert(point.caption);
    }
    const frame = E.matchFrame(m, play, play.path.length - 1);
    assert(!frame.action.shot);
    assert.equal(frame.positions.length, present.size);
  }
  assert(patterns.size >= 9, [...patterns].join(","));
  assert(lengths.size >= 2);
  assert(signatures.size > 30);
  assert.deepEqual(m.shots, [0, 0]);
  assert.deepEqual(m.goals, [0, 0]);
  S.validate(s);
});
test("gols e defesas preservam assistente, autoria e desfecho em trajetórias de tamanhos diferentes", () => {
  const s = career(),
    m = E.makeMatch(s, "3d"),
    lengths = new Set();
  for (let n = 0; n < 8; n++) {
    forced(s, m, n % 2 === 0);
    const play = m.lastPlay;
    lengths.add(play.path.length);
    assert.equal(play.path.at(-2).playerId, play.playerId);
    if (play.assistId) assert.equal(play.path.at(-3).playerId, play.assistId);
    const frame = E.matchFrame(m, play, play.path.length - 1);
    assert(frame.action.shot);
    if (n % 2 === 0) {
      assert(frame.action.goal);
      assert.equal(frame.ball.x, 99);
    } else {
      assert(frame.action.saved);
      const keeper = frame.positions.find(
        (p) => p.id === frame.action.keeperId,
      );
      assert.equal(keeper.x, frame.ball.x);
      assert.equal(keeper.y, frame.ball.y);
    }
  }
  assert(lengths.size > 1);
  const restored = S.parse(S.serialize(s));
  assert.deepEqual(restored.live.timeline, m.timeline);
});
test("Barcelona usa a referência 2026/27 e todas as camisas de cada clube são únicas", () => {
  const s = career(),
    t = E.team(s),
    expected = {
      Raphinha: 11,
      "Lamine Yamal": 10,
      Pedri: 8,
      "Dani Olmo": 20,
      "Jules Koundé": 23,
      "Frenkie de Jong": 21,
      Gavi: 6,
      "Pau Cubarsí": 5,
      "Marc Bernal": 22,
      "Joan García": 1,
    };
  for (const [name, number] of Object.entries(expected)) {
    const p = t.players.find((p) => p.name === name);
    if (p) assert.equal(p.shirtNumber, number, name);
  }
  for (const club of s.teams) {
    const players = [...club.players, ...club.youth];
    assert.equal(
      new Set(players.map((p) => p.shirtNumber)).size,
      players.length,
      club.name,
    );
  }
  assert(NUM.DATA.clubs.length > 300);
});
test("uma camisa ocupada realoca somente o antigo dono para um número livre, incluindo a base", () => {
  const s = career(),
    t = E.team(s),
    a = t.players.find((p) => p.name === "Raphinha"),
    b = t.players.find((p) => p.name === "Lamine Yamal");
  const before = new Map(
      [...t.players, ...t.youth].map((p) => [p.id, p.shirtNumber]),
    ),
    proposal = E.shirtNumberChange(s, a.id, b.shirtNumber);
  assert(![...before.values()].includes(proposal.displacedNumber));
  assert.equal(a.shirtNumber, 11);
  assert.equal(b.shirtNumber, 10);
  const result = E.setShirtNumber(s, a.id, 10);
  assert.equal(a.shirtNumber, 10);
  assert.equal(b.shirtNumber, result.displacedNumber);
  for (const p of [...t.players, ...t.youth])
    if (![a.id, b.id].includes(p.id))
      assert.equal(p.shirtNumber, before.get(p.id));
  const youthIndex = t.players.findIndex(
    (p) => !t.lineup.includes(p.id) && ![a.id, b.id].includes(p.id),
  );
  const [youth] = t.players.splice(youthIndex, 1);
  t.youth.push(youth);
  E.setShirtNumber(s, youth.id, a.shirtNumber);
  assert.equal(youth.shirtNumber, 10);
  const saved = S.parse(S.serialize(s));
  assert.equal(
    E.team(saved).youth.find((p) => p.id === youth.id).shirtNumber,
    10,
  );
  E.prepareCareer(saved);
  assert.equal(
    E.team(saved).youth.find((p) => p.id === youth.id).shirtNumber,
    10,
  );
});
test("migração corrige numeração gerada antiga e preserva números alterados pelo treinador", () => {
  const s = career(),
    t = E.team(s),
    players = [...t.players, ...t.youth],
    legacy = NUM.defaults(players);
  for (const p of players) {
    p.shirtNumber = legacy.get(p.id);
    delete p.shirtNumberCustomized;
    delete p.shirtNumberReference;
  }
  delete t.shirtNumberRevision;
  const custom = t.players.find((p) => p.name === "Gavi");
  custom.shirtNumber = 99;
  E.prepareCareer(s);
  assert.equal(t.players.find((p) => p.name === "Raphinha").shirtNumber, 11);
  assert.equal(
    t.players.find((p) => p.name === "Lamine Yamal").shirtNumber,
    10,
  );
  assert.equal(custom.shirtNumber, 99);
  assert.equal(new Set(players.map((p) => p.shirtNumber)).size, players.length);
});

test("save antigo com escalação vazia recupera o onze anterior e desfaz apenas as substituições da partida", () => {
  const s = career(),
    t = E.team(s),
    before = [...t.lineup],
    m = E.makeMatch(s, "2d"),
    side = m.pair.indexOf(t.id),
    out = m.plans[side].starters[8],
    incoming = t.players.find((p) => !before.includes(p.id));
  E.substitute(s, out.id, incoming.id);
  t.lineup = [];
  E.prepareCareer(s);
  assert.deepEqual(t.lineup, before);
  assert(m.plans[side].starters.some((p) => p.id === incoming.id));
  assert(!m.plans[side].starters.some((p) => p.id === out.id));
});
