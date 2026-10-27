"use strict";
(function (root) {
  const official = (m) => ["league", "group", "cup"].includes(m.kind);
  const active = (plan) => plan.starters.filter((p) => !p.sentOff);
  const suspension = (p, competition) =>
    p.discipline?.bans?.[competition]?.remaining || 0;
  const available = (p, competition) =>
    !p.injury && !suspension(p, competition);
  function rules(competition, kind = "league") {
    return {
      yellowLimit: kind === "league" ? (competition === "br" ? 3 : 5) : 3,
      secondYellow: 1,
      straightRed: 2,
      violent: 3,
    };
  }
  function ensure(s) {
    return (s.discipline ??= {
      version: 1,
      started: { season: s.season, offset: s.today || 0 },
      events: [],
    });
  }
  function begin(s, m) {
    if (m.discipline) return m.discipline;
    const serving = [];
    if (official(m))
      for (const id of m.pair) {
        const t = s.teams.find((t) => t.id === id);
        for (const p of t?.players || [])
          if (suspension(p, m.competition)) serving.push(p.id);
      }
    return (m.discipline = {
      version: 1,
      yellows: {},
      reds: [],
      cards: [],
      fouls: [0, 0],
      serving,
      committed: false,
    });
  }
  function refresh(plan) {
    const players = active(plan);
    if (plan.starters[0]?.sentOff && players.length) {
      const keeper =
        players.find((p) => p.pos === "GOL") ||
        players.reduce((a, b) => (a.ovr > b.ovr ? a : b));
      const index = plan.starters.indexOf(keeper);
      [plan.starters[0], plan.starters[index]] = [keeper, plan.starters[0]];
    }
    const valid = new Set(players.map((p) => p.id));
    for (const key of Object.keys(plan.specialists || {}))
      if (!valid.has(plan.specialists[key]?.id)) {
        const skill = key.startsWith("corners")
          ? "crossing"
          : key === "penalties"
            ? "penalties"
            : key === "freeKicks"
              ? "freeKicks"
              : "leadership";
        const best = [...players].sort(
          (a, b) => (b.skills?.[skill] || 0) - (a.skills?.[skill] || 0),
        )[0];
        plan.specialists[key] = best
          ? { id: best.id, name: best.name, skills: best.skills }
          : null;
      }
  }
  function card(s, m, side, playerId, type = "yellow", severity = "normal") {
    if (
      ![0, 1].includes(side) ||
      !["yellow", "red"].includes(type) ||
      !["normal", "violent"].includes(severity) ||
      m.done ||
      m.minute >= 90
    )
      throw Error("Cartão inválido ou partida encerrada.");
    const plan = m.plans[side],
      p = active(plan).find((p) => p.id === playerId);
    if (!p) throw Error("O atleta não está em campo.");
    const d = begin(s, m);
    if (type === "yellow") d.yellows[p.id] = (d.yellows[p.id] || 0) + 1;
    const second = type === "yellow" && d.yellows[p.id] === 2,
      red = type === "red" || second,
      reason = second
        ? "Segundo amarelo"
        : type === "yellow"
          ? "Entrada imprudente"
          : severity === "violent"
            ? "Conduta violenta"
            : "Falta grave";
    const event = {
      minute: m.minute,
      side,
      playerId: p.id,
      name: p.name,
      type: second ? "second-yellow" : type,
      severity,
      reason,
    };
    d.cards.push(event);
    const line = m.performance?.players[p.id];
    if (line) {
      if (type === "yellow") line.yellowCards = (line.yellowCards || 0) + 1;
      if (red) line.redCards = (line.redCards || 0) + 1;
      if (type === "red") line.straightReds = (line.straightReds || 0) + 1;
    }
    if (red) {
      p.sentOff = true;
      d.reds.push(p.id);
      // Reduz a força proporcionalmente, sem consumir o gerador de lances.
      const before = active(plan).length + 1;
      plan.strength *= (before - 1) / before;
      plan.baseStrength =
        ((plan.baseStrength ?? (plan.strength * before) / (before - 1)) *
          (before - 1)) /
        before;
      refresh(plan);
    }
    m.events.unshift(
      `${m.minute}' — ${red ? "🟥 EXPULSO" : "🟨 Amarelo"}: ${p.name} (${plan.name}) · ${reason}.${red ? " A equipe joga com um a menos." : ""}`,
    );
    if (active(plan).length < 7) {
      d.forfeit = {
        side,
        minute: m.minute,
        reason: "Menos de sete jogadores em campo",
      };
      m.goals[side] = 0;
      m.goals[1 - side] = Math.max(3, m.goals[1 - side]);
      m.events.unshift(
        `Partida encerrada aos ${m.minute}' por falta de jogadores. Resultado administrativo: ${m.goals.join(" × ")}.`,
      );
      m.minute = 90;
    }
    return event;
  }
  function random(m, salt) {
    const key = [
      m.season,
      m.offset ?? m.day ?? 0,
      m.competition,
      ...m.pair,
      m.minute,
      salt,
    ].join("|");
    let h = 2166136261;
    for (let i = 0; i < key.length; i++)
      h = Math.imul(h ^ key.charCodeAt(i), 16777619);
    h ^= h >>> 16;
    h = Math.imul(h, 0x7feb352d);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  function tick(s, m) {
    const d = begin(s, m);
    if (m.minute < 3 || m.minute >= 90 || random(m, "foul") >= 0.25) return;
    const side = random(m, "side") < 0.5 ? 0 : 1,
      plan = m.plans[side];
    d.fouls[side]++;
    const roll = random(m, "card"),
      pressing = plan.instructions?.pressing === "Alta";
    if (roll >= (pressing ? 0.23 : 0.17)) return;
    const players = active(plan),
      outfield = players.filter((p) => p.pos !== "GOL"),
      pool = random(m, "keeper") < 0.025 ? players : outfield;
    if (!pool.length) return;
    const p = pool[Math.floor(random(m, "player") * pool.length)];
    card(
      s,
      m,
      side,
      p.id,
      roll < 0.004 ? "red" : "yellow",
      random(m, "severity") < 0.2 ? "violent" : "normal",
    );
  }
  function counts(p, s, competition) {
    const c = p.discipline?.cards?.[competition];
    return c?.season === s.season
      ? c
      : { season: s.season, yellows: 0, reds: 0, accumulated: 0 };
  }
  function commit(s, m) {
    const d = begin(s, m);
    if (d.committed) return [];
    const data = ensure(s),
      records = [];
    const add = (p, clubId, action, reason, matches) => {
      if (!m.pair.includes(s.clubId)) return;
      records.push({
        season: s.season,
        offset: m.offset ?? s.today ?? 0,
        competition: m.competition,
        clubId,
        playerId: p.id,
        name: p.name,
        action,
        reason,
        matches,
      });
    };
    if (official(m)) {
      const players = new Map(
        m.pair.flatMap((id) =>
          (s.teams.find((t) => t.id === id)?.players || []).map((p) => [
            p.id,
            { p, clubId: id },
          ]),
        ),
      );
      for (const id of d.serving) {
        const entry = players.get(id);
        if (!entry) continue;
        const ban = entry.p.discipline?.bans?.[m.competition];
        if (ban?.remaining) {
          ban.remaining--;
          add(entry.p, entry.clubId, "served", ban.reason, ban.remaining);
        }
      }
      for (const e of d.cards) {
        const entry = players.get(e.playerId);
        if (!entry) continue;
        const { p, clubId } = entry;
        p.discipline ??= { cards: {}, bans: {} };
        const c = (p.discipline.cards[m.competition] = counts(
            p,
            s,
            m.competition,
          )),
          rule = rules(m.competition, m.kind);
        const yellow = e.type !== "red";
        if (yellow) {
          c.yellows++;
          c.accumulated++;
        }
        if (e.type !== "yellow") c.reds++;
        add(p, clubId, "card", e.reason, 0);
        let matches = 0,
          reason = e.reason;
        if (c.accumulated >= rule.yellowLimit) {
          c.accumulated -= rule.yellowLimit;
          matches++;
          reason = "Acúmulo de amarelos";
        }
        if (e.type === "second-yellow") matches += rule.secondYellow;
        if (e.type === "red")
          matches += e.severity === "violent" ? rule.violent : rule.straightRed;
        if (matches) {
          const remaining = suspension(p, m.competition);
          p.discipline.bans[m.competition] = {
            remaining: remaining + matches,
            reason,
            issuedSeason: s.season,
            issuedOffset: m.offset ?? s.today ?? 0,
          };
          add(p, clubId, "suspended", reason, remaining + matches);
        }
      }
    }
    data.events = [...records.reverse(), ...data.events].slice(0, 1200);
    d.committed = true;
    return records;
  }
  function validate(s) {
    const fail = () => {
      throw Error("Dados disciplinares inválidos.");
    };
    const num = (x, max = 100000) => {
      if (!Number.isInteger(x) || x < 0 || x > max) fail();
    };
    const str = (x) => {
      if (typeof x !== "string" || !x.length || x.length > 200) fail();
    };
    const comps = new Set([
      ...(s.leagues || []).map((l) => l.id),
      ...(s.cups || []).map((c) => c.id),
    ]);
    // Identificadores dos calendários oficiais usam as ligas presentes nos clubes.
    for (const t of s.teams) comps.add(t.leagueId);
    const comp = (id) => {
      str(id);
      if (!comps.has(id)) fail();
    };
    for (const p of [
      ...s.teams.flatMap((t) => [...t.players, ...t.youth]),
      ...s.freeAgents,
    ])
      if (p.discipline) {
        if (
          !p.discipline.cards ||
          !p.discipline.bans ||
          Object.keys(p.discipline.cards).length > 40 ||
          Object.keys(p.discipline.bans).length > 40
        )
          fail();
        for (const [id, c] of Object.entries(p.discipline.cards)) {
          comp(id);
          num(c.season);
          num(c.yellows);
          num(c.reds);
          num(c.accumulated, 5);
        }
        for (const [id, b] of Object.entries(p.discipline.bans)) {
          comp(id);
          num(b.remaining, 100);
          str(b.reason);
          num(b.issuedSeason);
          num(b.issuedOffset, 400);
        }
      }
    if (s.discipline) {
      if (
        s.discipline.version !== 1 ||
        !Array.isArray(s.discipline.events) ||
        s.discipline.events.length > 1200
      )
        fail();
      num(s.discipline.started?.season);
      num(s.discipline.started?.offset, 400);
      for (const e of s.discipline.events) {
        num(e.season);
        num(e.offset, 400);
        str(e.playerId);
        str(e.name);
        comp(e.competition);
        str(e.clubId);
        str(e.reason);
        num(e.matches, 100);
        if (!["card", "suspended", "served"].includes(e.action)) fail();
      }
    }
    const m = s.live,
      d = m?.discipline;
    if (!d) return;
    if (
      d.version !== 1 ||
      typeof d.committed !== "boolean" ||
      !Array.isArray(d.cards) ||
      d.cards.length > 66 ||
      !Array.isArray(d.reds) ||
      d.reds.length > 22 ||
      new Set(d.reds).size !== d.reds.length ||
      !Array.isArray(d.serving) ||
      d.serving.length > 600 ||
      !Array.isArray(d.fouls) ||
      d.fouls.length !== 2 ||
      !d.yellows ||
      typeof d.yellows !== "object"
    )
      fail();
    d.fouls.forEach((n) => num(n, 200));
    const participants = new Set([
      ...m.plans.flatMap((p) => p.starters.map((p) => p.id)),
      ...Object.keys(m.performance?.players || {}),
    ]);
    for (const [id, n] of Object.entries(d.yellows)) {
      if (!participants.has(id)) fail();
      num(n, 2);
    }
    for (const e of d.cards) {
      if (
        !participants.has(e.playerId) ||
        !["yellow", "second-yellow", "red"].includes(e.type) ||
        !["normal", "violent"].includes(e.severity)
      )
        fail();
      num(e.minute, 90);
      num(e.side, 1);
      str(e.name);
      str(e.reason);
    }
    for (const id of d.reds)
      if (
        !participants.has(id) ||
        !m.plans.some((p) => p.starters.some((p) => p.id === id && p.sentOff))
      )
        fail();
    for (const p of m.plans.flatMap((p) => p.starters))
      if (p.sentOff && !d.reds.includes(p.id)) fail();
    if (d.forfeit) {
      num(d.forfeit.side, 1);
      num(d.forfeit.minute, 90);
      str(d.forfeit.reason);
    }
  }
  const api = {
    active,
    suspension,
    available,
    rules,
    ensure,
    begin,
    card,
    tick,
    counts,
    commit,
    refresh,
    validate,
    official,
  };
  root.LegacyDiscipline = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
