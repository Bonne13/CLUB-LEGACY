const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
const L = require("../vendor/lz-string.js");
function career() {
  const s = E.fresh();
  E.start(s, "br-0");
  return s;
}
function complete(s) {
  const f = E.nextFixture(s);
  if (f)
    s.live = {
      ...f,
      day: s.day,
      offset: s.today,
      minute: 90,
      goals: [2, 0],
      shots: [4, 1],
      events: [],
    };
  E.advance(s, () => 0.99);
  s.live = null;
}
function reconcile(t) {
  assert.equal(
    t.money,
    t.finance.openingBalance +
      t.finance.ledger.reduce((n, r) => n + r.amount, 0),
  );
}
test("catálogo contém exclusivamente IDs reais, sem preenchimento de clubes incompletos", () => {
  const s = E.fresh(),
    all = s.teams.flatMap((t) => [...t.players, ...t.youth]);
  assert.equal(all.length, 7815);
  assert(
    all.every(
      (p) =>
        p.real &&
        p.sourceId &&
        (p.birthDate || p.ageEstimated) &&
        (p.id === "tm-" + p.sourceId || p.id === p.sourceId),
    ),
  );
  assert.equal(s.teams.filter((t) => t.players.length >= 11).length, 341);
  assert(
    s.teams
      .filter(
        (t) =>
          t.leagueId === "br" ||
          ["en", "es", "it", "de", "fr", "pt", "nl"].includes(t.leagueId),
      )
      .every((t) => t.players.length >= 11),
  );
  assert.throws(() => E.start(E.fresh(), "co-18"), /onze atletas/);
});
test("valores usam euros da referência e capitais variam por porte do clube", () => {
  const s = E.fresh(),
    flamengo = E.team(s, "br-0"),
    madrid = E.team(s, "es-0"),
    haaland = E.team(s, "en-1").players.find(
      (p) => p.name === "Erling Haaland",
    );
  assert(haaland && haaland.referenceValueEuro > 50000000);
  assert.equal(haaland.price, Math.round(haaland.referenceValueEuro * 6.2));
  assert(madrid.finance.transferBudget > flamengo.finance.transferBudget);
  assert.equal(flamengo.finance.transferBudget, 250000000);
  assert(madrid.money > flamengo.money);
  assert.equal(haaland.age, 25);
});
test("simulação diária ou semanal para antes de jogar e não inventa resultados do usuário", () => {
  const s = career();
  assert.equal(E.simulate(s, 1, "weeks").advanced, 0);
  complete(s);
  assert.equal(s.today, 1);
  assert.equal(E.nextFixture(s), null);
  assert.equal(E.simulate(s, 1, "days", () => 0.99).advanced, 1);
  assert.equal(s.today, 2);
  const result = E.simulate(s, 1, "weeks", () => 0.99);
  assert.deepEqual(result, {
    advanced: 5,
    stoppedForMatch: true,
    stoppedForNegotiation: false,
    stoppedForReport: false,
    stoppedForInvitation: false,
    finished: false,
  });
  assert.equal(s.today, 7);
  assert(E.nextFixture(s));
  const row = E.league(s, "br").table.find((r) => r.id === "br-0");
  assert.equal(row.w + row.d + row.l, 1);
  assert.throws(() => E.simulate(s, -1, "days"), /válido/);
});
test("salários pagos uma vez por semana e patrocínio, TV e operação uma vez por mês", () => {
  const s = career(),
    t = E.team(s),
    weekly = E.finance.payroll(t);
  while (s.today < 30) complete(s);
  const wages = t.finance.ledger.filter((r) => r.category === "wages");
  assert.equal(wages.length, 4);
  assert(wages.every((r) => r.amount === -weekly));
  assert.equal(
    t.finance.ledger.filter((r) => r.category === "sponsors" && r.amount > 0)
      .length,
    1,
  );
  assert.equal(
    t.finance.ledger.filter((r) => r.category === "broadcast").length,
    1,
  );
  assert.equal(
    t.finance.ledger.filter((r) => r.category === "operations").length,
    1,
  );
  assert.equal(t.finance.ledger.find((r) => r.category === "wages").offset, 6);
  assert.equal(
    t.finance.ledger.find((r) => r.category === "broadcast").offset,
    29,
  );
  reconcile(t);
});
test("orçamentos independentes bloqueiam compras e reequilibram sem criar caixa", () => {
  const s = career(),
    t = E.team(s),
    seller = E.team(s, "br-1"),
    p = [...seller.players].sort((a, b) => a.price - b.price)[0],
    fee = E.minFee(s, p),
    salary = Math.ceil(p.salary * 1.1);
  t.finance.transferBudget = 0;
  const original = JSON.stringify(s);
  assert.throws(() => E.buy(s, p.id, fee, salary, 2), /transferências/);
  assert.equal(JSON.stringify(s), original);
  t.finance.transferBudget = 10000000;
  t.finance.wageBudget = E.finance.payroll(t);
  assert.throws(() => E.buy(s, p.id, fee, salary, 2), /salarial/);
  const money = t.money,
    pool = t.finance.transferBudget;
  E.finance.allocate(t, s, 50);
  assert.equal(t.money, money);
  assert.equal(t.finance.transferBudget, pool * 0.5);
  assert.equal(
    t.finance.wageBudget,
    E.finance.payroll(t) + Math.floor((pool * 0.5) / 52),
  );
  reconcile(t);
});
test("compras e vendas registram taxa, luvas e contrapartida, com saldo conciliável", () => {
  const s = career(),
    t = E.team(s),
    seller = E.team(s, "en-5"),
    p = [...seller.players].sort((a, b) => a.price - b.price)[0],
    fee = E.minFee(s, p),
    salary = Math.ceil(p.salary * 1.1);
  t.finance.wageBudget = E.finance.payroll(t) + salary;
  E.buy(s, p.id, fee, salary, 2);
  assert(
    t.finance.ledger.some(
      (r) => r.category === "transfer" && r.amount === -fee,
    ),
  );
  assert(
    t.finance.ledger.some(
      (r) => r.category === "signing" && r.amount === -salary * 4,
    ),
  );
  assert(
    seller.finance.ledger.some(
      (r) => r.category === "transfer" && r.amount === fee,
    ),
  );
  reconcile(t);
  reconcile(seller);
});
test("patrocínio paga só após o vencimento e não pode ser assinado repetidamente", () => {
  const s = career(),
    t = E.team(s),
    cash = t.money;
  const offer = E.finance.offers(t, s).find((o) => o.slot === "kit");
  const c = E.signSponsor(s, offer.id);
  assert.equal(t.money, cash);
  assert.equal(c.expires, s.season + 1);
  assert.throws(() => E.signSponsor(s, offer.id), /já está ativo/);
  while (s.today < 30) complete(s);
  assert.equal(
    t.finance.ledger.filter(
      (r) =>
        r.description.startsWith("Parcela mensal") &&
        r.description.includes(c.name) &&
        r.amount > 0,
    ).length,
    1,
  );
  reconcile(t);
});
test("migração v2 preserva variação líquida, remove todos os gerados e suporta compressão", () => {
  const base = E.fresh();
  E.start(base, "br-0");
  const old = E.copy(base);
  old.version = 2;
  old.day = 1;
  delete old.today;
  old.teams.forEach((t) => {
    delete t.finance;
    t.money = 18000000 + (7 - Number(t.id.split("-")[1])) * 500000;
    t.players = [
      {
        id: "fake-" + t.id,
        name: "Jogador Gerado",
        real: false,
        pos: "ATA",
        ovr: 70,
        fitness: 100,
      },
    ];
    t.youth = [];
  });
  old.teams[0].money += 1234567;
  const upgraded = E.upgradeSave(old);
  assert.equal(upgraded.version, 3);
  assert.equal(upgraded.today, 7);
  assert.equal(upgraded.teams[0].money, base.teams[0].money + 1234567);
  assert(
    upgraded.teams.every((t) =>
      [...t.players, ...t.youth].every((p) => p.real),
    ),
  );
  assert(!JSON.stringify(upgraded.teams).includes("Jogador Gerado"));
  const raw = JSON.stringify(upgraded);
  assert.equal(L.decompressFromUTF16(L.compressToUTF16(raw)), raw);
  upgraded.teams.forEach(reconcile);
});
