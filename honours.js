"use strict";
(function (root) {
  const normalize = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const official = (s) =>
    (s.trophies || []).filter((t) => t.kind !== "preseason");
  function records(
    s,
    {
      type = "titles",
      competition = "all",
      season = "all",
      club = "all",
      award = "all",
      query = "",
      preseason = false,
    } = {},
  ) {
    const teams = new Map(s.teams.map((t) => [t.id, t.name])),
      rows =
        type === "awards"
          ? (s.performance?.awards || []).map((a) => ({
              id: a.id,
              kind: "award",
              competition: a.competition || "world",
              competitionName: a.competitionName || "Prêmios mundiais",
              season: a.season,
              offset: a.offset,
              name: a.name,
              clubId: a.winner.clubId,
              playerName: a.winner.name,
              awardType: a.type,
              source: a,
            }))
          : (s.trophies || [])
              .filter((t) => preseason || t.kind !== "preseason")
              .map((t) => ({
                id: t.id,
                kind: t.kind,
                competition: t.competitionId,
                competitionName: t.name,
                season: t.season,
                offset: t.offset,
                name: t.name,
                clubId: t.clubId,
                source: t,
              }));
    return rows
      .filter(
        (r) =>
          (competition === "all" || r.competition === competition) &&
          (season === "all" || r.season === Number(season)) &&
          (club === "all" || r.clubId === club) &&
          (award === "all" || r.awardType === award) &&
          (!query ||
            normalize(
              [
                r.name,
                r.competitionName,
                teams.get(r.clubId),
                r.playerName,
              ].join(" "),
            ).includes(normalize(query))),
      )
      .sort(
        (a, b) =>
          b.season - a.season ||
          (b.offset || 0) - (a.offset || 0) ||
          a.name.localeCompare(b.name) ||
          a.id.localeCompare(b.id),
      );
  }
  function seasons(s) {
    return [
      ...new Set([
        ...(s.trophies || []).map((t) => t.season),
        ...(s.performance?.awards || []).map((a) => a.season),
      ]),
    ].sort((a, b) => b - a);
  }
  function leaders(s, type = "titles") {
    const counts = new Map();
    for (const r of records(s, { type })) {
      const id = type === "titles" ? r.clubId : r.source.winner.id;
      const current = counts.get(id) || {
        id,
        name:
          type === "titles"
            ? s.teams.find((t) => t.id === id)?.name || id
            : r.playerName,
        count: 0,
        clubId: r.clubId,
      };
      current.count++;
      counts.set(id, current);
    }
    return [...counts.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
  }
  const api = { records, seasons, leaders, official };
  root.LegacyHonours = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
