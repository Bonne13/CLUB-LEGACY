const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
const A = require("../appearance.js");
const career = () => {
  const s = E.fresh();
  E.start(s, "br-0");
  return s;
};
test("jornal inicia com notícias e prévias reais da carreira nos três escopos", () => {
  const s = career();
  const own = E.journal(s),
    league = E.journal(s, "league"),
    continent = E.journal(s, "continent");
  assert(own.length > 0);
  assert(own.every((a) => a.clubIds.includes("br-0")));
  assert(league.length > own.length);
  assert(league.some((a) => !a.clubIds.includes("br-0")));
  assert(continent.some((a) => a.clubIds.some((id) => id.startsWith("ar-"))));
  assert(continent.every((a) => a.regions.includes("sa")));
  assert(!continent.some((a) => a.clubIds.some((id) => id.startsWith("en-"))));
  assert(
    E.journal(s, "club", "preview").every((a) => a.category === "preview"),
  );
  assert.deepEqual(E.journal(E.fresh()), []);
});
test("notícias de resultados vêm dos placares executados, incluindo outros clubes", () => {
  const s = career(),
    f = E.nextFixture(s);
  s.live = {
    ...f,
    day: s.day,
    minute: 90,
    goals: [3, 1],
    events: [],
    shots: [8, 4],
  };
  const results = E.advance(s, () => 0.99);
  const articles = E.journal(s, "club", "results");
  assert.equal(articles.length, 1);
  assert(articles[0].title.includes("3 a 1"));
  assert(articles[0].clubIds.includes(f.pair[1]));
  const league = E.journal(s, "league", "results");
  assert.equal(league.length, 10);
  assert(league.some((a) => !a.clubIds.includes("br-0")));
  assert.equal(
    results.filter((r) => r.competition === "br").length,
    league.length,
  );
});
test("mercado e contratos aparecem com valores, clubes e editorias corretas", () => {
  const s = career(),
    buyer = E.team(s),
    seller = E.team(s, "en-4"),
    p = [...seller.players].sort((a, b) => a.price - b.price)[0];
  buyer.money = 1000000000;
  buyer.finance.wageBudget = E.finance.payroll(buyer) + p.salary * 5;
  const fee = E.minFee(s, p);
  E.buy(s, p.id, fee, p.salary * 2, 2);
  const news = E.journal(s, "club", "market")[0];
  assert(news.title.includes(p.name));
  assert.deepEqual(news.clubIds, ["br-0", "en-4"]);
  assert(news.regions.includes("sa") && news.regions.includes("eu"));
  assert(news.body.includes(fee.toLocaleString("pt-BR")));
  E.renew(s, p.id, 1, p.salary * 2);
  assert(
    E.journal(s, "club", "contracts").some((a) => a.title.includes(p.name)),
  );
  assert.equal(E.journal(s, "club", "youth").length, 0);
  // O Flamengo da fonte atual não tem base confirmada; São Paulo tem.
  const academy = E.fresh();
  E.start(academy, "br-7");
  E.promote(academy, E.team(academy).youth[0].id);
  assert.equal(E.journal(academy, "club", "youth").length, 1);
});
test("salvamentos anteriores sem artigos são compatíveis e mantêm as notícias", () => {
  const s = career();
  delete s.articles;
  delete s.articleSequence;
  s.news = ["Flamengo renovou seu elenco.", "Arsenal anunciou seu treinador."];
  const own = E.journal(s, "club");
  assert(own.some((a) => a.title === "Flamengo renovou seu elenco."));
  assert(!own.some((a) => a.title === "Arsenal anunciou seu treinador."));
  const reload = JSON.parse(JSON.stringify(s));
  assert.equal(E.journal(reload, "club").length, own.length);
});
test("cada clube tem cores definidas e contrastes legíveis nos dois temas", () => {
  const s = E.fresh();
  for (const l of s.leagues) {
    const codes = A.rows[l.id].split(" ");
    assert.equal(codes.length, l.ids.length);
    assert(codes.every((c) => A.palettes[c]));
  }
  for (const t of s.teams) {
    const c = A.clubColors(t);
    assert(A.contrast(c.primary, A.readable(c.primary)) >= 4.5);
    for (const bg of ["#142139", "#ffffff"])
      assert(A.contrast(A.accent(c.primary, c.secondary, bg), bg) >= 4.5);
  }
  assert.notEqual(
    A.clubColors(E.team(s, "br-0")).primary,
    A.clubColors(E.team(s, "br-1")).primary,
  );
  assert.equal(A.clubColors(E.team(s, "es-0")).primary, "#f5f7fb");
});
