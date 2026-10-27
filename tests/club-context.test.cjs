"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const E = require("../engine"),
  S = require("../saves"),
  R = require("../rosters"),
  L = require("../league-rules");
function career(regional = false, id = "es-1") {
  const s = E.fresh();
  E.start(
    s,
    id,
    { name: "Marina Costa", age: 35, nationality: "Brazil" },
    "test",
    regional ? { calendar: "regional" } : {},
  );
  return s;
}
test("Barcelona tem três goleiros profissionais reais e dois jovens, sem duplicar identidades", () => {
  const s = career(),
    t = E.team(s),
    goalies = t.players.filter((p) => p.pos === "GOL");
  for (const name of ["Joan García", "Wojciech Szczesny", "Dominik Livakovic"])
    assert(
      goalies.some((p) => p.name === name),
      name,
    );
  assert.deepEqual(
    t.youth.filter((p) => p.pos === "GOL").map((p) => p.name),
    ["Iker Rodríguez", "Eder Aller"],
  );
  const players = s.teams.flatMap((t) => [...t.players, ...t.youth]);
  assert.equal(new Set(players.map((p) => p.id)).size, players.length);
  assert(players.every((p) => p.real && p.sourceId));
  assert(E.tactics.bench(t).some((p) => p.pos === "GOL"));
  assert.equal(t.players.find((p) => p.name === "Raphinha").shirtNumber, 11);
  S.validate(s);
});
test("save anterior recupera goleiros uma só vez sem desfazer vendas, transferências e numeração personalizada", () => {
  const s = career(),
    t = E.team(s),
    supplements = new Set(
      R.SUPPLEMENTS.clubs.flatMap((c) =>
        c.players.map((row) =>
          /^\d+$/.test(row[0]) ? "tm-" + row[0] : row[0],
        ),
      ),
    );
  const moved = t.players.find((p) => p.name === "Wojciech Szczesny"),
    destination = E.team(s, "en-0");
  for (const club of s.teams) {
    club.players = club.players.filter((p) => !supplements.has(p.id));
    club.youth = club.youth.filter((p) => !supplements.has(p.id));
    club.lineup = club.lineup.map((id) => (supplements.has(id) ? "" : id));
  }
  moved.shirtNumber = 99;
  destination.players.push(moved);
  destination.players
    .filter((p) => p !== moved && p.shirtNumber === 99)
    .forEach((p) => (p.shirtNumber = 98));
  const raph = t.players.find((p) => p.name === "Raphinha");
  E.setShirtNumber(s, raph.id, 90);
  delete s.rosterSupplementRevision;
  const cash = t.money,
    lineup = [...t.lineup];
  E.prepareCareer(s);
  assert(!t.players.some((p) => p.id === moved.id));
  assert(destination.players.some((p) => p.id === moved.id));
  assert(t.players.some((p) => p.name === "Dominik Livakovic"));
  assert.equal(t.money, cash);
  assert.equal(raph.shirtNumber, 90);
  assert.deepEqual(t.lineup, lineup);
  const count = s.teams.flatMap((t) => [...t.players, ...t.youth]).length;
  E.prepareCareer(s);
  assert.equal(
    s.teams.flatMap((t) => [...t.players, ...t.youth]).length,
    count,
  );
  S.validate(s);
});
test("carreiras em anos posteriores não recebem jogadores de uma lista antiga", () => {
  const s = career(),
    t = E.team(s);
  const removed = t.players.find((p) => p.name === "Dominik Livakovic");
  t.players = t.players.filter((p) => p !== removed);
  t.lineup = t.lineup.map((id) => (id === removed.id ? "" : id));
  delete s.rosterSupplementRevision;
  s.season++;
  E.prepareCareer(s);
  assert(!t.players.some((p) => p.id === removed.id));
});
test("cada um dos 397 clubes tem estádio com referência e perfis de estrutura por porte", () => {
  const s = career(),
    b = E.team(s),
    small = s.teams.find((t) => t.facility === 1);
  assert.equal(E.facilities.DATA.clubs.length, 397);
  for (const t of s.teams) {
    assert(t.infrastructure.venue.url, t.name);
    assert(t.infrastructure.venue.name !== "Estádio a confirmar", t.name);
    E.facilities.validate(t);
  }
  assert.equal(b.infrastructure.venue.name, "Spotify Camp Nou");
  assert.equal(b.infrastructure.trainingName, "Ciutat Esportiva Joan Gamper");
  assert(small);
  assert(b.facility > small.facility);
  assert(
    E.facilities.quote(s, b, "medical").cost >
      E.facilities.quote(s, small, "medical").cost,
  );
});
test("obra paga uma vez, conclui ao avançar o calendário e só então ativa o benefício", () => {
  const s = career(true),
    t = E.team(s),
    before = t.money,
    level = E.facilities.level(t, "medical"),
    q = E.facilities.quote(s, t, "medical");
  const p = E.upgrade(s, "medical");
  assert.equal(t.money, before - q.cost);
  assert.equal(E.facilities.level(t, "medical"), level);
  assert.throws(() => E.upgrade(s, "medical"), /andamento/);
  const beforeRecovery = E.facilities.recoveryLevel(t);
  const result = E.simulate(s, q.days, "days", () => 0.99);
  assert.equal(result.advanced, q.days);
  assert.equal(p.status, "completed");
  assert.equal(E.facilities.level(t, "medical"), level + 1);
  assert(E.facilities.recoveryLevel(t) > beforeRecovery);
  assert.equal(
    t.finance.ledger.filter((r) => r.description.includes("Início da obra"))
      .length,
    1,
  );
  const after = t.money;
  E.facilities.tick(s, t);
  assert.equal(t.money, after);
  assert.equal(t.infrastructure.history.length, 1);
  const restored = S.parse(S.serialize(s));
  assert.equal(E.facilities.level(E.team(restored), "medical"), level + 1);
});
test("cancelamento restitui apenas parte da obra não executada e não pode ser repetido", () => {
  const s = career(true),
    t = E.team(s),
    before = t.money,
    p = E.upgrade(s, "commercial");
  s.today = Math.floor(p.days / 2);
  const expected = E.facilities.refund(s, p),
    refund = E.cancelUpgrade(s, p.id);
  assert.equal(refund, expected);
  assert(refund < p.cost * 0.8);
  assert.equal(t.money, before - p.cost + refund);
  assert.throws(() => E.cancelUpgrade(s, p.id), /indisponível/);
  assert.equal(E.facilities.level(t, "commercial"), 4);
  S.validate(s);
});
test("obras atravessam viradas de temporada com datas absolutas e preservam melhorias antigas", () => {
  const s = career(true),
    t = E.team(s);
  s.today = 350;
  const p = E.upgrade(s, "medical");
  s.season++;
  s.today = 0;
  E.facilities.tick(s, t);
  assert.equal(p.status, "building");
  s.today = 50;
  E.facilities.tick(s, t);
  assert.equal(p.status, "completed");
  const other = E.team(s, "br-7");
  const base = E.facilities.profile(other).facility;
  delete other.infrastructure;
  other.facility = 2;
  E.facilities.ensure(other, s);
  assert.equal(other.facility, Math.min(5, base + 1));
});
function row(id, p, w, gf, ga) {
  return { id, p, w, d: 0, l: 0, gf, ga };
}
test("LaLiga usa confronto direto completo antes do saldo e não aplica resultados parciais", () => {
  const rows = [row("a", 10, 3, 20, 0), row("b", 10, 3, 3, 2)],
    l = {
      id: "es",
      table: rows,
      fixtures: [[["a", "b"]], [["b", "a"]]],
      results: [
        { pair: ["a", "b"], goals: [0, 1] },
        { pair: ["b", "a"], goals: [1, 0] },
      ],
    };
  assert.equal(L.rank(rows, l)[0].id, "b");
  l.results.pop();
  assert.equal(L.rank(rows, l)[0].id, "a");
  assert.deepEqual(
    rows.map((r) => r.id),
    ["a", "b"],
  );
});
test("grupos de três empatados têm ordem transitiva e critérios distintos no Brasil e na Inglaterra", () => {
  const rows = [
    row("a", 12, 4, 5, 2),
    row("b", 12, 3, 20, 1),
    row("c", 12, 2, 2, 1),
  ];
  assert.equal(L.rank(rows, { id: "br" })[0].id, "a");
  assert.equal(L.rank(rows, { id: "en" })[0].id, "b");
  const fixtures = [
      [
        ["a", "b"],
        ["b", "c"],
        ["c", "a"],
      ],
      [
        ["b", "a"],
        ["c", "b"],
        ["a", "c"],
      ],
    ],
    results = fixtures.flat().map((pair) => ({
      pair,
      goals: pair.includes("a") ? (pair[0] === "a" ? [2, 0] : [0, 2]) : [1, 1],
    }));
  const l = { id: "es", fixtures, results };
  assert.equal(L.rank(rows, l)[0].id, "a");
  assert.equal(L.rank([...rows].reverse(), l)[0].id, "a");
});
test("substituições respeitam três oportunidades e preservam as trocas gratuitas do intervalo", () => {
  const s = career(),
    m = E.makeMatch(s, "2d"),
    side = m.pair.indexOf(s.clubId),
    plan = m.plans[side];
  let index = 0;
  const swap = () => {
    const out = plan.starters[6 + (index % 5)];
    const incoming = plan.bench.find(
      (id) =>
        !plan.starters.some((p) => p.id === id) &&
        !m.substitutions.some((c) => c.outId === id),
    );
    index++;
    return E.substitute(s, out.id, incoming);
  };
  for (const minute of [10, 20, 30]) {
    m.minute = minute;
    swap();
  }
  m.minute = 40;
  assert.throws(swap, /três oportunidades/);
  assert.equal(m.substitutions.length, 3);
  m.minute = 45;
  swap();
  swap();
  assert.equal(m.substitutions.length, 5);
  assert.equal(L.substitutionInfo(m, side).windows, 3);
  m.minute = 46;
  assert.throws(swap, /cinco substituições/);
});
test("várias trocas na mesma parada consomem apenas uma oportunidade", () => {
  const s = career(),
    m = E.makeMatch(s, "2d"),
    side = m.pair.indexOf(s.clubId),
    plan = m.plans[side];
  m.minute = 12;
  E.substitute(s, plan.starters[7].id, plan.bench[0]);
  E.substitute(s, plan.starters[8].id, plan.bench[1]);
  assert.equal(L.substitutionInfo(m, side).used, 2);
  assert.equal(L.substitutionInfo(m, side).windows, 1);
});
test("save rejeita projetos inválidos, resultados repetidos e placares negativos", () => {
  const s = career(),
    t = E.team(s),
    p = E.upgrade(s, "medical");
  p.dueAt = p.startAt;
  assert.throws(() => S.validate(s));
  p.dueAt = p.startAt + 100000;
  const l = E.league(s, "es"),
    match = { pair: l.fixtures[0][0], goals: [1, 0] };
  l.results = [match, match];
  assert.throws(() => S.validate(s));
  l.results = [{ ...match, goals: [-1, 0] }];
  assert.throws(() => S.validate(s));
});

test("jovens adicionais têm nascimento e vínculo publicados e as escolhas do treinador não são substituídas", () => {
  const s = career(),
    t = E.team(s),
    before = [...t.lineup];
  for (const name of ["Jesse Bisiwu", "Jordi Pesquer", "Orian Goren"]) {
    const p = t.youth.find((p) => p.name === name);
    assert(p, name);
    assert(p.birthDate && !p.ageUnknown);
    assert(p.real && p.academyReference);
    assert(p.priceEstimated && p.ratingEstimated);
    assert(p.potential >= p.ovr);
  }
  assert(t.players.some((p) => p.name === "Roony Bardghji"));
  const restored = S.parse(S.serialize(s));
  assert.deepEqual(E.team(restored).lineup, before);
  assert.equal(E.team(restored).youth.length, t.youth.length);
});
