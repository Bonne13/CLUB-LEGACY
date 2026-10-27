const { test } = require("node:test"),
  assert = require("node:assert/strict");
const E = require("../engine.js"),
  S = require("../saves.js"),
  M = require("../money.js");
function career() {
  const s = E.fresh();
  E.start(
    s,
    "br-0",
    { name: "Lucas Silva", age: 35, nationality: "Brazil" },
    "test",
  );
  return s;
}
test("reais localizados aceitam agrupamento e preservam valores exatos nas apresentações", () => {
  for (const value of [0, 1000, 1000000, 123456789, -38000])
    assert.equal(M.parse(M.full(value)), value);
  assert.equal(M.parse("R$ 1.250.000"), 1250000);
  assert.equal(M.parse("1.234,50"), 1234.5);
  assert.equal(M.compact(1250000), "R$ 1,25 mi");
  assert.equal(M.compact(1250000000), "R$ 1,25 bi");
  assert(Number.isNaN(M.parse("")));
  assert(Number.isNaN(M.parse("2e9")));
  assert(Number.isNaN(M.parse("1; alert(1)")));
});
test("olheiros combinam idade, nível, perfil, liga e salário; missão detalhada cobra uma vez e respeita o prazo da rede do clube", () => {
  const s = career(),
    club = E.team(s);
  E.addTestFunds(s, 1000000000);
  club.finance.wageBudget = E.finance.payroll(club) + 10000000;
  const before = club.money,
    m = E.scouting.start(s, {
      scope: "market",
      depth: "deep",
      profile: "potential",
      position: "ATA",
      minAge: 18,
      maxAge: 25,
      minOverall: 65,
      maxFee: club.finance.transferBudget,
      maxSalary: 5000000,
      region: "eu",
      league: "all",
    });
  assert.equal(club.money, before - 20000);
  assert(m.due >= s.today + 6 && m.due <= s.today + 7);
  s.today = m.due - 1;
  assert.equal(E.scouting.process(s).length, 0);
  s.today = m.due;
  const report = E.scouting.process(s)[0];
  assert(report);
  assert(report.players.length > 0);
  assert.equal(E.scouting.process(s).length, 0);
  assert.equal(club.money, before - 20000);
  for (const item of report.players) {
    const t = E.team(s, item.clubId),
      p = t.players.find((p) => p.id === item.playerId);
    assert(p.age >= 18 && p.age <= 25 && p.ovr >= 65);
    assert.equal(E.league(s, t.leagueId).region, "eu");
    assert(E.tactics.positionMatches(p, "ATA"));
    assert(item.observedSalary <= 5000000);
    assert(item.confidence >= 45 && item.confidence <= 99);
    assert(item.affordable);
  }
  assert.throws(() => E.scouting.start(s, { scope: "youth", maxAge: 40 }));
});
test("jogador livre não é recomendado sem caixa para luvas; lista de observação persiste sem custo", () => {
  const s = career(),
    club = E.team(s),
    origin = E.team(s, "es-1"),
    p = origin.players.pop();
  s.freeAgents.push(p);
  club.money = 0;
  club.finance.wageBudget = E.finance.payroll(club) + 30000000;
  assert.equal(E.scouting.advice(s, p).affordable, false);
  const target = E.team(s, "es-1").players[0],
    money = club.money;
  assert(E.scouting.toggleShortlist(s, target.id));
  assert.equal(club.money, money);
  const re = S.parse(S.serialize(s));
  assert(re.scouting.shortlist.includes(target.id));
  assert.equal(E.scouting.toggleShortlist(s, target.id), false);
});
test("foco individual melhora fundamentos após dias reais e não produz progresso durante descanso, lesão ou partida", () => {
  const s = career(),
    t = E.team(s),
    p = t.players[0],
    TR = E.training;
  TR.setFocus(s, p.id, "finishing");
  const skill = E.tactics.skills(p).finishingBonus;
  const session = { key: "technical", focus: "balanced" };
  let improved = 0;
  for (let i = 0; i < 50; i++)
    if (TR.process(s, t, p, { minutes: 0, plan: "normal" }, session)?.improved)
      improved++;
  assert(improved > 0);
  assert(E.tactics.skills(p).finishingBonus > skill);
  const before = JSON.stringify(p.trainingXP);
  assert.equal(
    TR.process(s, t, p, { minutes: 0, plan: "rest" }, session),
    null,
  );
  assert.equal(
    TR.process(s, t, p, { minutes: 90, plan: "match" }, session),
    null,
  );
  p.injury = 3;
  assert.equal(
    TR.process(s, t, p, { minutes: 0, plan: "normal" }, session),
    null,
  );
  assert.equal(JSON.stringify(p.trainingXP), before);
  p.injury = 0;
  assert.throws(() => TR.setFocus(s, p.id, "inventado"));
  TR.setDay(s, 0, "rest");
  assert.equal(s.trainingSchedule[0], "rest");
  assert.throws(() => TR.setDay(s, 8, "rest"));
  const re = S.parse(S.serialize(s));
  assert.equal(
    E.team(re).players.find((x) => x.id === p.id).trainingFocus,
    "finishing",
  );
});
test("agenda distingue jogo e ativação pré-jogo; histórico registra o que foi executado", () => {
  const s = career(),
    TR = E.training;
  assert.equal(TR.session(s, 0).key, "match");
  assert.equal(TR.session(s, 1).mode, "Recuperação");
  const m = E.makeMatch(s, "3d");
  while (m.minute < 90) E.minute(s, m, () => 0.99);
  E.advance(s, () => 0.99);
  s.live = null;
  assert(s.trainingHistory.length > 0);
  assert.equal(s.trainingHistory[0].key, "match");
  assert.equal(s.trainingHistory[0].trained, 0);
  const re = S.parse(S.serialize(s));
  assert(re.trainingHistory.length > 0);
});
test("partida em modo 3D e preferências são compatíveis com o save", () => {
  const s = career();
  E.makeMatch(s, "3d");
  s.matchPreferences = { speed: 900, mode: "3d", camera: "tactical" };
  const re = S.parse(S.serialize(s));
  assert.equal(re.live.mode, "3d");
  assert.equal(re.matchPreferences.camera, "tactical");
});
