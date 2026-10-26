"use strict";
(function (root) {
  const data =
    typeof module !== "undefined"
      ? require("./captains-data.js")
      : root.LegacyCaptainsData;
  const clubs = new Map(data.clubs.map((c) => [c.clubId, c]));
  const players = new Map();
  for (const club of data.clubs)
    for (const p of club.captains) {
      const previous = players.get(p.id);
      if (!previous || previous.leadership < p.leadership)
        players.set(p.id, {
          ...p,
          club: club.club,
          url: club.url,
          checkedAt: club.checkedAt,
        });
    }
  function reference(p) {
    return players.get(p.id) || null;
  }
  function hierarchy(t) {
    const ref = clubs.get(t.id);
    return ref
      ? ref.captains
          .map((c) => ({ ...c, player: t.players.find((p) => p.id === c.id) }))
          .filter((c) => c.player)
      : [];
  }
  const api = {
    data,
    revision: data.revision,
    reference,
    hierarchy,
    club: (t) => clubs.get(t.id) || null,
  };
  root.LegacyLeadership = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
