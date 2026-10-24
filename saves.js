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
    number(s.day, 0, E.calendar().length);
    if (!Number.isInteger(s.day) || !Number.isInteger(s.season)) fail();
    if (s.version === 3) {
      number(s.today, 0, 366);
      if (!Number.isInteger(s.today)) fail();
      const event = E.calendar()[s.day],
        prior = E.calendar()[s.day - 1];
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
          !["important", "rotation", "prospect"].includes(n.role)
        )
          fail();
        if (n.salary > 30000000 || n.bonus > 1e12) fail();
        date(n.createdOn);
        date(n.updatedOn);
        if (n.dueOn !== null) date(n.dueOn);
        if (n.expiresOn !== null) date(n.expiresOn);
        if (
          ["club-pending", "player-pending", "medical-pending"].includes(
            n.stage,
          ) &&
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
      if (!["text", "2d"].includes(m.mode)) fail();
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
