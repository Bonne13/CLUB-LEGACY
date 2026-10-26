const { test } = require("node:test"),
  assert = require("node:assert/strict");
const E = require("../engine.js"),
  S = require("../saves.js"),
  PF = E.performance,
  PR = E.press;
function career() {
  const s = E.fresh();
  E.start(s, "es-1", { name: "Marina Costa", age: 35, nationality: "Brazil" });
  return s;
}
function goal(s, m, side = 0, index = 0) {
  let r = [0, side ? 0.99 : 0, 0.5, index, 0];
  E.minute(s, m, () => r.shift() ?? 0.99);
  return { ...m.performance.goalEvents.at(-1) };
}
function finish(s, m) {
  while (m.minute < 90) E.minute(s, m, () => 0.99);
  return PF.commit(s, m, { managed: true });
}
test("catálogo traz nove veículos e oito jornalistas reais com URLs HTTPS e referência oficial dos critérios", () => {
  assert.deepEqual(PR.data, require("../data/press.json"));
  assert.equal(PR.data.outlets.length, 9);
  assert.equal(PR.data.journalists.length, 8);
  const ids = new Set(PR.data.outlets.map((o) => o.id));
  assert.equal(ids.size, 9);
  for (const p of PR.data.journalists) {
    assert(ids.has(p.outletId));
    assert.equal(new URL(p.url).protocol, "https:");
  }
  assert(PR.data.journalists.some((p) => p.name === "Sid Lowe"));
  assert(PR.data.journalists.some((p) => p.name === "Fabrizio Romano"));
  assert(PR.data.journalists.some((p) => p.id === "pvc"));
  assert.deepEqual(
    PR.data.awardCriteria.pillars.map((p) => p.order),
    [1, 2, 3],
  );
  assert.equal(new URL(PR.data.awardCriteria.url).hostname, "ballondor.com");
});
test("cobertura é determinística, tem autoria Legacy e não atribui publicações reais nem altera o save", () => {
  const s = career(),
    before = JSON.stringify(s.articles),
    a = E.journal(s, "world")[0];
  assert(a.press.simulated);
  assert.equal(a.press.byline, "Redação Legacy");
  if (a.press.journalist)
    assert.equal(a.press.journalist.outletId, a.press.outlet.id);
  assert.deepEqual(PR.coverage(s, a), a.press);
  assert.equal(JSON.stringify(s.articles), before);
  const clone = S.parse(S.serialize(s));
  assert.deepEqual(
    E.journal(clone, "world").find((p) => p.id === a.id).press,
    a.press,
  );
  assert.equal(s.today, 0);
});
test("filtros por veículo, jornalista e texto combinam e abrangência mundial inclui outros continentes", () => {
  const s = career();
  s.articles = [];
  for (const league of ["br", "es", "en", "fr", "it"])
    for (let i = 0; i < 25; i++) {
      const t = E.team(s, league + "-0");
      s.articles.push({
        id: `press-${league}-${i}`,
        title: `${t.name}: análise com Marina Costa`,
        body: "Preparação e resultados da carreira.",
        category: i % 2 ? "results" : "coaches",
        clubIds: [t.id],
        regions: [E.league(s, league).region],
        competitionId: league,
        season: s.season,
        day: 0,
        offset: 0,
      });
    }
  const pvc = E.journal(s, "world", "all", { journalist: "pvc" });
  assert(pvc.length > 0);
  assert(
    pvc.every(
      (a) => a.press.journalist.id === "pvc" && a.press.outlet.id === "uol",
    ),
  );
  assert(E.journal(s, "world").some((a) => a.regions.includes("sa")));
  const query = E.journal(s, "world", "all", {
    outlet: "uol",
    query: "ANALISE",
  });
  assert(query.length > 0);
  assert(query.every((a) => a.press.outlet.id === "uol"));
  assert.equal(
    E.journal(s, "world", "all", { outlet: "marca", journalist: "pvc" }).length,
    0,
  );
  assert.equal(
    E.journal(s, "world", "all", { query: "not-a-real-match-xx" }).length,
    0,
  );
});
test("só o gol necessário para a vitória e sua assistência recebem o novo crédito; empate não recebe", () => {
  const s = career(),
    m = E.makeMatch(s);
  const first = goal(s, m, 0, 0);
  goal(s, m, 1, 0);
  const winner = goal(s, m, 0, 0.99);
  assert.notEqual(first.scorerId, winner.scorerId);
  finish(s, m);
  assert.equal(m.performance.players[winner.scorerId].decisiveGoals, 1);
  assert.equal(m.performance.players[first.scorerId].decisiveGoals, 0);
  assert.equal(m.performance.players[winner.assistId].decisiveAssists, 1);
  const counts = JSON.stringify(s.performance.current.players);
  PF.commit(s, m);
  assert.equal(JSON.stringify(s.performance.current.players), counts);
  s.live = null;
  s.today = 7;
  s.day = 1;
  const draw = E.makeMatch(s);
  goal(s, draw);
  goal(s, draw, 1);
  finish(s, draw);
  assert(
    Object.values(draw.performance.players).every(
      (p) => p.decisiveGoals === 0 && p.decisiveAssists === 0,
    ),
  );
});
test("destaque no mata-mata continental pontua e o componente de decisões tem teto de 20", () => {
  const s = career(),
    base = E.makeMatch(s);
  const m = {
    ...base,
    competition: "champions",
    name: "UEFA Champions League",
    kind: "cup",
    round: 10,
    performance: undefined,
  };
  PF.begin(m);
  goal(s, m);
  goal(s, m);
  const winner = finish(s, m);
  assert.equal(m.performance.players[winner.id].knockoutMvp, 1);
  const p = s.performance.current.players[winner.id];
  assert(PF.score(s, p).decisiveness >= 3);
  assert.equal(
    PF.score(s, {
      ...p,
      decisiveGoals: 100,
      decisiveAssists: 100,
      knockoutMvp: 100,
    }).decisiveness,
    20,
  );
  assert.equal(PF.rank(s, "competition", "es").length, 0);
});
test("save 0.11 mantém notas, gols e premiações antigas; dados novos ausentes não viram crédito retroativo", () => {
  const s = career(),
    m = E.makeMatch(s);
  goal(s, m);
  finish(s, m);
  const before = JSON.parse(JSON.stringify(s.performance.current.players));
  const id = Object.keys(before).find((id) => before[id].goals > 0);
  const raw = JSON.parse(S.serialize(s));
  function old(v) {
    if (!v || typeof v !== "object") return;
    for (const key of [
      ...PF.extraKeys,
      "decisiveness",
      "criteriaStarted",
      "criteriaRevision",
      "goalEvents",
      "goalTrackingFrom",
    ])
      delete v[key];
    for (const x of Object.values(v)) old(x);
  }
  old(raw);
  const restored = S.parse(JSON.stringify(raw));
  assert.equal(
    restored.performance.current.players[id].goals,
    before[id].goals,
  );
  assert.equal(
    restored.performance.current.players[id].ratingSum,
    before[id].ratingSum,
  );
  assert.equal(
    PF.score(restored, restored.performance.current.players[id]).decisiveness,
    0,
  );
  assert.equal(restored.live.performance.goalEvents.length, 0);
  assert.equal(restored.performance.criteriaStarted.offset, 0);
  assert.doesNotThrow(() => S.serialize(restored));
});
