const { test } = require("node:test"),
  assert = require("node:assert/strict");
const E = require("../engine.js"),
  S = require("../saves.js");
function career(mode = "normal") {
  const s = E.fresh();
  E.start(
    s,
    "br-0",
    { name: "Ana Silva", age: 35, nationality: "Brazil" },
    mode,
  );
  return s;
}
test("base nova inicia em 2026 e identifica snapshots por clube sem datas futuras", () => {
  const s = E.fresh();
  assert.equal(s.season, 2026);
  assert.equal(s.rosterRevision, E.ROSTERS.revision);
  const brazil = s.teams.filter((t) => t.leagueId === "br");
  assert.equal(brazil.length, 20);
  for (const n of ["Athletico Paranaense", "Coritiba", "Chapecoense", "Remo"])
    assert(brazil.some((t) => t.name === n));
  assert(
    brazil.every(
      (t) =>
        t.rosterReference.source === "sofascore-br-2026" &&
        t.players.length >= 11,
    ),
  );
  for (const t of s.teams)
    for (const p of [...t.players, ...t.youth]) {
      assert(p.real && p.sourceId);
      assert(
        !p.membershipReference ||
          p.membershipReference <=
            (p.dataSource === "espn-roster-2026" ? "2026-10-27" : "2026-10-23"),
      );
      if (p.ageUnknown) assert(p.ageEstimated && !p.birthDate);
    }
  assert(E.team(s, "br-0").players.some((p) => p.name === "Lucas Paquetá"));
  assert(E.team(s, "br-1").players.some((p) => p.name === "Jhon Arias"));
  assert(E.team(s, "en-2").rosterReference.source === "fbref-eu-2026-27");
  assert(E.team(s, "us-0").rosterReference.source === "mls-2026");
  const ids = s.teams
    .flatMap((t) => [...t.players, ...t.youth])
    .map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});
test("fontes estatísticas mantêm origem das posições estimadas e rejeitam falsa equivalência nominal", () => {
  const s = E.fresh(),
    t = E.team(s, "br-0");
  assert.equal(t.players.find((p) => p.name === "Jorginho").pos, "VOL");
  assert.equal(t.players.find((p) => p.name === "Agustín Rossi").pos, "GOL");
  const cross = t.players.find((p) => p.name === "Nicolás de la Cruz");
  assert(cross);
  assert.notEqual(cross.id, "tm-345401"); // Nicolas Careca é outra pessoa.
  assert(t.players.some((p) => p.positionEstimated));
});
test("modo normal bloqueia aportes e modo inválido não inicia carreira", () => {
  const s = career(),
    before = JSON.stringify(s);
  assert.throws(() => E.addTestFunds(s, 100), /apenas no modo teste/);
  assert.equal(JSON.stringify(s), before);
  const fresh = E.fresh(),
    raw = JSON.stringify(fresh);
  assert.throws(() =>
    E.start(
      fresh,
      "br-0",
      { name: "Ana Silva", age: 30, nationality: "Brazil" },
      "invalid",
    ),
  );
  assert.equal(JSON.stringify(fresh), raw);
});
test("modo teste registra aportes, atualiza destino certo e concilia caixa", () => {
  const s = career("test"),
    t = E.team(s),
    cash = t.money,
    transfer = t.finance.transferBudget,
    wage = t.finance.wageBudget;
  E.addTestFunds(s, 100000000, "transfer");
  assert.equal(t.money, cash + 100000000);
  assert.equal(t.finance.transferBudget, transfer + 100000000);
  assert.equal(t.finance.wageBudget, wage);
  E.addTestFunds(s, 520000, "wages");
  assert.equal(t.finance.wageBudget, wage + 10000);
  E.addTestFunds(s, 1000, "cash");
  assert.equal(t.finance.transferBudget, transfer + 100000000);
  assert.equal(s.testFundingTotal, 100521000);
  assert.equal(t.finance.ledger.filter((r) => r.category === "test").length, 3);
  assert.equal(
    t.money,
    t.finance.openingBalance +
      t.finance.ledger.reduce((n, r) => n + r.amount, 0),
  );
  const restored = S.parse(S.serialize(s));
  assert.equal(restored.mode, "test");
  assert.equal(E.team(restored).money, t.money);
});
test("aporte inválido não altera a carreira e saves antigos permanecem normais", () => {
  const s = career("test"),
    raw = JSON.stringify(s);
  for (const [amount, dest] of [
    [-1, "cash"],
    [1.5, "cash"],
    [NaN, "cash"],
    [1e13, "cash"],
    [100, "invalid"],
  ]) {
    assert.throws(() => E.addTestFunds(s, amount, dest));
    assert.equal(JSON.stringify(s), raw);
  }
  const old = career();
  delete old.mode;
  delete old.testFundingTotal;
  const imported = S.parse(JSON.stringify(old));
  assert.equal(imported.mode, "normal");
  assert.equal(imported.testFundingTotal, 0);
});
test("carreira antiga mantém clubes e elenco ao preparar com base nova", () => {
  const s = career();
  s.rosterRevision = "historical-1";
  const t = E.team(s, "br-16");
  t.name = "Ceará";
  const before = JSON.stringify(
    s.teams.map((t) => ({
      id: t.id,
      name: t.name,
      players: t.players,
      youth: t.youth,
      money: t.money,
    })),
  );
  E.prepareCareer(s);
  assert.equal(
    JSON.stringify(
      s.teams.map((t) => ({
        id: t.id,
        name: t.name,
        players: t.players,
        youth: t.youth,
        money: t.money,
      })),
    ),
    before,
  );
});
