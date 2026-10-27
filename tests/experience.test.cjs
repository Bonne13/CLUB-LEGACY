const { test } = require("node:test"),
  assert = require("node:assert/strict");
const E = require("../engine"),
  S = require("../saves"),
  H = E.honours,
  { seedHonours } = require("./experience-fixtures.cjs");
function career() {
  const s = E.fresh();
  E.start(s, "es-1", { name: "Marina Costa", age: 35, nationality: "Brazil" });
  return s;
}
function force(s, m, goal = true) {
  const values = [0, 0, 0.5, 0, goal ? 0 : 0.99, 0.99];
  E.minute(s, m, () => values.shift() ?? 0.99);
}
test("histórico separa títulos oficiais, pré-temporada e prêmios, sem escrever no save", () => {
  const s = career(),
    names = seedHonours(s, E),
    before = JSON.stringify(s);
  assert.equal(H.records(s).length, 2);
  assert.equal(H.records(s, { preseason: true }).length, 3);
  assert.equal(
    H.records(s, { competition: "champions", season: "2026", club: "es-1" })
      .length,
    1,
  );
  assert.equal(H.records(s, { competition: "es", club: "es-1" }).length, 0);
  assert.equal(
    H.records(s, {
      type: "awards",
      award: "ballon",
      query: names.player.toUpperCase(),
    })[0].playerName,
    names.player,
  );
  assert.equal(
    H.records(s, { type: "awards", competition: "world", award: "keeper" })[0]
      .playerName,
    names.keeper,
  );
  assert.deepEqual(H.seasons(s), [2026, 2025]);
  assert.equal(JSON.stringify(s), before);
});
test("histórico mantém temporadas anteriores após exportar e importar e não reconstrói títulos ausentes", () => {
  const s = career();
  assert.deepEqual(H.records(s), []);
  seedHonours(s, E);
  S.validate(s);
  const r = S.parse(S.serialize(s));
  assert.equal(H.records(r).length, 2);
  assert.equal(H.records(r, { type: "awards" }).length, 2);
  assert.equal(H.records(r, { season: "2025" })[0].clubId, "es-0");
});
test("a coreografia usa os mesmos eventos, liga a bola ao recebedor e não altera placar ou desempenho", () => {
  const s = career(),
    m = E.makeMatch(s, "2d");
  force(s, m);
  const play = m.lastPlay,
    before = JSON.stringify(m),
    first = E.matchFrame(m, play, 0),
    pass = E.matchFrame(m, play, 1),
    last = E.matchFrame(m, play, play.path.length - 1);
  const receiver = pass.positions.find((p) => p.id === play.path[1].playerId);
  assert.equal(receiver.x, play.path[1].x);
  assert.equal(receiver.y, play.path[1].y);
  assert(
    last.positions.some(
      (p) => p.x !== first.positions.find((x) => x.id === p.id)?.x,
    ),
  );
  assert.equal(last.ball.x, 99);
  assert(last.action.goal);
  assert.equal(
    last.positions.find((p) => p.id === play.playerId).x,
    play.from.x,
  );
  assert.equal(JSON.stringify(m), before);
  S.validate(s);
});
test("defesa aparece no alcance do goleiro e a expulsão não reaparece na animação", () => {
  const s = career(),
    m = E.makeMatch(s, "3d");
  force(s, m, false);
  assert(m.lastShot.saved);
  const last = E.matchFrame(m, m.lastPlay, m.lastPlay.path.length - 1),
    keeper = last.positions.find((p) => p.id === last.action.keeperId);
  assert(last.action.saved);
  assert.equal(keeper.x, last.ball.x);
  assert.equal(keeper.y, last.ball.y);
  assert(keeper.y >= 40 && keeper.y <= 60);
  const p = m.plans[0].starters[9];
  E.discipline.card(s, m, 0, p.id, "red");
  assert(!E.matchFrame(m, m.lastPlay, 2).positions.some((x) => x.id === p.id));
});
test("qualidade gráfica opcional e posições iniciais antigas são compatíveis e validadas", () => {
  const s = career(),
    m = E.makeMatch(s, "3d");
  force(s, m);
  s.matchPreferences = {
    mode: "3d",
    speed: 900,
    camera: "follow",
    quality: "low",
  };
  const r = S.parse(S.serialize(s));
  assert.equal(r.matchPreferences.quality, "low");
  assert(r.live.lastPlay.initialPositions.length > 0);
  r.matchPreferences.quality = "invalid";
  assert.throws(() => S.validate(r));
  delete s.live.lastPlay.initialPositions;
  assert(E.matchFrame(s.live, s.live.lastPlay, 1).positions.length > 0);
  S.validate(s);
});

test("camera zoom survives save export and rejects invalid values", () => {
  const s = career();
  s.matchPreferences = { speed: 900, mode: "3d", camera: "follow", zoom: 1.75 };
  assert.equal(S.parse(S.serialize(s)).matchPreferences.zoom, 1.75);
  for (const zoom of [0.5, 3, Infinity, "1.5"]) {
    s.matchPreferences.zoom = zoom;
    assert.throws(() => S.validate(s));
  }
});
