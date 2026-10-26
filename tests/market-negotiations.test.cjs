const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
const S = require("../saves.js");
function career() {
  const s = E.fresh();
  E.start(s, "br-0", undefined, "test");
  E.addTestFunds(s, 1000000000);
  E.team(s).finance.wageBudget = E.finance.payroll(E.team(s)) + 5000000;
  return s;
}
function candidate(s) {
  return s.teams
    .filter((t) => t.id !== s.clubId && t.players.length > 16)
    .flatMap((t) => t.players)
    .sort((a, b) => a.price - b.price)[0];
}
function days(s, count) {
  for (let i = 0; i < count; i++) {
    const fixture = E.nextFixture(s);
    if (fixture)
      s.live = {
        ...fixture,
        day: s.day,
        offset: s.today,
        minute: 90,
        goals: [0, 0],
        shots: [0, 0],
        events: [],
        mode: "text",
      };
    E.advance(s, () => 0.99);
    s.live = null;
  }
}
function agreeClub(s, p) {
  const n = E.negotiateClub(s, p.id, Math.ceil(E.minFee(s, p) * 1.2));
  days(s, 2);
  assert.equal(n.stage, "contract-ready");
  return n;
}
function agreePlayer(s, n) {
  E.negotiatePlayer(
    s,
    n.id,
    300000,
    s.teams.flatMap((t) => t.players).find((p) => p.id === n.playerId).age >= 32
      ? 2
      : 4,
    2000000,
    "important",
  );
  days(s, 2);
  assert.equal(n.stage, "medical-pending");
}
test("mercado combina nacionalidade dupla, intervalos, posição e busca sem acentos sem usar idade desconhecida", () => {
  const player = (id, name, age, extra = {}) => ({
    id,
    name,
    age,
    ovr: 80,
    price: 100,
    nationalities: ["Brazil", "Portugal"],
    pos: "ATA",
    ...extra,
  });
  const s = {
    clubId: "own",
    teams: [
      {
        id: "own",
        leagueId: "br",
        players: [player("own", "Meu jogador", 20)],
      },
      {
        id: "other",
        leagueId: "br",
        name: "Outro",
        players: [
          player("a", "João", 22),
          player("b", "Joao", 22, { ageUnknown: true }),
          player("c", "Joao", 30, { ovr: 90 }),
        ],
      },
    ],
    freeAgents: [player("free", "João", 21)],
  };
  const raw = JSON.stringify(s);
  assert.deepEqual(
    E.marketPlayers(s, {
      query: "joao",
      nationality: "Portugal",
      ageMin: 20,
      ageMax: 24,
      overallMin: 70,
      overallMax: 85,
      position: "ATA",
      league: "br",
    }).map((p) => p.id),
    ["a"],
  );
  assert.deepEqual(
    E.marketPlayers(s, { league: "free" }).map((p) => p.id),
    ["free"],
  );
  assert.equal(E.marketPlayers(s, { sort: "age-desc" }).at(-1).id, "b");
  assert.equal(E.marketPlayers(s, { priceMax: 0 }).length, 0);
  assert.equal(E.marketPlayers(s, { ageMin: 40, ageMax: 20 }).length, 0);
  assert.equal(JSON.stringify(s), raw);
});
test("bios verificadas corrigem Messi e Vitor Roque e atualizam save sem desfazer evolução, salário ou transferência", () => {
  const s = career(),
    p = s.teams.flatMap((t) => t.players).find((p) => p.name === "Leo Messi");
  assert.equal(p.birthDate, "1987-06-24");
  assert.equal(p.age, 38);
  assert(!p.ageUnknown);
  const roque = s.teams
    .flatMap((t) => [...t.players, ...t.youth])
    .find((p) => p.name === "Vitor Roque");
  assert.equal(roque.birthDate, "2005-02-28");
  const source = s.teams.find((t) => t.players.includes(p));
  source.players.splice(source.players.indexOf(p), 1);
  E.team(s).players.push(p);
  p.birthDate = null;
  p.ageUnknown = true;
  p.age = 22;
  p.ageEstimated = true;
  p.ovr = 96;
  p.salary = 333333;
  p.contract = 2030;
  E.prepareCareer(s);
  assert.equal(p.age, 38);
  assert(!p.ageUnknown);
  assert.equal(p.ovr, 96);
  assert.equal(p.salary, 333333);
  assert.equal(p.contract, 2030);
  assert(E.team(s).players.includes(p));
});
test("transferência aguarda clube, jogador e documentação; nenhum débito ou movimento antecipado", () => {
  const s = career(),
    p = candidate(s),
    seller = s.teams.find((t) => t.players.includes(p));
  const n = E.negotiateClub(s, p.id, Math.ceil(E.minFee(s, p) * 1.2));
  assert.equal(n.stage, "club-pending");
  assert(!E.team(s).players.includes(p));
  days(s, 1);
  assert.equal(n.stage, "club-pending");
  days(s, 1);
  assert.equal(n.stage, "contract-ready");
  assert.throws(() => E.negotiateClub(s, p.id, n.fee), /andamento/);
  agreePlayer(s, n);
  assert(!E.team(s).players.includes(p));
  assert(
    !E.team(s).finance.ledger.some(
      (r) => r.category === "transfer" && r.description.includes(p.name),
    ),
  );
  days(s, 1);
  assert.equal(n.stage, "completed");
  assert(!seller.players.includes(p));
  assert(E.team(s).players.includes(p));
  assert.equal(
    E.team(s).finance.ledger.filter(
      (r) => r.category === "transfer" && r.description.includes(p.name),
    ).length,
    1,
  );
  assert.equal(
    E.team(s).finance.ledger.find(
      (r) => r.category === "signing" && r.description.includes(p.name),
    ).amount,
    -n.bonus,
  );
  days(s, 1);
  assert.equal(
    E.team(s).finance.ledger.filter(
      (r) => r.category === "transfer" && r.description.includes(p.name),
    ).length,
    1,
  );
});
test("clube contrapropõe após prazo; jogador pode recusar salário e pedir novos termos", () => {
  const s = career(),
    p = candidate(s),
    n = E.negotiateClub(s, p.id, E.minFee(s, p));
  days(s, 2);
  assert.equal(n.stage, "club-counter");
  E.counterClub(s, n.id, n.askFee);
  assert.equal(n.stage, "club-pending");
  days(s, 2);
  assert.equal(n.stage, "contract-ready");
  E.negotiatePlayer(s, n.id, p.salary, 1, 0, "rotation");
  days(s, 2);
  assert(["player-counter", "rejected"].includes(n.stage));
  if (n.stage === "player-counter") {
    E.negotiatePlayer(s, n.id, n.askSalary, n.askYears, n.askBonus, "rotation");
    days(s, 2);
    assert.equal(n.stage, "medical-pending");
  }
});
test("recusa não é instantânea e cancelar acordo não cobra valores", () => {
  const s = career(),
    p = candidate(s),
    n = E.negotiateClub(s, p.id, 0);
  assert.equal(n.stage, "club-pending");
  days(s, 2);
  assert.equal(n.stage, "rejected");
  const m = E.negotiateClub(s, p.id, E.minFee(s, p));
  const before = E.team(s).finance.ledger.length;
  E.cancelNegotiation(s, m.id);
  days(s, 2);
  assert.equal(m.stage, "cancelled");
  assert(!E.team(s).players.includes(p));
  assert(
    !E.team(s)
      .finance.ledger.slice(before)
      .some((r) => r.category === "transfer"),
  );
});
test("assinatura revalida dinheiro e orçamento e permite corrigir recursos sem cobrar duas vezes", () => {
  const s = career(),
    p = candidate(s),
    n = agreeClub(s, p);
  agreePlayer(s, n);
  const old = E.team(s).finance.transferBudget;
  E.team(s).finance.transferBudget = 0;
  days(s, 1);
  assert.equal(n.stage, "blocked");
  assert(!E.team(s).players.includes(p));
  E.team(s).finance.transferBudget = old;
  E.retryNegotiation(s, n.id);
  days(s, 1);
  assert.equal(n.stage, "completed");
});
test("proposta persiste em arquivo e resposta interrompe avanço semanal", () => {
  let s = career();
  days(s, 1);
  const p = candidate(s),
    n = E.negotiateClub(s, p.id, E.minFee(s, p));
  s = S.parse(S.serialize(s));
  const loaded = s.negotiations.find((x) => x.id === n.id);
  assert.equal(loaded.stage, "club-pending");
  const result = E.simulate(s, 1, "weeks", () => 0.99);
  assert.equal(result.advanced, 2);
  assert(result.stoppedForNegotiation);
  assert.equal(loaded.stage, "club-counter");
  const corrupt = JSON.parse(S.serialize(s));
  corrupt.career.negotiations[0].stage = "completed-now";
  assert.throws(() => S.parse(JSON.stringify(corrupt)), /inválido/);
});
test("prazo de resposta expira e fim de janela encerra acordo pendente", () => {
  const s = career(),
    p = candidate(s),
    n = agreeClub(s, p);
  days(s, 10);
  assert.equal(n.stage, "expired");
  const s2 = career(),
    p2 = candidate(s2),
    m = E.negotiateClub(s2, p2.id, E.minFee(s2, p2));
  s2.today = 50;
  s2.day = E.calendar().findIndex((d) => d.offset >= 50);
  days(s2, 1);
  assert.equal(m.stage, "expired");
});
test("proposta inválida e etapa fora de ordem não alteram o save", () => {
  const s = career(),
    p = candidate(s),
    raw = JSON.stringify(s);
  assert.throws(() => E.negotiateClub(s, p.id, -1));
  assert.equal(JSON.stringify(s), raw);
  const n = E.negotiateClub(s, p.id, E.minFee(s, p));
  const pending = JSON.stringify(s);
  assert.throws(() => E.negotiatePlayer(s, n.id, 100000, 3, 100000));
  assert.equal(JSON.stringify(s), pending);
});
test("Vini tem rendimento natural na esquerda, perde overall na direita e reduz força real da equipe", () => {
  const s = career(),
    t = E.team(s, "es-0"),
    T = E.tactics,
    v = t.players.find((p) => p.id === "tm-371998");
  const left = T.slots(t).find((s) => s.id === "lw"),
    right = T.slots(t).find((s) => s.id === "rw");
  assert.deepEqual(v.naturalPositions, ["PE"]);
  assert.equal(T.fit(v, left), 1);
  assert.equal(T.fit(v, right), 0.68);
  assert.equal(T.adaptation(v, right).label, "Fora da posição");
  assert(T.adaptation(v, right).effective < v.ovr);
  t.lineup = T.positions(t).map((p) => p?.id || "");
  T.select(t, 10, v.id);
  const original = T.ratings(t).strength;
  T.select(t, 8, v.id);
  assert(T.ratings(t).strength < original);
  const lineup = [...t.lineup];
  delete v.naturalPositions;
  E.prepareCareer(s);
  assert.deepEqual(v.naturalPositions, ["PE"]);
  assert.deepEqual(t.lineup, lineup);
});
test("lado natural, alternativa confirmada, goleiro e posição geral têm regras distintas", () => {
  const T = E.tactics,
    slots = T.formations["4-3-3"],
    left = slots.find((s) => s.id === "lb"),
    right = slots.find((s) => s.id === "rb");
  const p = {
    id: "a",
    pos: "LAT",
    ovr: 80,
    naturalPositions: ["LE"],
    secondaryPositions: ["LD"],
  };
  assert.equal(T.fit(p, left), 1);
  assert.equal(T.fit(p, right), 1);
  assert.equal(T.adaptation(p, right).label, "Habitual");
  assert.equal(T.adaptation(p, right).effective, p.ovr);
  assert.equal(T.fit(p, slots[0]), 0.25);
  delete p.naturalPositions;
  assert.equal(T.fit(p, right), 1);
  assert.equal(T.adaptation(p, right).label, "Habitual");
  delete p.secondaryPositions;
  assert.equal(T.adaptation(p, right).label, "Posição geral");
});
test("virada de temporada não conclui proposta pendente de meses atrás", () => {
  const s = career(),
    p = candidate(s),
    n = E.negotiateClub(s, p.id, E.minFee(s, p));
  s.day = E.calendar().length;
  s.today = E.calendar().at(-1).offset + 1;
  E.nextSeason(s);
  assert.equal(n.stage, "expired");
  assert(!E.team(s).players.some((x) => x.id === p.id));
});
