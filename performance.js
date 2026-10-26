"use strict";
(function (root) {
  const D =
    typeof module !== "undefined"
      ? require("./schedule.js")
      : root.LegacySchedule;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const round = (n) => Math.round(n * 100) / 100;
  const official = (f) => ["league", "group", "cup"].includes(f.kind);
  const totalKeys = [
    "appearances",
    "minutes",
    "goals",
    "assists",
    "shots",
    "onTarget",
    "saves",
    "faced",
    "conceded",
    "cleanSheets",
    "passes",
    "completedPasses",
    "keyPasses",
    "recoveries",
    "duels",
    "duelsWon",
    "ratingSum",
    "ratedMatches",
    "playerOfMatch",
    "keeperMatches",
    "keeperMinutes",
    "keeperConceded",
    "keeperCleanSheets",
    "keeperRatingSum",
    "keeperRatedMatches",
  ];
  function emptyTotals(p) {
    return {
      id: p.id,
      name: p.name,
      pos: p.pos,
      clubId: p.clubId,
      ...Object.fromEntries(totalKeys.map((k) => [k, 0])),
      clubs: {},
    };
  }
  function newSeason(s) {
    return {
      season: s.season,
      label: D.label(s),
      startedOffset: s.today || 0,
      closed: false,
      players: {},
      competitions: {},
      month: null,
      processed: {},
    };
  }
  function ensure(s) {
    if (!s.performance)
      s.performance = {
        version: 1,
        started: { season: s.season, offset: s.today || 0 },
        current: newSeason(s),
        awards: [],
        archives: [],
        matches: [],
      };
    if (s.performance.current.season !== s.season) {
      const current = s.performance.current;
      s.performance.archives.unshift({
        season: current.season,
        label: current.label,
        startedOffset: current.startedOffset,
        leaders: rank(s, "ballon").slice(0, 50),
        keepers: rank(s, "keeper").slice(0, 30),
      });
      s.performance.archives = s.performance.archives.slice(0, 5);
      s.performance.current = newSeason(s);
    }
    return s.performance;
  }
  function begin(m, fromMinute = m.minute || 0) {
    if (!m.performance)
      m.performance = {
        version: 1,
        fromMinute: Math.max(0, fromMinute),
        players: {},
        playerOfMatch: null,
        final: false,
      };
    for (let side = 0; side < m.plans.length; side++)
      for (let i = 0; i < m.plans[side].starters.length; i++) {
        const p = m.plans[side].starters[i];
        if (!m.performance.players[p.id])
          m.performance.players[p.id] = {
            id: p.id,
            name: p.name,
            pos: p.pos,
            clubId: m.pair[side],
            side,
            keeper: i === 0,
            minutes: 0,
            goals: 0,
            assists: 0,
            shots: 0,
            onTarget: 0,
            saves: 0,
            faced: 0,
            conceded: 0,
            passes: 0,
            completedPasses: 0,
            keyPasses: 0,
            recoveries: 0,
            duels: 0,
            duelsWon: 0,
          };
      }
    return m.performance;
  }
  function tick(m) {
    const data = begin(m, m.minute - 1);
    for (let side = 0; side < m.plans.length; side++) {
      const ps = m.plans[side].starters;
      for (const p of ps) data.players[p.id].minutes++;
      if (!ps.length) continue;
      if (side === m.possessionSide) {
        const candidates = m.minute % 9 === 0 ? ps.slice(0, 1) : ps.slice(1);
        if (candidates.length)
          for (let n = 0; n < 3; n++) {
            const index = (m.minute * 3 + n * 5) % candidates.length,
              p = candidates[index],
              r = data.players[p.id];
            r.passes++;
            if (
              (m.minute * 17 + index * 13 + n * 7) % 100 <
              clamp(72 + (p.ovr - 60) * 0.3, 65, 90)
            )
              r.completedPasses++;
          }
      } else if (m.minute % 2 === 0) {
        const defenders = ps.filter((p) =>
          ["ZAG", "VOL", "LAT"].includes(p.pos),
        );
        const p =
          defenders[
            (Math.floor(m.minute / 2) + side) % Math.max(1, defenders.length)
          ];
        if (p) {
          const r = data.players[p.id];
          r.duels++;
          if (m.minute % 5 !== 0) {
            r.duelsWon++;
            r.recoveries++;
          }
        }
      }
    }
  }
  function shot(
    m,
    side,
    actor,
    type,
    { goal = false, saved = false, taker = null } = {},
  ) {
    const data = begin(m),
      p = data.players[actor?.id],
      other = m.plans[1 - side];
    if (p) {
      p.shots++;
      if (goal || saved) p.onTarget++;
      if (goal) p.goals++;
    }
    let assist = null;
    if (type === "escanteio" && taker?.id !== actor?.id) assist = taker;
    else if (type === "jogada" && m.minute % 5 !== 0) {
      const candidates = m.plans[side].starters.filter(
        (x) => x.id !== actor?.id && x.pos !== "GOL",
      );
      assist =
        candidates[
          (m.minute * 7 + (actor?.id.length || 0)) %
            Math.max(1, candidates.length)
        ];
    }
    if (assist) {
      data.players[assist.id].keyPasses++;
      if (goal) data.players[assist.id].assists++;
    }
    const keeper = other.starters[0],
      g = data.players[keeper?.id];
    if (g && (goal || saved)) {
      g.faced++;
      if (saved) g.saves++;
    }
    if (goal)
      for (const opponent of other.starters)
        data.players[opponent.id].conceded++;
    m.lastShot = {
      minute: m.minute,
      side,
      playerId: actor?.id || null,
      keeperId: keeper?.id || null,
      assistId: goal ? assist?.id || null : null,
      assistName: goal ? assist?.name || null : null,
      onTarget: goal || saved,
      saved,
    };
    return m.lastShot;
  }
  function rating(p, m, final = false) {
    if (!p.minutes) return null;
    const result = m.goals[p.side] - m.goals[1 - p.side],
      played = p.minutes / 90;
    const clean =
      p.minutes >= 60 && p.conceded === 0 && m.performance?.fromMinute === 0;
    let value;
    if (p.keeper)
      value =
        6.25 +
        p.saves * 0.32 -
        p.conceded * 0.52 +
        (clean ? 0.75 : 0) +
        (p.faced >= 3 ? (p.saves / p.faced - 0.6) * 1.2 : 0) +
        Math.min(0.12, p.completedPasses * 0.006);
    else {
      const defensive = ["ZAG", "LAT", "VOL"].includes(p.pos);
      value =
        6.15 +
        p.goals * (p.pos === "ZAG" ? 1.25 : 1.05) +
        p.assists * 0.72 +
        Math.min(0.35, p.keyPasses * 0.07) +
        Math.min(0.32, p.onTarget * 0.06);
      value +=
        Math.min(0.7, p.recoveries * 0.07) + Math.min(0.22, p.duelsWon * 0.035);
      if (p.passes >= 6)
        value += clamp(
          (p.completedPasses / p.passes - 0.75) * 1.1,
          -0.35,
          0.25,
        );
      value += clean ? (defensive ? 0.55 : 0.18) : 0;
      value -= p.conceded * (defensive ? 0.17 : 0.06);
    }
    value += (result > 0 ? 0.16 : result < 0 ? -0.13 : 0.03) * played;
    if (final && p.minutes < 20 && p.goals + p.assists === 0 && p.saves < 3)
      return null;
    return Math.round(clamp(value, 1, 10) * 10) / 10;
  }
  function lines(m, final = false) {
    if (!m.performance) return [];
    return Object.values(m.performance.players)
      .filter((p) => p.minutes > 0)
      .map((p) => ({
        ...p,
        rating: rating(p, m, final),
        cleanSheet:
          p.minutes >= 60 && p.conceded === 0 && m.performance.fromMinute === 0
            ? 1
            : 0,
      }));
  }
  function best(m) {
    return (
      lines(m, true)
        .filter((p) => p.rating !== null)
        .sort(
          (a, b) =>
            b.rating - a.rating ||
            b.goals - a.goals ||
            b.assists - a.assists ||
            b.saves - a.saves ||
            b.minutes - a.minutes ||
            a.id.localeCompare(b.id),
        )[0] || null
    );
  }
  function average(p) {
    return p?.ratedMatches ? round(p.ratingSum / p.ratedMatches) : null;
  }
  function add(bucket, line, motm) {
    const p = (bucket[line.id] ??= emptyTotals(line));
    p.clubId = line.clubId;
    p.name = line.name;
    p.appearances++;
    p.minutes += line.minutes;
    for (const k of [
      "goals",
      "assists",
      "shots",
      "onTarget",
      "saves",
      "faced",
      "conceded",
      "passes",
      "completedPasses",
      "keyPasses",
      "recoveries",
      "duels",
      "duelsWon",
    ])
      p[k] += line[k];
    p.cleanSheets += line.cleanSheet;
    if (line.keeper) {
      p.keeperMatches++;
      p.keeperMinutes += line.minutes;
      p.keeperConceded += line.conceded;
      p.keeperCleanSheets += line.cleanSheet;
      if (line.rating !== null) {
        p.keeperRatingSum = round(p.keeperRatingSum + line.rating);
        p.keeperRatedMatches++;
      }
    }
    if (line.rating !== null) {
      p.ratingSum = round(p.ratingSum + line.rating);
      p.ratedMatches++;
    }
    if (line.id === motm?.id) p.playerOfMatch++;
    p.clubs[line.clubId] = (p.clubs[line.clubId] || 0) + line.minutes;
  }
  const titleWeight = {
    champions: 40,
    libertadores: 35,
    europa: 25,
    conference: 18,
  };
  function titleCredits(s, competition = null) {
    const current = s.performance?.current,
      credits = {};
    if (!current) return credits;
    for (const t of s.trophies || []) {
      if (
        t.season !== current.season ||
        t.kind === "preseason" ||
        (competition && competition !== t.competitionId)
      )
        continue;
      const players = Object.values(
        current.competitions[t.competitionId]?.players || {},
      );
      let most = 90;
      for (const p of players) most = Math.max(most, p.clubs[t.clubId] || 0);
      for (const p of players) {
        const minutes = p.clubs[t.clubId] || 0;
        if (minutes)
          credits[p.id] =
            (credits[p.id] || 0) +
            (titleWeight[t.competitionId] || 30) *
              Math.min(1, minutes / Math.max(180, most * 0.35));
      }
    }
    return credits;
  }
  function titles(s, p, competition = null) {
    return round(titleCredits(s, competition)[p.id] || 0);
  }
  function score(s, p, kind = "ballon", competition = null, credits = null) {
    const avg =
        (kind === "keeper"
          ? p.keeperRatedMatches
            ? round(p.keeperRatingSum / p.keeperRatedMatches)
            : 0
          : average(p)) || 0,
      performance = round(Math.max(0, avg - 5) * 30);
    const production =
      kind === "keeper" ? 0 : round(p.goals * 2.2 + p.assists * 1.6);
    const consistency = round(
      Math.min(30, (p.minutes / 90) * 0.65) +
        Math.min(30, p.playerOfMatch * 1.5),
    );
    const team =
      kind === "month"
        ? 0
        : round(credits ? credits[p.id] || 0 : titles(s, p, competition));
    const goalkeeping =
      kind === "keeper"
        ? round(
            p.saves * 0.16 +
              p.keeperCleanSheets * 2.6 +
              (p.faced ? (p.saves / p.faced) * 35 : 0) -
              (p.keeperMinutes
                ? (p.keeperConceded / (p.keeperMinutes / 90)) * 2
                : 0),
          )
        : 0;
    return {
      total: Math.max(
        0,
        round(performance + production + consistency + team + goalkeeping),
      ),
      performance,
      production,
      consistency,
      titles: team,
      goalkeeping,
    };
  }
  function rank(
    s,
    kind = "ballon",
    competition = null,
    { eligibleOnly = false } = {},
  ) {
    const current = s.performance?.current;
    if (!current) return [];
    const bucket =
      kind === "month"
        ? current.month?.competitions[competition]?.players
        : competition
          ? current.competitions[competition]?.players
          : current.players;
    const credits = kind === "month" ? {} : titleCredits(s, competition);
    const minMatches = kind === "month" ? 2 : competition ? 3 : 10,
      minMinutes = kind === "month" ? 120 : competition ? 180 : 900;
    return Object.values(bucket || {})
      .filter((p) => kind !== "keeper" || p.pos === "GOL")
      .map((p) => ({
        ...p,
        average:
          kind === "keeper"
            ? p.keeperRatedMatches
              ? round(p.keeperRatingSum / p.keeperRatedMatches)
              : null
            : average(p),
        eligible:
          kind === "keeper"
            ? p.keeperMatches >= minMatches &&
              p.keeperMinutes >= minMinutes &&
              p.keeperRatedMatches >= minMatches
            : p.appearances >= minMatches &&
              p.minutes >= minMinutes &&
              p.ratedMatches >= minMatches,
        points: score(s, p, kind, competition, credits),
      }))
      .filter((p) => !eligibleOnly || p.eligible)
      .sort(
        (a, b) =>
          Number(b.eligible) - Number(a.eligible) ||
          b.points.total - a.points.total ||
          (b.average || 0) - (a.average || 0) ||
          b.goals - a.goals ||
          a.id.localeCompare(b.id),
      );
  }
  function publish(
    s,
    type,
    name,
    list,
    { competition = null, competitionName = null, month = null } = {},
  ) {
    if (!list.length) return null;
    const data = ensure(s),
      id = [s.season, type, competition || "world", month || "season"].join(
        ":",
      );
    if (data.awards.some((a) => a.id === id)) return null;
    const award = {
      id,
      type,
      name,
      season: s.season,
      seasonLabel: D.label(s),
      offset: s.today,
      competition,
      competitionName,
      month,
      winner: list[0],
      podium: list.slice(0, 3),
      partial: data.current.startedOffset > 0,
    };
    data.awards.unshift(award);
    data.awards = data.awards.slice(0, 2000);
    return award;
  }
  function closeMonth(s, force = false) {
    const data = ensure(s),
      current = data.current,
      bucket = current.month;
    if (!bucket || (!force && bucket.key === D.iso(s).slice(0, 7))) return [];
    const awards = [];
    for (const c of Object.values(bucket.competitions)) {
      const list = rank(s, "month", c.id, { eligibleOnly: true });
      const a = publish(s, "month", "Melhor jogador do mês", list, {
        competition: c.id,
        competitionName: c.name,
        month: bucket.key,
      });
      if (a) awards.push(a);
    }
    current.month = null;
    return awards;
  }
  function commit(s, m, { managed = false } = {}) {
    if (!m.performance || (m.season !== undefined && m.season !== s.season))
      return m.performance?.playerOfMatch || null;
    closeMonth(s);
    const data = ensure(s),
      current = data.current,
      offset = m.offset ?? s.today,
      key = [offset, m.competition, m.pair.join("|")].join(":");
    if (current.processed[key]) return m.performance.playerOfMatch;
    const stats = lines(m, true),
      winner = best(m);
    m.performance.final = true;
    m.performance.playerOfMatch = winner;
    current.processed[key] = 1;
    if (official(m)) {
      const c = (current.competitions[m.competition] ??= {
        id: m.competition,
        name: m.name,
        kind: m.kind === "league" ? "league" : "continental",
        closed: false,
        players: {},
      });
      const monthKey = D.iso(s).slice(0, 7);
      current.month ??= { key: monthKey, competitions: {} };
      const month = (current.month.competitions[m.competition] ??= {
        id: m.competition,
        name: m.name,
        players: {},
      });
      for (const line of stats) {
        add(current.players, line, winner);
        add(c.players, line, winner);
        add(month.players, line, winner);
      }
    }
    if (managed) {
      data.matches.unshift({
        id: s.season + ":" + key,
        season: s.season,
        offset,
        competition: m.competition,
        name: m.name,
        kind: m.kind,
        pair: [...m.pair],
        goals: [...m.goals],
        partial: m.performance.fromMinute > 0,
        playerOfMatch: winner,
        players: stats,
      });
      data.matches = data.matches.slice(0, 60);
    }
    return winner;
  }
  function closeCompetition(s, id) {
    const c = ensure(s).current.competitions[id];
    if (!c || c.closed) return null;
    c.closed = true;
    return publish(
      s,
      "competition",
      "Melhor jogador do campeonato",
      rank(s, "competition", id, { eligibleOnly: true }),
      { competition: id, competitionName: c.name },
    );
  }
  function closeSeason(s) {
    const data = ensure(s);
    if (data.current.closed) return [];
    const result = closeMonth(s, true);
    const gold = publish(
      s,
      "ballon",
      "Bola de Ouro",
      rank(s, "ballon", null, { eligibleOnly: true }),
    );
    if (gold) result.push(gold);
    const keeper = publish(
      s,
      "keeper",
      "Melhor goleiro da temporada",
      rank(s, "keeper", null, { eligibleOnly: true }),
    );
    if (keeper) result.push(keeper);
    data.current.closed = true;
    return result;
  }
  function validate(s, { clubIds, nationalIds } = {}) {
    const data = s.performance;
    if (data === undefined) return;
    const fail = () => {
      throw Error("Estatísticas de desempenho inválidas.");
    };
    const obj = (v, max) => {
      if (
        !v ||
        typeof v !== "object" ||
        Array.isArray(v) ||
        Object.keys(v).length > max
      )
        fail();
      return Object.values(v);
    };
    const str = (v, max = 150) => {
      if (typeof v !== "string" || !v.length || v.length > max) fail();
    };
    const num = (v, min = 0, max = 1000000, int = false) => {
      if (
        !Number.isFinite(v) ||
        v < min ||
        v > max ||
        (int && !Number.isInteger(v))
      )
        fail();
    };
    const arr = (v, max) => {
      if (!Array.isArray(v) || v.length > max) fail();
      return v;
    };
    const club = (id) => {
      if (!clubIds.has(id) && !nationalIds.has(id)) fail();
    };
    const base = (p) => {
      str(p.id);
      str(p.name);
      club(p.clubId);
      if (!["GOL", "LAT", "ZAG", "VOL", "MEI", "ATA"].includes(p.pos)) fail();
    };
    function line(p) {
      base(p);
      for (const k of [
        "minutes",
        "goals",
        "assists",
        "shots",
        "onTarget",
        "saves",
        "faced",
        "conceded",
        "passes",
        "completedPasses",
        "keyPasses",
        "recoveries",
        "duels",
        "duelsWon",
      ])
        num(p[k], 0, k === "minutes" ? 90 : 1000, true);
      num(p.side, 0, 1, true);
      if (typeof p.keeper !== "boolean") fail();
      if (
        p.onTarget > p.shots ||
        p.saves > p.faced ||
        p.completedPasses > p.passes ||
        p.duelsWon > p.duels
      )
        fail();
      if (p.rating !== undefined && p.rating !== null) num(p.rating, 1, 10);
      if (p.cleanSheet !== undefined) num(p.cleanSheet, 0, 1, true);
    }
    function totals(p) {
      base(p);
      for (const k of totalKeys)
        num(p[k], 0, 1000000, !["ratingSum", "keeperRatingSum"].includes(k));
      if (
        p.keeperMatches > p.appearances ||
        p.keeperMinutes > p.minutes ||
        p.keeperRatedMatches > p.keeperMatches ||
        p.keeperCleanSheets > p.keeperMatches ||
        p.ratedMatches > p.appearances ||
        p.cleanSheets > p.appearances ||
        p.onTarget > p.shots ||
        p.saves > p.faced ||
        p.completedPasses > p.passes ||
        p.duelsWon > p.duels
      )
        fail();
      for (const [id, minutes] of Object.entries(p.clubs)) {
        club(id);
        num(minutes, 0, p.minutes, true);
      }
      if (p.average !== undefined && p.average !== null) num(p.average, 1, 10);
      if (p.points)
        for (const k of [
          "total",
          "performance",
          "production",
          "consistency",
          "titles",
          "goalkeeping",
        ])
          num(p.points[k], k === "goalkeeping" ? -10000 : 0, 1000000);
    }
    const bucket = (b) => {
      for (const [id, p] of Object.entries(b)) {
        if (id !== p.id) fail();
        totals(p);
      }
      obj(b, 10000);
    };
    if (data.version !== 1) fail();
    num(data.started.season, 2025, 2200, true);
    num(data.started.offset, 0, 366, true);
    const current = data.current;
    if (current.season !== s.season) fail();
    str(current.label);
    num(current.startedOffset, 0, 366, true);
    if (typeof current.closed !== "boolean") fail();
    bucket(current.players);
    for (const [id, c] of Object.entries(current.competitions)) {
      if (
        c.id !== id ||
        !["league", "continental"].includes(c.kind) ||
        typeof c.closed !== "boolean"
      )
        fail();
      str(c.name);
      bucket(c.players);
    }
    obj(current.competitions, 40);
    const validMonth = (key) =>
      /^\d{4}-(0[1-9]|1[0-2])$/.test(key) &&
      Number(key.slice(0, 4)) >= 2025 &&
      Number(key.slice(0, 4)) <= 2201;
    if (current.month) {
      if (!validMonth(current.month.key)) fail();
      for (const c of obj(current.month.competitions, 40)) {
        str(c.id);
        str(c.name);
        bucket(c.players);
      }
    }
    for (const [key, value] of Object.entries(current.processed)) {
      str(key, 300);
      if (value !== 1) fail();
    }
    obj(current.processed, 16000);
    const awardIds = new Set();
    for (const a of arr(data.awards, 2000)) {
      str(a.id, 300);
      if (
        awardIds.has(a.id) ||
        !["ballon", "keeper", "competition", "month"].includes(a.type)
      )
        fail();
      awardIds.add(a.id);
      str(a.name);
      num(a.season, 2025, 2200, true);
      num(a.offset, 0, 366, true);
      totals(a.winner);
      arr(a.podium, 3).forEach(totals);
      if (a.month !== null && !validMonth(a.month)) fail();
    }
    for (const a of arr(data.archives, 5)) {
      num(a.season, 2025, 2200, true);
      str(a.label);
      arr(a.leaders, 50).forEach(totals);
      arr(a.keepers, 30).forEach(totals);
    }
    for (const m of arr(data.matches, 60)) {
      str(m.id, 300);
      str(m.name);
      str(m.competition);
      num(m.season, 2025, 2200, true);
      num(m.offset, 0, 366, true);
      if (arr(m.pair, 2).length !== 2) fail();
      m.pair.forEach(club);
      if (arr(m.goals, 2).length !== 2) fail();
      m.goals.forEach((g) => num(g, 0, 99, true));
      const ps = arr(m.players, 44);
      if (new Set(ps.map((p) => p.id)).size !== ps.length) fail();
      ps.forEach(line);
      if (m.playerOfMatch) line(m.playerOfMatch);
    }
    if (s.live?.performance) {
      const m = s.live.performance;
      if (m.version !== 1 || typeof m.final !== "boolean") fail();
      num(m.fromMinute, 0, 90, true);
      const ps = obj(m.players, 44);
      ps.forEach(line);
      if (m.playerOfMatch) line(m.playerOfMatch);
    }
  }
  const api = {
    ensure,
    begin,
    tick,
    shot,
    rating,
    lines,
    best,
    average,
    rank,
    score,
    titles,
    commit,
    closeMonth,
    closeCompetition,
    closeSeason,
    official,
    totalKeys,
    validate,
  };
  root.LegacyPerformance = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
