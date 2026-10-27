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
const DESIGNS = require("./badge-designs.cjs");
const shapes = Object.values(DESIGNS.shapes),
  patterns = [
    "plain",
    "stripes",
    "hoops",
    "sash",
    "halves",
    "thirds",
    "diagonal",
    "diamonds",
  ],
  motifs = Object.keys(DESIGNS.motifs);
const profileMap = new Map(
  Object.entries(DESIGNS.profiles).map(([name, profile]) => [
    normalize(name),
    profile,
  ]),
);
function abbreviation(name) {
  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z ]/g, "")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        ![
          "clube",
          "club",
          "futebol",
          "football",
          "atletico",
          "de",
          "del",
          "sport",
          "real",
        ].includes(w.toLowerCase()),
    );
  return (words.length > 1 ? words.map((w) => w[0]).join("") : words[0] || name)
    .slice(0, 3)
    .toUpperCase();
}
function pattern(kind, a, b) {
  if (kind === "stripes")
    return Array.from(
      { length: 7 },
      (_, i) =>
        `<path d="M${12 + i * 12} 8v80" stroke="${i % 2 ? a : b}" stroke-width="12"/>`,
    ).join("");
  if (kind === "hoops")
    return `<path d="M7 31h82M7 57h82" stroke="${b}" stroke-width="13"/>`;
  if (kind === "sash")
    return `<path d="m12 84 73-73" stroke="${b}" stroke-width="21"/>`;
  if (kind === "diagonal")
    return `<path d="m-8 48 64-64M8 81 88 1M32 105l80-80" stroke="${b}" stroke-width="12"/>`;
  if (kind === "halves") return `<path d="M48 7h42v84H48Z" fill="${b}"/>`;
  if (kind === "thirds")
    return `<path d="M8 35h80v26H8Z" fill="${b}"/><path d="M8 64h80v24H8Z" fill="${a}"/>`;
  if (kind === "diamonds")
    return Array.from(
      { length: 12 },
      (_, i) =>
        `<path d="m${15 + (i % 4) * 22} ${20 + Math.floor(i / 4) * 24} 10-14 10 14-10 14Z" fill="${b}" opacity=".8"/>`,
    ).join("");
  return `<path d="M18 77Q48 61 78 77" fill="none" stroke="${b}" stroke-width="3" opacity=".5"/>`;
}
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
function original(name) {
  const identity = identities.get(normalize(name)),
    profile = profileMap.get(normalize(name)) || {},
    colors =
      profile.colors ||
      oldColors[name] ||
      Object.values(A.clubColors(identity || { name, id: "unknown-0" })),
    [primary, secondary] = colors;
  const digest = crypto.createHash("sha256").update(normalize(name)).digest(),
    seed = digest.readUInt32BE(0),
    shape = DESIGNS.shapes[profile.shape] || shapes[seed % shapes.length],
    ink = A.readable(primary),
    accent = profile.accent || secondary,
    kind = profile.pattern || patterns[(seed >>> 5) % patterns.length],
    symbol = profile.motif || motifs[(seed >>> 10) % motifs.length],
    code = profile.code || abbreviation(name),
    clip = "crest";
  const signature = Array.from(
    { length: 8 },
    (_, i) =>
      `<path d="M${29 + i * 5} 81v${-2 - (digest[i + 15] % 5)}" stroke="${ink}" stroke-width="${1 + (digest[i + 6] % 2)}"/>`,
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img"><title>${escape(name)} · emblema original Dinastia FC</title><defs><clipPath id="${clip}"><path d="${shape}"/></clipPath></defs><path d="${shape}" fill="${primary}" stroke="${ink}" stroke-width="2.5"/><g clip-path="url(#${clip})">${pattern(kind, primary, secondary)}<path d="M22 12H74" stroke="${accent}" stroke-width="4"/><circle cx="48" cy="32" r="20" fill="${primary}" opacity=".94"/><g style="color:${ink}" fill="${ink}" stroke-linejoin="round">${DESIGNS.motifs[symbol]}</g><path d="M21 51H75V76H21Z" fill="${primary}" opacity=".96"/><text x="48" y="70" fill="${ink}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${code.length > 2 ? 19 : 23}" font-weight="900" letter-spacing="1.4">${escape(code)}</text><g>${signature}</g></g><path d="${shape}" fill="none" stroke="${ink}" stroke-width="2.5"/></svg>\n`;
  const file = "original-" + digest.toString("hex").slice(0, 14) + ".svg";
  fs.writeFileSync(path.join(folder, file), svg);
  return {
    name,
    file,
    provider: "Dinastia FC · desenho original",
    design: "heraldic-v2",
    pattern: kind,
    motif: symbol,
    code,
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
  revision: "original-2",
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
