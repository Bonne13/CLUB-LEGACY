const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js"),
  S = require("../saves.js"),
  L = require("../vendor/lz-string.js");
function start() {
  const s = E.fresh();
  E.start(s, "br-0", {
    name: "Carlos Silva",
    age: 38,
    nationality: "Portugal",
  });
  return s;
}
function complete(s) {
  const f = E.nextFixture(s);
  if (f) {
    const m = E.makeMatch(s);
    while (m.minute < 90) E.minute(s, m, () => 0.99);
  }
  const r = E.advance(s, () => 0.99);
  s.live = null;
  return r;
}
test("perfil valida antes de começar e mantém identidade ao mudar de clube", () => {
  const invalid = E.fresh(),
    raw = JSON.stringify(invalid);
  assert.throws(() =>
    E.start(invalid, "br-0", { name: "X", age: 17, nationality: "Brazil" }),
  );
  assert.equal(JSON.stringify(invalid), raw);
  const s = start();
  assert.equal(s.coaches.find((c) => c.id === "you").name, "Carlos Silva");
  assert.equal(s.season - s.profile.birthYear, 38);
  s.day = 51;
  s.today = 263;
  s.offers = [{ clubId: "br-1", years: 2, expires: s.season }];
  E.changeClub(s, "br-1");
  assert.equal(s.profile.name, "Carlos Silva");
  E.nextSeason(s);
  assert.equal(s.season - s.profile.birthYear, 39);
  assert.equal(s.profile.nationality, "Portugal");
});
test("convocação usa os mesmos atletas reais, rejeita inelegíveis e limita 23 nomes", () => {
  const s = start(),
    count = E.national.players(s).length;
  invite(s, "nt-Brazil");
  E.assumeNational(s, "nt-Brazil");
  const n = E.team(s, "nt-Brazil");
  assert.equal(n.players.length, 23);
  assert(n.players.every((p) => p.real && p.nationalities.includes("Brazil")));
  assert(E.national.players(s).includes(n.players[0]));
  assert.equal(E.national.players(s).length, count);
  const wrong = E.national.pool(s, "Portugal")[0];
  assert.throws(() => E.national.call(s, wrong.id), /não elegível/);
  const outside = E.national
    .pool(s, "Brazil")
    .find((p) => !n.players.includes(p) && !p.injury);
  assert.throws(() => E.national.call(s, outside.id), /23 convocados/);
  const remove = n.players.find((p) => p.pos !== "GOL");
  E.national.call(s, remove.id);
  E.national.call(s, outside.id);
  assert.equal(E.team(s, "nt-Brazil").players.length, 23);
});
test("simulação para em amistoso e registra placar sem cobrar o caixa do clube por convocação", () => {
  const s = start(),
    cash = E.team(s).money;
  invite(s, "nt-Argentina");
  E.assumeNational(s, "nt-Argentina");
  assert.equal(E.team(s).money, cash);
  complete(s);
  const res = E.simulate(s, 1, "weeks", () => 0.99);
  assert.equal(s.today, 5);
  assert(res.stoppedForMatch);
  const f = E.nextFixture(s);
  assert.equal(f.kind, "national");
  assert(f.pair.includes("nt-Argentina"));
  assert.equal(E.upcomingFixture(s).offset, 5);
  const clubs = s.leagues.map((l) => JSON.stringify(l.table));
  complete(s);
  assert.deepEqual(
    s.leagues.map((l) => JSON.stringify(l.table)),
    clubs,
  );
  assert(
    s.national.results.some(
      (r) => r.offset === 5 && r.pair.includes("nt-Argentina"),
    ),
  );
  assert(E.journal(s).some((a) => a.title.includes("Argentina")));
  assert.equal(s.today, 6);
  assert.equal(E.nextFixture(s), null);
  E.simulate(s, 1, "weeks", () => 0.99);
  assert.equal(s.today, 7);
});
test("exportação, JSON anterior e arquivo comprimido preservam partida e perfil", () => {
  const s = start();
  invite(s, "nt-Brazil");
  E.assumeNational(s, "nt-Brazil");
  const m = E.makeMatch(s, "2d");
  for (let i = 0; i < 24; i++) E.minute(s, m, () => 0.99);
  for (const raw of [
    S.serialize(s),
    JSON.stringify(s),
    "CL3:" + L.compressToUTF16(JSON.stringify(s)),
  ]) {
    const restored = S.parse(raw);
    assert.equal(restored.profile.name, "Carlos Silva");
    assert.equal(restored.live.minute, 24);
    assert.equal(restored.live.mode, "2d");
    assert.equal(restored.national.job, "nt-Brazil");
  }
  const before = JSON.stringify(s);
  assert.throws(() => S.parse("{broken"));
  for (const alter of [
    (x) => x.teams.pop(),
    (x) => (x.clubId = "unknown"),
    (x) => (x.today = 300),
    (x) => x.teams[0].players.push(x.teams[0].players[0]),
    (x) => delete x.teams[0].finance,
  ]) {
    const broken = JSON.parse(before);
    alter(broken);
    assert.throws(() => S.parse(JSON.stringify(broken)), /inválido/);
  }
  assert.equal(JSON.stringify(s), before);
});
test("atualização de save anterior adiciona metadados sem recolocar atleta transferido", () => {
  const s = start();
  delete s.dataRevision;
  delete s.profile;
  delete s.national;
  for (const t of s.teams) {
    t.players = t.players.filter((p) => !p.dataSource.startsWith("sofifa-"));
    t.youth = t.youth.filter((p) => !p.dataSource.startsWith("sofifa-"));
    for (const p of [...t.players, ...t.youth]) {
      delete p.nationalities;
      delete p.nationality;
    }
  }
  const athlete = E.team(s, "br-0").players.pop();
  E.team(s, "br-1").players.push(athlete);
  E.prepareCareer(s);
  assert(E.team(s, "br-1").players.includes(athlete));
  assert(!E.team(s, "br-0").players.some((p) => p.id === athlete.id));
  assert(athlete.nationalities.length);
  const count = s.teams.flatMap((t) => [...t.players, ...t.youth]).length;
  E.prepareCareer(s);
  assert.equal(
    s.teams.flatMap((t) => [...t.players, ...t.youth]).length,
    count,
  );
});

function invite(s, id) {
  s.national.invites.push({
    id: "test-" + id,
    selectionId: id,
    name: E.national.definitions.find((d) => d.id === id).name,
    status: "pending",
    season: s.season,
    offset: s.today,
    expires: s.today + 14,
    required: 35,
    reason: "Convite de teste para verificar convocação e partida.",
  });
}
