function seedHonours(s, E) {
  const t = E.team(s, "es-1"),
    p =
      t.players.find((p) => p.name === "Raphinha") ||
      t.players.find((p) => p.pos === "ATA"),
    g = t.players.find((p) => p.pos === "GOL");
  const stats = (p) => ({
    id: p.id,
    name: p.name,
    pos: p.pos,
    clubId: t.id,
    ...Object.fromEntries(E.performance.totalKeys.map((k) => [k, 0])),
    clubs: { [t.id]: 900 },
    minutes: 900,
    appearances: 10,
    ratedMatches: 10,
    ratingSum: 80,
    average: 8,
    eligible: true,
  });
  const award = (year, type, p) => {
    const winner = stats(p);
    winner.points = E.performance.score(s, winner, type);
    return {
      id: `${year}:${type}:world:season`,
      type,
      name: type === "ballon" ? "Bola de Ouro" : "Melhor goleiro da temporada",
      season: year,
      seasonLabel: E.seasonLabel({ ...s, season: year }),
      offset: 100,
      competition: null,
      competitionName: null,
      month: null,
      winner,
      podium: [winner],
      partial: false,
      criteriaRevision: 3,
    };
  };
  s.trophies = [
    {
      id: "2025-es-es-0",
      clubId: "es-0",
      competitionId: "es",
      name: "LaLiga",
      kind: "league",
      season: 2025,
      offset: 100,
      coachId: null,
      celebrated: true,
    },
    {
      id: "2026-champions-es-1",
      clubId: "es-1",
      competitionId: "champions",
      name: "Champions League",
      kind: "continental",
      season: 2026,
      offset: 100,
      coachId: "you",
      celebrated: true,
    },
    {
      id: "2026-preseason-es-1",
      clubId: "es-1",
      competitionId: "preseason-test",
      name: "Copa de preparação",
      kind: "preseason",
      season: 2026,
      offset: 1,
      coachId: "you",
      celebrated: true,
    },
  ];
  E.performance.ensure(s).awards = [
    award(2025, "ballon", p),
    award(2026, "keeper", g),
  ];
  return { player: p.name, keeper: g.name };
}
module.exports = { seedHonours };
