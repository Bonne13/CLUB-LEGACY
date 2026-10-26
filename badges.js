"use strict";
(function (root) {
  const data =
    typeof module !== "undefined"
      ? require("./badges-data.js")
      : root.LegacyBadgeData;
  const normalize = (name) =>
    String(name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();
  // O ID de uma vaga na liga pode ser reaproveitado entre temporadas. O nome
  // identifica o escudo, inclusive em saves com os participantes anteriores.
  const clubs = new Map(
    Object.entries(data.clubs).map(([name, file]) => [normalize(name), file]),
  );
  function asset(team) {
    if (!team) return null;
    const file =
      team.isNational || team.id?.startsWith("nt-")
        ? data.countries[team.country || team.id.slice(3)]
        : clubs.get(normalize(team.name));
    return data.assets[file] || null;
  }
  const api = { asset, normalize };
  root.LegacyBadges = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
