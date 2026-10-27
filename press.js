"use strict";
(function (root) {
  const data =
    typeof module !== "undefined"
      ? require("./press-data.js")
      : root.LegacyPressData;
  const outletMap = new Map(data.outlets.map((o) => [o.id, o]));
  const caches = new WeakMap();
  const hash = (value) =>
    [...value].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 17);
  function coverage(s, article) {
    let cache = caches.get(s);
    if (!cache || cache.teams !== s.teams) {
      cache = { teams: s.teams, map: new Map(s.teams.map((t) => [t.id, t])) };
      caches.set(s, cache);
    }
    const seed = hash(article.id + "|" + article.category),
      teams = (article.clubIds || [])
        .map((id) => cache.map.get(id))
        .filter(Boolean),
      leagues = new Set(teams.map((t) => t.leagueId));
    const awards =
      article.category === "competitions" &&
      /Bola de Ouro|melhor goleiro|prêmio|premia/i.test(article.title);
    let pool = awards
      ? [outletMap.get("onze-imaginaire"), outletMap.get("touchline-chronicle")]
      : data.outlets.filter((o) => o.leagues.some((id) => leagues.has(id)));
    if (["market", "contracts"].includes(article.category))
      pool = [
        ...pool,
        outletMap.get("mercato-orbital"),
        outletMap.get("touchline-chronicle"),
      ];
    if (!pool.length)
      pool = data.outlets.filter((o) =>
        ["goalfield-review", "touchline-chronicle", "panorama-90"].includes(
          o.id,
        ),
      );
    pool = [...new Set(pool)];
    const outlet = pool[seed % pool.length];
    const writers = data.journalists.filter((p) => p.outletId === outlet.id);
    const specialist = writers.filter(
      (p) =>
        p.categories.includes(article.category) &&
        (p.leagues.length === 0 || p.leagues.some((l) => leagues.has(l))),
    );
    const topic = writers.filter((p) =>
      p.categories.includes(article.category),
    );
    const candidates = specialist.length
      ? specialist
      : topic.length
        ? topic
        : writers;
    const journalist =
      candidates[seed % Math.max(1, candidates.length)] || null;
    return {
      simulated: true,
      fictional: true,
      byline: journalist?.name || "Redação " + outlet.name,
      outlet,
      journalist,
    };
  }
  function matches(
    article,
    { outlet = "all", journalist = "all", query = "" } = {},
  ) {
    const p = article.press;
    if (outlet !== "all" && p.outlet.id !== outlet) return false;
    if (journalist !== "all" && p.journalist?.id !== journalist) return false;
    const normalize = (s) =>
      String(s)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    return (
      !query ||
      normalize(
        article.title +
          " " +
          article.body +
          " " +
          p.outlet.name +
          " " +
          (p.journalist?.name || ""),
      ).includes(normalize(query.trim()))
    );
  }
  const api = { data, coverage, matches };
  root.LegacyPress = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
