"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
const W = require("../world"),
  R = require("../roster-data"),
  raw = require("../data/reserve-goalkeepers.json"),
  young = require("../data/young-player-references.json"),
  baseline = require("../data/roster-baseline-2025.json");
const normalize = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
const idOf = (row) => (/^\d+$/.test(row[0]) ? "tm-" + row[0] : row[0]);
const present = new Map(
  Object.entries(R.teams).flatMap(([club, t]) =>
    t.players.map((p) => [idOf(p), { club, p }]),
  ),
);
const byName = new Map();
for (const t of [...Object.values(R.teams), ...Object.values(baseline.teams)])
  for (const row of t.players) {
    const key = normalize(row[1]);
    if (!byName.has(key)) byName.set(key, new Map());
    byName.get(key).set(idOf(row), row);
  }
const sourceMemberships = new Map();
for (const c of [...raw.clubs, ...young.clubs])
  for (const p of c.players) {
    if (!sourceMemberships.has(p.sourceId))
      sourceMemberships.set(p.sourceId, new Set());
    sourceMemberships.get(p.sourceId).add(c.id);
  }
const clubs = [],
  skipped = [];
for (const c of [...raw.clubs, ...young.clubs]) {
  const rows = [];
  for (const p of c.players) {
    if (sourceMemberships.get(p.sourceId).size > 1) {
      skipped.push({
        name: p.name,
        sourceId: p.sourceId,
        reason: "multiple club listings",
      });
      continue;
    }
    const choices = [...(byName.get(normalize(p.name))?.values() || [])].filter(
      (row) => !row[2] || row[2] === p.birthDate,
    );
    if (choices.length > 1) {
      skipped.push({ name: p.name, reason: "ambiguous identity" });
      continue;
    }
    if (!choices.length && byName.has(normalize(p.name))) {
      skipped.push({ name: p.name, reason: "birth date conflict" });
      continue;
    }
    const historical = choices[0],
      row = historical
        ? JSON.parse(JSON.stringify(historical))
        : [
            `espn-${p.sourceId}`,
            p.name,
            p.birthDate,
            p.position || "GOL",
            0,
            null,
            null,
            p.nationality,
            "espn-roster-2026",
            null,
            2026,
            {},
          ];
    const id = idOf(row);
    if (present.has(id)) continue;
    row[2] = p.birthDate;
    row[3] =
      !p.position || p.position === "GOL"
        ? "GOL"
        : historical?.[3] || p.position;
    row[7] = p.nationality || row[7];
    row[8] = "espn-roster-2026";
    const [year, month, day] = p.birthDate.split("-").map(Number);
    const age =
      p.ageAtReference ??
      2026 - year - Number(10 < month || (month === 10 && 27 < day));
    row[11] = {
      ...(row[11] || {}),
      sourceKey: "espn-roster-2026",
      reference: "2026-10-27",
      membership: "full-squad",
      sourceUrl: c.url,
      positionEstimated: !historical && row[3] !== "GOL",
      ageUnknown: false,
      shirtNumber: p.number,
      academy: age <= 21 && (p.number || 99) > 25,
      goalkeeperSupplement: row[3] === "GOL",
      supplementaryPlayer: true,
      overallEstimate:
        {
          "Wojciech Szczesny": 82,
          "Wojciech Szczęsny": 82,
          "Dominik Livakovic": 80,
        }[p.name] || null,
    };
    present.set(id, { club: c.id, p: row });
    rows.push(row);
  }
  if (rows.length) {
    const existingClub = clubs.find((club) => club.id === c.id);
    if (existingClub) existingClub.players.push(...rows);
    else
      clubs.push({
        id: c.id,
        name: c.name,
        url: c.url,
        season: c.season,
        players: rows,
      });
  }
}
const supplements = {
  revision: "reserves-youth-2026-10-v1",
  checkedAt: raw.checkedAt,
  clubs,
  skipped,
};
fs.writeFileSync(
  path.join(root, "data/roster-supplements.json"),
  JSON.stringify(supplements, null, 2) + "\n",
);
function pack(name, globalName, data) {
  fs.writeFileSync(
    path.join(root, name),
    '"use strict";\n(function(root){const data=' +
      JSON.stringify(data) +
      ";root." +
      globalName +
      '=data;if(typeof module!=="undefined")module.exports=data;})(globalThis);\n',
  );
}
pack("roster-supplements-data.js", "LegacyRosterSupplements", supplements);
pack(
  "club-context-data.js",
  "LegacyClubContext",
  require("../data/club-infrastructure.json"),
);
console.log(
  clubs.length +
    " clubs; " +
    clubs.reduce((n, c) => n + c.players.length, 0) +
    " supplemental real players; " +
    require("../data/club-infrastructure.json").clubs.length +
    " stadium references.",
);

const state = require("../engine.js").fresh();
fs.writeFileSync(
  path.join(root, "data/roster-coverage.json"),
  JSON.stringify(
    state.teams.map((t) => ({
      id: t.id,
      club: t.name,
      players: t.players.length + t.youth.length,
      professionals: t.players.length,
      youth: t.youth.length,
      goalkeepers: t.players.filter((p) => p.pos === "GOL").length,
      playable: t.players.length >= 11,
      reference: t.rosterReference,
    })),
    null,
    2,
  ) + "\n",
);
