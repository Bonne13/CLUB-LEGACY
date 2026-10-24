"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
function rng(seed = 42) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function career(id = "br-0") {
  const s = E.fresh();
  E.start(s, id);
  return s;
}
function playDay(s, random = rng()) {
  if (E.nextFixture(s)) {
    s.live = {
      ...E.nextFixture(s),
      day: s.day,
      minute: 90,
      goals: [2, 1],
      events: [],
      shots: [5, 4],
    };
  }
  const results = E.advance(s, random);
  s.live = null;
  return results;
}
function season(s) {
  const random = rng(25);
  while (E.dayInfo(s)) playDay(s, random);
  return s;
}
test("397 clubes reais, 21 ligas, identidades e posições sem duplicação", () => {
  const s = E.fresh();
  assert.equal(s.teams.length, 397);
  assert.equal(s.leagues.length, 21);
  assert.equal(new Set(s.teams.map((t) => t.id)).size, 397);
  assert.equal(new Set(s.teams.map((t) => t.name)).size, 397);
  assert(s.teams.some((t) => t.name === "Real Madrid"));
  assert(s.teams.some((t) => t.name === "Flamengo"));
  const ids = s.teams.flatMap((t) =>
    [...t.players, ...t.youth].map((p) => p.id),
  );
  assert.equal(new Set(ids).size, ids.length);
  for (const t of s.teams.filter((t) => t.players.length >= 11))
    assert.equal(E.lineup(t).length, 11);
  assert(
    s.teams
      .flatMap((t) => [...t.players, ...t.youth])
      .every(
        (p) =>
          p.real &&
          p.sourceId &&
          (/^\d+$/.test(p.sourceId)
            ? p.id === "tm-" + p.sourceId
            : p.id === p.sourceId),
      ),
  );
});
test("calendários nacionais cobrem ida/volta e turnos únicos sem folgas duplicadas", () => {
  const s = E.fresh();
  for (const l of s.leagues) {
    const seen = new Map();
    for (const round of l.fixtures) {
      const clubs = new Set();
      for (const pair of round) {
        assert.notEqual(pair[0], pair[1]);
        for (const id of pair) {
          assert(!clubs.has(id));
          clubs.add(id);
        }
        const key = [...pair].sort().join("|");
        seen.set(key, (seen.get(key) || 0) + 1);
      }
      assert.equal(clubs.size, l.ids.length - (l.ids.length % 2));
    }
    assert.equal(seen.size, (l.ids.length * (l.ids.length - 1)) / 2);
    assert([...seen.values()].every((n) => n === (l.single ? 1 : 2)));
  }
  const odd = E.fixtures(["a", "b", "c"]);
  assert.equal(odd.length, 6);
  assert(odd.every((r) => r.length === 1));
  assert.equal(E.calendar().length, 51);
});
test("classificação inicial continental não duplica equipes entre torneios", () => {
  const s = E.fresh();
  assert.deepEqual(
    s.cups.map((c) => c.entrants.length),
    [36, 36, 36, 32],
  );
  const eu = s.cups.filter((c) => c.region === "eu").flatMap((c) => c.entrants);
  assert.equal(new Set(eu).size, 108);
  for (const c of s.cups) {
    const counts = new Map();
    for (const round of c.stageFixtures) {
      assert.equal(new Set(round.flat()).size, c.entrants.length);
      round.flat().forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
    }
    assert([...counts.values()].every((n) => n === c.stageGames));
  }
});
test("compras recusadas preservam caixa e elenco; compra aceita transfere registro e contrato", () => {
  const s = career(),
    from = E.team(s, "en-5"),
    p = [...from.players].sort((a, b) => a.price - b.price)[0],
    buyer = E.team(s);
  buyer.money = 1000000000;
  buyer.finance.transferBudget = 500000000;
  buyer.finance.wageBudget = E.finance.payroll(buyer) + p.salary * 3;
  const before = JSON.stringify(s);
  assert.throws(() => E.buy(s, p.id, 0, p.salary * 2, 3), /recusada/);
  assert.equal(JSON.stringify(s), before);
  assert.throws(() => E.buy(s, p.id, NaN, p.salary * 2, 3), /inválido/);
  const fee = E.minFee(s, p),
    salary = p.salary * 2,
    oldMoney = buyer.money,
    oldSeller = from.money;
  E.buy(s, p.id, fee, salary, 3);
  assert(buyer.players.includes(p));
  assert(!from.players.includes(p));
  assert.equal(buyer.money, oldMoney - fee - salary * 4);
  assert.equal(from.money, oldSeller + fee);
  assert.equal(p.contract, s.season + 3);
  assert.equal(s.transfers.length, 1);
});
test("venda paga e troca de clube; janelas fechadas bloqueiam negociações", () => {
  const s = career(),
    t = E.team(s),
    p = t.players[0],
    offer = E.saleOffer(s, p.id),
    cash = t.money;
  E.sell(s, p.id, offer.buyerId, offer.fee);
  assert.equal(t.money, cash + offer.fee);
  assert(E.team(s, offer.buyerId).players.includes(p));
  s.day = E.calendar().findIndex((d) => d.kind === "league" && d.round === 10);
  s.today = E.calendar()[s.day].offset;
  const another = E.team(s, "en-2").players[0];
  assert(!E.windowOpen(s));
  assert.throws(
    () => E.buy(s, another.id, another.price, another.salary * 2, 2),
    /fechada/,
  );
  assert.throws(() => E.sell(s, t.players[0].id, "en-2", 100), /fechada/);
});
test("renovação exige aumento e luvas; promoção e instalações descontam valores corretos", () => {
  const s = career("br-7"),
    t = E.team(s),
    p = t.players[0],
    year = p.contract,
    cash = t.money;
  assert.throws(() => E.renew(s, p.id, 2, p.salary), /aumento/);
  const salary = p.salary * 2;
  E.renew(s, p.id, 2, salary);
  assert.equal(p.contract, year + 2);
  assert.equal(t.money, cash - salary * 4);
  const youth = t.youth[0],
    count = t.players.length;
  E.promote(s, youth.id);
  assert.equal(t.players.length, count + 1);
  assert.equal(youth.contract, s.season + 3);
  assert(!t.youth.includes(youth));
  const before = t.money;
  E.upgrade(s, "facility");
  assert.equal(t.facility, 2);
  assert.equal(t.money, before - 1500000);
});
test("escalação manual respeita posições, evita duplicações e exclui lesionados", () => {
  const s = career(),
    t = E.team(s),
    z = t.players.find((p) => p.pos === "ZAG");
  t.lineup[2] = z.id;
  t.lineup[3] = z.id;
  const ps = E.lineup(t);
  assert.equal(new Set(ps.map((p) => p.id)).size, 11);
  assert.equal(ps[2].id, z.id);
  z.injury = 2;
  assert(!E.lineup(t).includes(z));
});
test("partida interrompida sobrevive a serialização; resultado não avança duas vezes", () => {
  const s = career();
  let m = E.makeMatch(s, "2d");
  const random = rng(4);
  for (let i = 0; i < 30; i++) E.minute(s, m, random);
  const loaded = JSON.parse(JSON.stringify(s));
  assert.equal(loaded.live.minute, 30);
  assert.equal(loaded.live.mode, "2d");
  assert.throws(() => E.advance(loaded, random), /Conclua/);
  while (loaded.live.minute < 90) E.minute(loaded, loaded.live, random);
  E.advance(loaded, random);
  assert.equal(loaded.day, 1);
  assert.equal(loaded.live.done, true);
  const row = E.league(loaded, "br").table.find((r) => r.id === loaded.clubId);
  const games = row.w + row.d + row.l;
  E.advance(loaded, random);
  assert.equal(row.w + row.d + row.l, games);
  assert.equal(loaded.today, 2);
});
test("temporada completa: ligas, grupos, playoffs, campeões e propostas de treinador", () => {
  const s = season(career("en-0"));
  assert.equal(s.day, 51);
  for (const l of s.leagues) {
    assert(
      l.table.every(
        (t) => t.w + t.d + t.l === (l.ids.length - 1) * (l.single ? 1 : 2),
      ),
    );
    assert.equal(
      l.table.reduce((a, t) => a + t.gf, 0),
      l.table.reduce((a, t) => a + t.ga, 0),
    );
    assert.equal(l.ranking[0], E.rank(l.table)[0].id);
  }
  for (const c of s.cups) {
    assert(c.champion);
    assert(c.entrants.includes(c.champion));
    assert(c.table.every((t) => t.w + t.d + t.l === c.stageGames));
    assert.equal(c.rounds.at(-1).results.length, 1);
    assert.equal(c.rounds.at(-1).results[0].winner, c.champion);
    for (const r of c.rounds) {
      assert.equal(r.pairs.length, r.results.length);
      assert(r.results.every((x) => x.winner));
    }
  }
  assert.equal(s.offers.length, 5);
  assert(s.coachMoves.length > 0);
  const active = s.coaches.filter((c) => c.clubId);
  assert.equal(new Set(active.map((c) => c.clubId)).size, 397);
  assert.equal(active.length, 397);
  const L = require("../vendor/lz-string.js"),
    raw = JSON.stringify(s),
    packed = L.compressToUTF16(raw);
  assert(packed.length < 1500000);
  assert.equal(L.decompressFromUTF16(packed), raw);
  assert(
    s.teams.every(
      (t) =>
        t.money ===
        t.finance.openingBalance +
          t.finance.ledger.reduce((n, r) => n + r.amount, 0),
    ),
  );
});
test("nova temporada classifica por resultados, expira contratos e mantém patrimônio ao trocar de clube", () => {
  const s = season(career()),
    old = E.team(s),
    offer = s.offers[0],
    destination = E.team(s, offer.clubId),
    cash = destination.money,
    roster = destination.players;
  const ranking = s.leagues
    .filter((l) => l.region === "eu")
    .map((l) => l.ranking[0]);
  E.changeClub(s, offer.clubId);
  assert.equal(s.clubId, destination.id);
  assert.equal(E.team(s).money, cash);
  assert.equal(E.team(s).players, roster);
  assert.notEqual(old.manager, "you");
  const expiring = destination.players[0];
  expiring.contract = s.season;
  E.nextSeason(s);
  assert.equal(s.season, E.ROSTERS.initialSeason + 1);
  assert.equal(s.day, 0);
  assert(s.freeAgents.some((p) => p.id === expiring.id));
  assert(!destination.players.some((p) => p.id === expiring.id));
  assert.equal(s.offers.length, 0);
  assert(ranking.every((id) => s.cups[0].entrants.includes(id)));
  assert(s.leagues.every((l) => l.table.every((t) => t.p === 0)));
  assert.equal(s.cups[0].champion, null);
});
test("migração v1 arquiva dados originais e substitui gerados por elenco real", () => {
  const old = {
    club: "Porto Imperial",
    season: 2026,
    week: 5,
    money: 12345678,
    players: [
      {
        id: "legacy-one",
        name: "Atleta antigo",
        pos: "ATA",
        age: 22,
        ovr: 75,
        fitness: 90,
        price: 2000000,
      },
    ],
    youth: [],
    tactic: "Ofensivo",
    training: "Intensivo",
  };
  const s = E.migrate(old);
  assert.equal(E.team(s).name, "Fluminense");
  assert.equal(s.legacyArchive.money, old.money);
  assert(E.team(s).players.every((p) => p.real));
  assert(!E.team(s).players.some((p) => p.id === "legacy-one"));
  assert.equal(E.dayInfo(s).round, 4);
  assert.equal(s.tactic, "Ofensivo");
  assert.equal(s.live, null);
  assert.equal(s.season, 2026);
});
test("referência histórica contém 2.984 confrontos com datas e IDs válidos", () => {
  const s = E.fresh();
  const refs = E.REFERENCES;
  assert.equal(
    Object.values(refs).reduce((n, d) => n + d.matches.length, 0),
    2984,
  );
  for (const [id, data] of Object.entries(refs)) {
    const l = E.league(s, id);
    for (const m of data.matches) {
      assert(/^\d{4}-\d{2}-\d{2}$/.test(m.date));
      assert(m.pair.every((id) => l.ids.includes(id)));
      assert.notEqual(m.pair[0], m.pair[1]);
    }
  }
  const opener = refs.en.matches.find(
    (m) => m.pair[0] === "en-2" && m.pair[1] === "en-11",
  );
  assert.equal(opener.date, "2025-08-15");
  assert.equal(E.league(s, "br").referenceCompatible, false);
  assert.notEqual(
    JSON.stringify(E.league(s, "br").fixtures),
    JSON.stringify(refs.br.rounds),
  );
});
test("fase de liga europeia tem adversários distintos e mandos equilibrados", () => {
  const s = E.fresh();
  for (const c of s.cups.filter((c) => c.region === "eu")) {
    for (const id of c.entrants) {
      const games = c.stageFixtures.flat().filter((p) => p.includes(id));
      assert.equal(games.length, c.stageGames);
      assert.equal(games.filter((p) => p[0] === id).length, c.stageGames / 2);
      assert.equal(
        new Set(games.map((p) => p.find((x) => x !== id))).size,
        c.stageGames,
      );
    }
  }
});
