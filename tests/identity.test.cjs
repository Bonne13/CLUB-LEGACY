const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const A = require("../appearance.js"),
  B = require("../badges.js"),
  W = require("../world.js"),
  N = require("../national.js");
test("escudos cobrem clubes atuais e preservam identidades quando uma vaga de liga é reutilizada", () => {
  for (const l of W.leagues)
    for (const name of l.clubs) assert(B.asset({ name }), name);
  assert.notEqual(
    B.asset({ id: "br-16", name: "Ceará" }),
    B.asset({ id: "br-16", name: "Athletico Paranaense" }),
  );
  assert.equal(B.asset({ name: "Sao Paulo" }), B.asset({ name: "São Paulo" }));
  assert.equal(B.asset({ name: "Clube desconhecido", id: "br-0" }), null);
  for (const n of N.definitions)
    assert(B.asset({ ...n, isNational: true }), n.name);
});
test("catálogo visual usa arquivos locais íntegros, sem baixar imagens durante a carreira", () => {
  const manifest = require("../data/badges.json"),
    data = require("../badges-data.js");
  for (const e of manifest.entries) {
    const file = path.resolve(__dirname, "..", data.assets[e.file]),
      bytes = fs.readFileSync(file);
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      e.sha256,
      e.file,
    );
    if (e.name) {
      assert(e.file.startsWith("original-") && e.file.endsWith(".svg"), e.file);
      assert.equal(e.design, "heraldic-v2");
      const svg = bytes.toString("utf8");
      assert(svg.includes('viewBox="0 0 96 96"'));
      assert(svg.includes("emblema original Dinastia FC"));
      assert(
        !/<(?:image|script|foreignObject)|\bonload\s*=|href=|<rect[^>]*width="96"/i.test(
          svg,
        ),
      );
      assert(!e.sourceUrl && !e.sourceId);
    } else {
      assert(
        bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        e.file,
      );
      assert(
        bytes.readUInt32BE(16) >= 24 && bytes.readUInt32BE(20) >= 24,
        e.file,
      );
    }
  }
});
test("temas mantêm contraste de leitura em todas as cores dos clubes e seleções", () => {
  const identities = [
    ...W.leagues.flatMap((l) =>
      l.clubs.map((name, i) => ({ name, id: l.id + "-" + i })),
    ),
    ...N.definitions.map((n) => ({ ...n, isNational: true })),
  ];
  const blend = (a, b, w) =>
    "#" +
    a
      .slice(1)
      .match(/../g)
      .map((v, i) =>
        Math.round(
          parseInt(v, 16) * (1 - w) +
            parseInt(b.slice(1).match(/../g)[i], 16) * w,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  for (const t of identities)
    for (const mode of ["dark", "light"]) {
      const colors = A.clubColors(t),
        v = A.themeTokens(colors, mode),
        context = t.name + " " + mode;
      assert(A.contrast(v["--text"], v["--panel"]) >= 4.5, context);
      assert(A.contrast(v["--muted"], v["--panel"]) >= 4.5, context);
      assert(
        A.contrast(v["--club-on-primary"], v["--club-primary"]) >= 4.5,
        context,
      );
      assert(A.contrast(v["--action-border"], v["--panel"]) >= 3, context);
      assert(
        A.contrast(v["--accent"], blend(v["--panel"], v["--accent"], 0.12)) >=
          4.5,
        context,
      );
      for (const token of ["--success", "--warning", "--error", "--info"])
        assert(A.contrast(v[token], v["--panel"]) >= 4.5, context + token);
    }
  assert.deepEqual(
    A.clubColors({ id: "nt-Brazil", isNational: true, country: "Brazil" }),
    A.nationalColors("Brazil"),
  );
  assert.notDeepEqual(
    A.nationalColors("Brazil"),
    A.clubColors({ id: "br-0", name: "Flamengo" }),
  );
});

test("emblemas possuem desenhos distintos mesmo desconsiderando o título de identificação", () => {
  const entries = require("../data/badges.json").entries.filter((e) => e.name),
    body = new Set();
  for (const e of entries) {
    const text = fs
      .readFileSync(path.resolve(__dirname, "../assets/badges", e.file), "utf8")
      .replace(/<title>[\s\S]*?<\/title>/, "");
    body.add(crypto.createHash("sha256").update(text).digest("hex"));
  }
  assert.equal(body.size, entries.length);
});
