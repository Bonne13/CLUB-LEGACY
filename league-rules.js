"use strict";
(function (root) {
  const DATA =
    typeof module !== "undefined"
      ? require("./league-rules-data.js")
      : root.LegacyLeagueRulesData;
  const catalog = new Map(DATA.leagues.map((l) => [l.id, l]));
  const labels = {
    points: "Pontos",
    wins: "Vitórias",
    goalDifference: "Saldo de gols",
    goalsFor: "Gols marcados",
    headPoints: "Pontos no confronto direto",
    headDifference: "Saldo no confronto direto",
    headAwayGoals: "Gols fora no confronto direto",
    redCards: "Menos cartões vermelhos",
    yellowCards: "Menos cartões amarelos",
    fairPlay: "Disciplina / fair play",
    awayGoals: "Gols fora de casa",
    goalsAgainst: "Menos gols sofridos",
    awayAgainst: "Menos gols sofridos fora",
    awayWins: "Vitórias fora de casa",
    awayDifference: "Saldo fora de casa",
    homeDifference: "Saldo em casa",
    homeGoals: "Gols em casa",
    lessLostPoints: "Menos pontos perdidos",
  };
  const get = (id) =>
    catalog.get(id) || {
      criteria: ["points", "goalDifference", "goalsFor"],
      substitutions: 5,
      opportunities: 3,
      bench: 9,
      winPoints: 3,
      drawPoints: 1,
    };
  function head(group, l) {
    const ids = new Set(group.map((r) => r.id)),
      matches = (l.results || []).filter((m) =>
        m.pair.every((id) => ids.has(id)),
      ),
      expected = (l.fixtures || [])
        .flat()
        .filter((pair) => pair.every((id) => ids.has(id)));
    if (!expected.length || matches.length !== expected.length) return null;
    const expectedPairs = new Map();
    for (const pair of expected) {
      const key = pair.join("|");
      expectedPairs.set(key, (expectedPairs.get(key) || 0) + 1);
    }
    for (const m of matches) {
      const key = m.pair.join("|");
      if (!expectedPairs.get(key)) return null;
      expectedPairs.set(key, expectedPairs.get(key) - 1);
    }
    const rows = new Map(
      group.map((r) => [r.id, { points: 0, goalDifference: 0, awayGoals: 0 }]),
    );
    for (const m of matches) {
      const [a, b] = m.pair.map((id) => rows.get(id)),
        [x, y] = m.goals;
      a.goalDifference += x - y;
      b.goalDifference += y - x;
      b.awayGoals += y;
      if (x === y) {
        a.points++;
        b.points++;
      } else (x > y ? a : b).points += 3;
    }
    return rows;
  }
  function rank(table, l) {
    const rules = get(l.id),
      criteria = rules.criteria;
    function sorted(group, index = 0) {
      if (group.length < 2) return group;
      if (index >= criteria.length)
        return [...group].sort((a, b) => a.id.localeCompare(b.id));
      const key = criteria[index];
      let mini = null;
      if (key.startsWith("head")) {
        if (l.id === "br" && group.length !== 2)
          return sorted(group, index + 1);
        mini = head(group, l);
        if (!mini) return sorted(group, index + 1);
      }
      const metric = (r) => {
        switch (key) {
          case "points":
            return r.p;
          case "wins":
            return r.w;
          case "goalDifference":
            return r.gf - r.ga;
          case "goalsFor":
            return r.gf;
          case "goalsAgainst":
            return -r.ga;
          case "lessLostPoints":
            return r.p - (r.w + r.d + r.l) * 3;
          case "headPoints":
            return mini.get(r.id).points;
          case "headDifference":
            return mini.get(r.id).goalDifference;
          case "headAwayGoals":
            return mini.get(r.id).awayGoals;
          case "redCards":
            return -(r.redCards || 0);
          case "yellowCards":
            return -(r.yellowCards || 0);
          case "fairPlay":
            return -((r.yellowCards || 0) + (r.redCards || 0) * 3);
          case "awayGoals":
            return r.awayGoals || 0;
          case "awayAgainst":
            return -(r.awayAgainst || 0);
          case "awayWins":
            return r.awayWins || 0;
          case "awayDifference":
            return (r.awayGoals || 0) - (r.awayAgainst || 0);
          case "homeGoals":
            return r.gf - (r.awayGoals || 0);
          case "homeDifference":
            return r.gf - r.ga - (r.awayGoals || 0) + (r.awayAgainst || 0);
          default:
            return 0;
        }
      };
      if (key === "fairPlay") return sorted(group, index + 1);
      if (["redCards", "yellowCards"].includes(key) && !l.disciplineComplete)
        return sorted(group, index + 1);
      if (
        [
          "awayGoals",
          "awayAgainst",
          "awayWins",
          "awayDifference",
          "homeGoals",
          "homeDifference",
        ].includes(key) &&
        group.some((r) => r.awayGoals === undefined)
      )
        return sorted(group, index + 1);
      const buckets = new Map();
      for (const row of group) {
        const n = metric(row);
        if (!buckets.has(n)) buckets.set(n, []);
        buckets.get(n).push(row);
      }
      const firstHead = criteria.findIndex((c) => c.startsWith("head"));
      return [...buckets.keys()]
        .sort((a, b) => b - a)
        .flatMap((n) => {
          const rows = buckets.get(n),
            restart =
              l.id === "es" &&
              mini &&
              rows.length < group.length &&
              rows.length > 1;
          return sorted(rows, restart ? firstHead : index + 1);
        });
    }
    return sorted([...table]);
  }
  function substitutionInfo(m, side) {
    const rule = get(m.kind === "league" ? m.competition : null),
      changes = (m.substitutions || []).filter((c) => c.side === side);
    const windows = new Set(
      changes
        .filter(
          (c) => !c.halftime && !(c.halftime === undefined && c.minute === 45),
        )
        .map((c) => c.minute),
    );
    const halftime = m.minute === 45 && !m.secondHalfStarted;
    return {
      used: changes.length,
      limit: rule.substitutions,
      windows: windows.size,
      windowLimit: rule.opportunities,
      halftime,
      sameWindow: windows.has(m.minute),
    };
  }
  function record(l, m) {
    l.results ??= [];
    l.results.push({ pair: [...m.pair], goals: [...m.goals] });
    const a = l.table.find((r) => r.id === m.pair[0]),
      b = l.table.find((r) => r.id === m.pair[1]);
    for (const row of [a, b]) {
      row.awayGoals ??= 0;
      row.awayAgainst ??= 0;
      row.awayWins ??= 0;
      row.yellowCards ??= 0;
      row.redCards ??= 0;
    }
    b.awayGoals += m.goals[1];
    b.awayAgainst += m.goals[0];
    if (m.goals[1] > m.goals[0]) b.awayWins++;
    for (const card of m.discipline?.cards || []) {
      const row = card.side ? b : a;
      if (card.type !== "red") row.yellowCards++;
      if (card.type !== "yellow") row.redCards++;
    }
  }
  const api = { DATA, get, labels, rank, head, substitutionInfo, record };
  root.LegacyLeagueRules = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
