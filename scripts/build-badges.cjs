"use strict";
// Cria os emblemas geométricos originais; não baixa nem transforma escudos oficiais.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."),
  W = require("../world.js"),
  A = require("../appearance.js"),
  manifestPath = path.join(root, "data/badges.json");
const prior = JSON.parse(fs.readFileSync(manifestPath, "utf8")),
  folder = path.join(root, "assets/badges");
const normalize = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
const identities = new Map(
  W.leagues.flatMap((l) =>
    l.clubs.map((name, i) => [normalize(name), { name, id: l.id + "-" + i }]),
  ),
);
const oldColors = {
  Ceará: ["#171717", "#ffffff"],
  Fortaleza: ["#174e9b", "#c6283d"],
  Sport: ["#c6283d", "#171717"],
  "Vasco da Gama": ["#171717", "#ffffff"],
};
const shapes = [
  "M48 8 78 20 85 53Q82 75 48 89 14 75 11 53L18 20Z",
  "M24 10H72L86 30V67L67 86H29L10 67V30Z",
  "M48 8Q72 8 83 25V61Q72 80 48 89 24 80 13 61V25Q24 8 48 8Z",
  "M48 7 84 29 79 72 48 89 17 72 12 29Z",
  "M24 10H72Q85 10 85 23V61L48 88 11 61V23Q11 10 24 10Z",
  "M48 8 82 19V53Q80 77 48 88 16 77 14 53V19Z",
];
const marks = [
  '<path d="m26 52 22-22 22 22-10 10-12-13-12 13Z"/><path d="m37 66 11-12 11 12-11 10Z"/>',
  '<path d="m27 35 20 11-9 28-11-7 5-17-12-7Zm42 26L49 50l9-28 11 7-5 17 12 7Z"/>',
  '<path d="m48 24 10 13-10 13-10-13Zm-20 20 13 10-13 10-9-10Zm40 0 9 10-9 10-13-10ZM48 57l10 13-10 10-10-10Z"/>',
  '<path d="M25 63V41l12-12h21l13 12v22H57V45l-9-8-9 8v18Z"/><path d="M42 51h12v23H42Z"/>',
  '<path d="m27 33 15-8 4 20-7 8Zm42 0-12-8-7 20 7 8ZM27 64l15 8 4-20-7-8Zm42 0-12 8-7-20 7-8Z"/>',
  '<path d="m24 39 24-14 24 14-8 12-16-10-16 10Zm5 19 19-11 19 11-8 13-11-7-11 7Z"/>',
];
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
function original(name) {
  const identity = identities.get(normalize(name)),
    colors =
      oldColors[name] ||
      Object.values(A.clubColors(identity || { name, id: "unknown-0" })),
    [primary, secondary] = colors;
  const digest = crypto.createHash("sha256").update(normalize(name)).digest(),
    seed = digest.readUInt32BE(0),
    ink = A.readable(primary),
    shape = shapes[seed % shapes.length];
  const dots = Array.from(
    { length: 5 },
    (_, i) =>
      `<circle cx="${32 + i * 8}" cy="${78 + (digest[i + 4] % 3)}" r="${(digest[i + 9] % 2) + 1}"/>`,
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img"><title>${escape(name)} · emblema original Dinastia FC</title><path d="${shape}" fill="${primary}" stroke="${ink}" stroke-width="2.5"/><path d="M23 22h50l-8 8H31Z" fill="${secondary}"/><g fill="${ink}" transform="rotate(${((seed >>> 8) % 4) * 90} 48 48)">${marks[(seed >>> 5) % marks.length]}</g><g fill="${secondary}">${dots}</g><path d="M21 32v26" stroke="${secondary}" stroke-width="2" opacity=".7"/></svg>\n`;
  const file = "original-" + digest.toString("hex").slice(0, 14) + ".svg";
  fs.writeFileSync(path.join(folder, file), svg);
  return {
    name,
    file,
    provider: "Dinastia FC · desenho original",
    design: "geometric-v1",
    colors: { primary, secondary },
    sha256: crypto.createHash("sha256").update(svg).digest("hex"),
  };
}
const clubNames = [
    ...new Set([
      ...prior.entries.filter((e) => e.name).map((e) => e.name),
      ...W.leagues.flatMap((l) => l.clubs),
    ]),
  ],
  flags = prior.entries.filter((e) => e.country),
  entries = [...clubNames.map(original), ...flags];
const manifest = {
  revision: "original-1",
  createdOn: "2026-10-27",
  note: "Emblemas de clubes originais do Dinastia FC, com geometria própria e cores de identificação. Não são os escudos oficiais nem indicam parceria. Bandeiras identificam países.",
  entries,
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
const keep = new Set(entries.map((e) => e.file));
for (const file of fs.readdirSync(folder))
  if (!keep.has(file)) fs.unlinkSync(path.join(folder, file));
const data = {
  revision: manifest.revision,
  assets: Object.fromEntries(
    [...keep].sort().map((name) => [name, "assets/badges/" + name]),
  ),
  clubs: Object.fromEntries(
    entries.filter((e) => e.name).map((e) => [e.name, e.file]),
  ),
  countries: Object.fromEntries(flags.map((e) => [e.country, e.file])),
};
fs.writeFileSync(
  path.join(root, "badges-data.js"),
  '"use strict";\n(function(root){const data=' +
    JSON.stringify(data) +
    ';root.LegacyBadgeData=data;if(typeof module!=="undefined")module.exports=data;})(globalThis);\n',
);
console.log(
  clubNames.length +
    " emblemas originais; " +
    flags.length +
    " bandeiras; antigos escudos oficiais removidos.",
);
