"use strict";
(function (root) {
  const E =
    typeof module !== "undefined" ? require("./engine.js") : root.Legacy;
  const L =
    typeof module !== "undefined"
      ? require("./vendor/lz-string.js")
      : root.LZString;
  const MAX_BYTES = 30 * 1024 * 1024;
  function fail() {
    throw Error(
      "Arquivo de carreira inválido ou incompatível. Seu progresso atual foi preservado.",
    );
  }
  function validate(s) {
    if (!s || ![2, 3].includes(s.version)) fail();
    // Verifica limites antes de qualquer migração ou gravação.
    let nodes = 0;
    function walk(v, depth = 0) {
      if (++nodes > 2500000 || depth > 25) fail();
      if (typeof v === "number" && !Number.isFinite(v)) fail();
      if (typeof v === "string" && v.length > 500000) fail();
      if (v && typeof v === "object")
        for (const [k, x] of Object.entries(v)) {
          if (["__proto__", "prototype", "constructor"].includes(k)) fail();
          walk(x, depth + 1);
        }
    }
    walk(s);
    const array = (v, max) => {
      if (!Array.isArray(v) || v.length > max) fail();
      return v;
    };
    const number = (v, min = -1e16, max = 1e16) => {
      if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
        fail();
    };
    const string = (v, max = 150) => {
      if (typeof v !== "string" || !v.length || v.length > max) fail();
    };
    number(s.season, 2025, 2200);
    if (
      s.calendarProfile !== undefined &&
      (s.calendarProfile.version !== 1 ||
        !["eu", "calendar"].includes(s.calendarProfile.region) ||
        s.calendarProfile.preseasonDays !==
          (s.calendarProfile.region === "eu" ? 45 : 24))
    )
      fail();
    number(s.day, 0, E.calendar(s).length);
    if (!Number.isInteger(s.day) || !Number.isInteger(s.season)) fail();
    if (s.version === 3) {
      number(s.today, 0, 366);
      if (!Number.isInteger(s.today)) fail();
      const event = E.calendar(s)[s.day],
        prior = E.calendar(s)[s.day - 1];
      if (
        event &&
        (s.today > event.offset || (prior && s.today <= prior.offset))
      )
        fail();
    }
    if (s.mode !== undefined && !["normal", "test"].includes(s.mode)) fail();
    if (s.testFundingTotal !== undefined) number(s.testFundingTotal, 0);
    number(s.reputation, 0, 100);
    if (
      !["Equilibrado", "Ofensivo", "Defensivo"].includes(s.tactic) ||
      !["Técnica", "Intensivo", "Recuperação"].includes(s.training)
    )
      fail();
    const known = new Set(
      E.LEAGUES.flatMap((l) => l.clubs.map((_, i) => l.id + "-" + i)),
    );
    const teams = array(s.teams, 397);
    if (teams.length !== known.size) fail();
    const ids = new Set(),
      players = new Set();
    function player(p) {
      if (!p || typeof p !== "object") fail();
      string(p.id);
      string(p.name);
      if (players.has(p.id)) fail();
      players.add(p.id);
      if (!["GOL", "LAT", "ZAG", "VOL", "MEI", "ATA"].includes(p.pos)) fail();
      for (const k of [
        "age",
        "ovr",
        "potential",
        "fitness",
        "injury",
        "price",
        "salary",
        "contract",
      ])
        number(p[k], 0);
      if (p.fitness > 100 || p.ovr > 100 || p.potential > 100 || p.age > 150)
        fail();
      if (p.shirtNumber !== undefined) {
        number(p.shirtNumber, 1, 99);
        if (!Number.isInteger(p.shirtNumber)) fail();
      }
      if (
        p.squadRole !== undefined &&
        !Object.hasOwn(E.SQUAD_ROLES, p.squadRole)
      )
        fail();
      if (p.fatigue !== undefined) number(p.fatigue, 0, 100);
      if (p.restDays !== undefined) {
        number(p.restDays, 0, 7);
        if (!Number.isInteger(p.restDays)) fail();
      }
      if (
        p.trainingPlan !== undefined &&
        !["auto", "light", "normal", "intense"].includes(p.trainingPlan)
      )
        fail();
      if (
        p.trainingFocus !== undefined &&
        !Object.hasOwn(E.training.focuses, p.trainingFocus)
      )
        fail();
      for (const key of ["trainingXP", "trainingBonuses"])
        if (p[key] !== undefined) {
          if (!p[key] || typeof p[key] !== "object" || Array.isArray(p[key]))
            fail();
          for (const [focus, value] of Object.entries(p[key])) {
            if (!Object.hasOwn(E.training.focuses, focus)) fail();
            number(value, 0, key === "trainingXP" ? 99 : 8);
            if (!Number.isInteger(value)) fail();
          }
        }
      if (p.stamina !== undefined) number(p.stamina, 1, 100);
      if (p.marketSalary !== undefined) number(p.marketSalary, 0, 30000000);
      if (p.ratingBase !== undefined) number(p.ratingBase, 0, 100);

      for (const key of ["naturalPositions", "secondaryPositions"])
        if (
          p[key] !== undefined &&
          array(p[key], 16).some(
            (code) => !Object.hasOwn(E.tactics.positionNames, code),
          )
        )
          fail();
    }
    for (const t of teams) {
      if (!known.has(t.id) || ids.has(t.id)) fail();
      ids.add(t.id);
      string(t.name);
      string(t.leagueId);
      string(t.manager);
      try {
        E.tactics.validate(t);
      } catch {
        fail();
      }
      number(t.money);
      number(t.facility, 1, 5);
      number(t.stadium, 1, 5);
      array(t.players, 300).forEach(player);
      array(t.youth, 300).forEach(player);
      const shirts = [...t.players, ...t.youth]
        .map((p) => p.shirtNumber)
        .filter((n) => n !== undefined);
      if (new Set(shirts).size !== shirts.length) fail();
      array(t.lineup, 11);
      if (t.lineup.some((id) => id && !t.players.some((p) => p.id === id)))
        fail();
      if (s.version === 3) {
        const f = t.finance;
        if (!f) fail();
        for (const k of [
          "openingBalance",
          "transferBudget",
          "wageBudget",
          "annualRevenue",
        ])
          number(f[k]);
        number(f.sequence, 0);
        array(f.ledger, 100000).forEach((r) => {
          number(r.amount);
          number(r.balance);
          string(r.category);
          string(r.description, 1000);
        });
        array(f.sponsors, 10).forEach((c) => {
          string(c.name);
          number(c.annual, 0);
          number(c.expires, 2024, 2201);
        });
      }
    }
    array(s.freeAgents, 30000).forEach(player);
    if (s.negotiations !== undefined) {
      const negotiations = array(s.negotiations, 100),
        negotiationIds = new Set(),
        activePlayers = new Set();
      number(s.negotiationSequence, 0);
      number(s.negotiationRevision, 0);
      if (
        !Number.isSafeInteger(s.negotiationSequence) ||
        !Number.isSafeInteger(s.negotiationRevision)
      )
        fail();
      const date = (value) => {
        if (
          typeof value !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isFinite(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value
        )
          fail();
      };
      for (const n of negotiations) {
        if (n.kind !== undefined && !["transfer", "renewal"].includes(n.kind))
          fail();
        if (n.kind === "renewal" && (n.buyerId !== n.sellerId || n.fee !== 0))
          fail();
        string(n.id);
        string(n.playerId);
        string(n.playerName);
        string(n.message, 1000);
        if (
          !/^neg-\d+$/.test(n.id) ||
          Number(n.id.slice(4)) > s.negotiationSequence ||
          negotiationIds.has(n.id) ||
          !known.has(n.buyerId) ||
          (n.sellerId !== null && !known.has(n.sellerId)) ||
          !E.NEGOTIATION_STAGES.includes(n.stage)
        )
          fail();
        negotiationIds.add(n.id);
        for (const key of [
          "fee",
          "salary",
          "bonus",
          "askFee",
          "askSalary",
          "askBonus",
          "clubRounds",
          "playerRounds",
        ]) {
          number(n[key], 0, 1e13);
          if (!Number.isSafeInteger(n[key])) fail();
        }
        number(n.years, 1, 5);
        number(n.askYears, 1, 5);
        if (
          !Number.isInteger(n.years) ||
          !Number.isInteger(n.askYears) ||
          n.clubRounds > 3 ||
          n.playerRounds > 3 ||
          !Object.hasOwn(E.SQUAD_ROLES, n.role)
        )
          fail();
        if (n.salary > 30000000 || n.bonus > 1e12) fail();
        date(n.createdOn);
        date(n.updatedOn);
        if (n.dueOn !== null) date(n.dueOn);
        if (n.expiresOn !== null) date(n.expiresOn);
        if (
          [
            "club-pending",
            "player-pending",
            "medical-pending",
            "signature-pending",
          ].includes(n.stage) &&
          !n.dueOn
        )
          fail();
        array(n.history, 24).forEach((h) => {
          date(h.date);
          string(h.message, 1000);
          if (!E.NEGOTIATION_STAGES.includes(h.stage)) fail();
        });
        if (E.negotiationActive(n)) {
          if (activePlayers.has(n.playerId) || !players.has(n.playerId)) fail();
          activePlayers.add(n.playerId);
        }
      }
      if (activePlayers.size > 20) fail();
    }
    if (s.clubId !== null && !known.has(s.clubId)) fail();
    const coaches = array(s.coaches, 2000);
    for (const c of coaches) {
      string(c.id);
      string(c.name);
      number(c.reputation, 0, 100);
      number(c.contract);
      if (c.clubId && !known.has(c.clubId)) fail();
    }
    if (
      s.clubId &&
      !coaches.some((c) => c.id === "you" && c.clubId === s.clubId)
    )
      fail();
    if (teams.some((t) => !coaches.some((c) => c.id === t.manager))) fail();
    const leagues = array(s.leagues, 21);
    if (leagues.length !== 21) fail();
    function pair(pair) {
      if (
        !Array.isArray(pair) ||
        pair.length !== 2 ||
        pair[0] === pair[1] ||
        pair.some((id) => !known.has(id))
      )
        fail();
    }
    function table(rows, allowed) {
      array(rows, 397).forEach((r) => {
        if (!allowed.includes(r.id)) fail();
        for (const k of ["p", "w", "d", "l", "gf", "ga"]) number(r[k], 0);
      });
    }
    for (const l of leagues) {
      const def = E.LEAGUES.find((d) => d.id === l.id);
      if (!def) fail();
      const clubIds = def.clubs.map((_, i) => l.id + "-" + i);
      if (
        array(l.ids, 40).length !== clubIds.length ||
        new Set(l.ids).size !== clubIds.length ||
        l.ids.some((id) => !clubIds.includes(id))
      )
        fail();
      table(l.table, clubIds);
      array(l.fixtures, 80).forEach((r) => array(r, 30).forEach(pair));
      array(l.ranking, 40);
    }
    const cups = array(s.cups, 4);
    if (cups.length !== 4 || new Set(cups.map((c) => c.id)).size !== 4) fail();
    for (const c of cups) {
      if (!E.CUP_DEFS.some((d) => d.id === c.id)) fail();
      array(c.entrants, 40).forEach((id) => {
        if (!known.has(id)) fail();
      });
      table(c.table, c.entrants);
      array(c.rounds, 5).forEach((r) => {
        array(r.pairs, 32).forEach(pair);
        array(r.results, 32);
      });
    }
    for (const key of ["news", "history", "transfers", "coachMoves", "offers"])
      array(s[key], 100000);
    if (s.profile) {
      string(s.profile.name, 60);
      number(s.profile.birthYear, 1900, 2200);
      if (!E.national.countries.some(([c]) => c === s.profile.nationality))
        fail();
    }
    if (s.friendlies !== undefined) {
      const seen = new Set();
      array(s.friendlies, 60).forEach((f) => {
        string(f.id);
        string(f.name, 60);
        string(f.competition);
        number(f.offset, 0, 366);
        if (
          !Number.isInteger(f.offset) ||
          seen.has(f.id) ||
          f.kind !== "friendly" ||
          !["scheduled", "completed", "cancelled"].includes(f.status) ||
          !Array.isArray(f.pair) ||
          f.pair.length !== 2 ||
          new Set(f.pair).size !== 2 ||
          f.pair.some((id) => !known.has(id))
        )
          fail();
        seen.add(f.id);
        if (f.goals !== undefined) {
          if (array(f.goals, 2).length !== 2) fail();
          f.goals.forEach((g) => number(g, 0, 99));
        }
      });
      number(s.friendlySequence, 0, 1e7);
      number(s.tournamentSequence, 0, 1e7);
      array(s.preseasonTournaments, 10).forEach((t) => {
        string(t.id);
        string(t.name, 60);
        number(t.start, 0, 366);
        number(t.end, 0, 366);
        if (
          !["scheduled", "completed", "cancelled"].includes(t.status) ||
          array(t.entrants, 4).length !== 4 ||
          new Set(t.entrants).size !== 4 ||
          t.entrants.some((id) => !known.has(id))
        )
          fail();
        table(t.table, t.entrants);
        if (t.champion !== null && !t.entrants.includes(t.champion)) fail();
      });
    }
    const nationalIDs = new Set(E.national.definitions.map((n) => n.id));
    if (s.national) {
      const n = s.national;
      if (n.job !== null && !nationalIDs.has(n.job)) fail();
      if (!n.squads || typeof n.squads !== "object" || Array.isArray(n.squads))
        fail();
      array(n.fixtures, 500).forEach((f) => {
        if (
          f.kind !== "national" ||
          !Array.isArray(f.pair) ||
          f.pair.length !== 2 ||
          f.pair.some((id) => !nationalIDs.has(id))
        )
          fail();
        number(f.offset, 0, 263);
      });
      if (n.plans)
        for (const [id, plan] of Object.entries(n.plans)) {
          if (!nationalIDs.has(id)) fail();
          try {
            E.tactics.validate({ tactics: plan });
          } catch {
            fail();
          }
        }
      if (n.lineups)
        for (const [id, eleven] of Object.entries(n.lineups)) {
          if (
            !nationalIDs.has(id) ||
            array(eleven, 11).some((pid) => typeof pid !== "string")
          )
            fail();
        }
      array(n.results, 100000);
      for (const [id, list] of Object.entries(n.squads)) {
        if (
          !nationalIDs.has(id) ||
          array(list, 23).some((pid) => !players.has(pid)) ||
          new Set(list).size !== list.length
        )
          fail();
      }
    }
    if (s.trainingSchedule !== undefined) {
      if (
        array(s.trainingSchedule, 7).length !== 7 ||
        s.trainingSchedule.some(
          (key) => !Object.hasOwn(E.training.sessions, key),
        )
      )
        fail();
    }
    if (s.trainingHistory !== undefined)
      array(s.trainingHistory, 21).forEach((h) => {
        number(h.season, 2025, 2200);
        number(h.offset, 0, 366);
        number(h.trained, 0, 600);
        number(h.improved, 0, 600);
        string(h.label);
      });
    if (s.scouting !== undefined) {
      const c = s.scouting;
      number(c.sequence, 0);
      number(c.revision, 0);
      if (c.shortlist !== undefined) {
        const list = array(c.shortlist, 30);
        if (
          new Set(list).size !== list.length ||
          list.some((id) => typeof id !== "string")
        )
          fail();
      }
      array(c.missions, 30).forEach((m) => {
        string(m.id);
        if (
          !known.has(m.clubId) ||
          !["market", "youth"].includes(m.scope) ||
          !["pending", "completed", "cancelled"].includes(m.status)
        )
          fail();
        number(m.season, 2025, 2200);
        number(m.started, 0, 366);
        number(m.due, 0, 800);
        number(m.maxFee, 0, 1e13);
        number(m.maxAge, 15, m.scope === "youth" ? 23 : 45);
        string(m.position);
      });
      array(c.reports, 12).forEach((r) => {
        string(r.id);
        if (!known.has(r.clubId) || !["market", "youth"].includes(r.scope))
          fail();
        number(r.season, 2025, 2200);
        number(r.offset, 0, 366);
        array(r.players, 10).forEach((p) => {
          string(p.playerId);
          if (p.clubId !== null && !known.has(p.clubId)) fail();
          number(p.score, -100, 200);
        });
      });
    }
    if (s.trophies !== undefined) {
      const ids = new Set();
      array(s.trophies, 1000).forEach((t) => {
        string(t.id);
        string(t.name);
        if (
          ids.has(t.id) ||
          !known.has(t.clubId) ||
          !["league", "continental", "preseason"].includes(t.kind)
        )
          fail();
        ids.add(t.id);
        number(t.season, 2025, 2200);
        number(t.offset, 0, 366);
        if (t.coachId !== null && t.coachId !== "you") fail();
        if (typeof t.celebrated !== "boolean") fail();
      });
    }
    if (s.fixtureResults !== undefined)
      array(s.fixtureResults, 2000).forEach((r) => {
        if (
          !Array.isArray(r.pair) ||
          r.pair.length !== 2 ||
          r.pair.some((id) => !known.has(id) && !nationalIDs.has(id))
        )
          fail();
        number(r.season, 2025, 2200);
        number(r.offset, 0, 366);
        array(r.goals, 2).forEach((g) => number(g, 0, 99));
        string(r.competition);
      });
    if (s.national?.invites !== undefined) {
      array(s.national.invites, 24).forEach((o) => {
        string(o.id);
        string(o.name);
        string(o.reason, 1000);
        if (
          !nationalIDs.has(o.selectionId) ||
          !["pending", "accepted", "declined", "expired"].includes(o.status)
        )
          fail();
        number(o.season, 2025, 2200);
        number(o.offset, 0, 366);
        number(o.expires, 0, 800);
        number(o.required, 0, 100);
      });
      number(s.national.invitationRevision, 0);
      number(s.national.nextReview, 0, 800);
    }
    if (
      s.matchPreferences !== undefined &&
      ![120, 400, 900, 1600].includes(s.matchPreferences.speed)
    )
      fail();
    if (s.live) {
      const m = s.live;
      if (
        !Array.isArray(m.pair) ||
        m.pair.length !== 2 ||
        m.pair.some((id) => !known.has(id) && !nationalIDs.has(id))
      )
        fail();
      number(m.minute, 0, 90);
      if (!Number.isInteger(m.minute)) fail();
      array(m.goals, 2).forEach((g) => number(g, 0, 99));
      array(m.shots, 2).forEach((g) => number(g, 0, 999));
      array(m.events, 100);
      number(m.day, 0, 51);
      if (m.goals.length !== 2 || m.shots.length !== 2) fail();
      if (!["text", "2d", "3d"].includes(m.mode)) fail();
      if (m.minutesPlayed)
        for (const [id, minutes] of Object.entries(m.minutesPlayed)) {
          string(id);
          number(minutes, 0, 90);
        }
      if (m.possession) array(m.possession, 2).forEach((n) => number(n, 0, 90));
      if (m.substitutions)
        array(m.substitutions, 10).forEach((c) => {
          number(c.side, 0, 1);
          number(c.minute, 0, 90);
          string(c.outId);
          string(c.inId);
        });
      const play = (p) => {
        string(p.id);
        if (!["goal", "shot", "build-up"].includes(p.type)) fail();
        number(p.minute, 0, 90);
        number(p.side, 0, 1);
        if (p.playerId !== null) string(p.playerId);
        string(p.playerName);
        array(p.path, 4).forEach((point) => {
          number(point.x, 0, 100);
          number(point.y, 0, 100);
        });
        if (p.positions)
          array(p.positions, 22).forEach((point) => {
            string(point.id);
            string(point.name);
            number(point.side, 0, 1);
            number(point.index, 0, 10);
            number(point.x, 0, 100);
            number(point.y, 0, 100);
          });
      };
      if (m.timeline) array(m.timeline, 40).forEach(play);
      if (m.goalReplays) array(m.goalReplays, 12).forEach(play);
    }
    try {
      E.performance.validate(s, { clubIds: known, nationalIds: nationalIDs });
    } catch {
      fail();
    }
    return s;
  }
  function parse(raw) {
    if (typeof raw !== "string" || raw.length > MAX_BYTES) fail();
    let parsed;
    try {
      const text = raw.startsWith("CL3:")
        ? L.decompressFromUTF16(raw.slice(4))
        : raw;
      if (!text || text.length > MAX_BYTES) fail();
      parsed = JSON.parse(text);
    } catch {
      fail();
    }
    const state = parsed?.format === "club-legacy" ? parsed.career : parsed;
    validate(state);
    const result = E.prepareCareer(E.upgradeSave(state));
    validate(result);
    return result;
  }
  function serialize(s) {
    validate(s);
    return JSON.stringify({
      format: "club-legacy",
      formatVersion: 1,
      savedAt: new Date().toISOString(),
      career: s,
    });
  }
  const api = { parse, serialize, validate, MAX_BYTES };
  root.LegacySaves = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
