"use strict";
(function (root) {
  // Elegibilidade simplificada pela cidadania registrada; não representa vínculos FIFA.
  const definitions = [
    ["Brazil", "Brasil", "sa"],
    ["Argentina", "Argentina", "sa"],
    ["Uruguay", "Uruguai", "sa"],
    ["Colombia", "Colômbia", "sa"],
    ["Chile", "Chile", "sa"],
    ["Ecuador", "Equador", "sa"],
    ["Peru", "Peru", "sa"],
    ["Paraguay", "Paraguai", "sa"],
    ["Bolivia", "Bolívia", "sa"],
    ["Venezuela", "Venezuela", "sa"],
    ["England", "Inglaterra", "eu"],
    ["Spain", "Espanha", "eu"],
    ["Italy", "Itália", "eu"],
    ["Germany", "Alemanha", "eu"],
    ["France", "França", "eu"],
    ["Portugal", "Portugal", "eu"],
    ["Netherlands", "Países Baixos", "eu"],
    ["Belgium", "Bélgica", "eu"],
    ["Croatia", "Croácia", "eu"],
    ["Denmark", "Dinamarca", "eu"],
    ["Switzerland", "Suíça", "eu"],
    ["Sweden", "Suécia", "eu"],
    ["Norway", "Noruega", "eu"],
    ["Poland", "Polônia", "eu"],
    ["Serbia", "Sérvia", "eu"],
    ["Scotland", "Escócia", "eu"],
    ["Wales", "País de Gales", "eu"],
    ["Türkiye", "Turquia", "eu"],
    ["Ukraine", "Ucrânia", "eu"],
    ["Austria", "Áustria", "eu"],
    ["Greece", "Grécia", "eu"],
    ["Ireland", "Irlanda", "eu"],
    ["Czech Republic", "Chéquia", "eu"],
    ["United States", "Estados Unidos", "na"],
    ["Canada", "Canadá", "na"],
    ["Mexico", "México", "na"],
    ["Costa Rica", "Costa Rica", "na"],
    ["Jamaica", "Jamaica", "na"],
    ["Japan", "Japão", "as"],
    ["South Korea", "Coreia do Sul", "as"],
    ["Saudi Arabia", "Arábia Saudita", "as"],
    ["Australia", "Austrália", "as"],
    ["Iran", "Irã", "as"],
    ["Morocco", "Marrocos", "af"],
    ["Senegal", "Senegal", "af"],
    ["Nigeria", "Nigéria", "af"],
    ["Ghana", "Gana", "af"],
    ["Algeria", "Argélia", "af"],
    ["Cameroon", "Camarões", "af"],
    ["Cote d'Ivoire", "Costa do Marfim", "af"],
    ["Egypt", "Egito", "af"],
    ["South Africa", "África do Sul", "af"],
    ["New Zealand", "Nova Zelândia", "oc"],
  ].map(([country, name, region]) => ({
    id: "nt-" + country,
    country,
    name,
    region,
  }));
  const countries = definitions.map((n) => [n.country, n.name]);
  const cache = new WeakMap();
  function players(s) {
    const key = s.season + ":" + s.today,
      old = cache.get(s);
    if (old?.key === key) return old.players;
    const list = [
      ...s.teams.flatMap((t) => [...t.players, ...t.youth]),
      ...s.freeAgents,
    ];
    cache.set(s, { key, players: list });
    return list;
  }
  function pool(s, country) {
    return players(s)
      .filter((p) => (p.nationalities || [p.nationality]).includes(country))
      .sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name));
  }
  function best(s, country) {
    const available = pool(s, country).filter((p) => !p.injury),
      chosen = [];
    for (const [pos, count] of [
      ["GOL", 3],
      ["ZAG", 4],
      ["LAT", 4],
      ["VOL", 3],
      ["MEI", 4],
      ["ATA", 5],
    ])
      chosen.push(...available.filter((p) => p.pos === pos).slice(0, count));
    for (const p of available)
      if (chosen.length < 23 && !chosen.includes(p)) chosen.push(p);
    return chosen.slice(0, 23).map((p) => p.id);
  }
  function available(s) {
    return definitions.filter((n) => {
      const ps = pool(s, n.country);
      return ps.length >= 11 && ps.some((p) => p.pos === "GOL");
    });
  }
  function ensure(s) {
    if (!s.national)
      s.national = {
        job: null,
        squads: {},
        fixtures: [],
        results: [],
        season: null,
      };
    s.national.invites ??= [];
    s.national.invitationRevision ??= 0;
    s.national.nextReview ??= Math.max(28, Math.ceil((s.today || 0) / 28) * 28);
    if (s.national.season !== s.season) {
      s.national.nextReview = 28;
      for (const offer of s.national.invites)
        if (offer.status === "pending") offer.status = "expired";
      const ids = available(s).map((n) => n.id);
      if (ids.length % 2) ids.push(null);
      const rotating = [...ids];
      s.national.fixtures = [];
      for (const offset of [5, 33, 61, 117, 173, 229]) {
        for (let i = 0; i < rotating.length / 2; i++) {
          const pair = [rotating[i], rotating[rotating.length - 1 - i]];
          if (pair.every(Boolean))
            s.national.fixtures.push({
              pair,
              offset,
              kind: "national",
              name: "Amistoso internacional",
              competition: "international",
              round: offset,
            });
        }
        if (rotating.length > 2) rotating.splice(1, 0, rotating.pop());
      }
      s.national.season = s.season;
      const own = definitions.find((n) => n.id === s.national.job);
      if (own) s.national.squads[own.id] = best(s, own.country);
    }
    return s.national;
  }
  function team(s, id) {
    const n = definitions.find((n) => n.id === id);
    if (!n) return null;
    const saved = s.national?.job === id ? s.national.squads[id] : null;
    const ids = saved || best(s, n.country),
      map = new Map(pool(s, n.country).map((p) => [p.id, p]));
    return {
      ...n,
      players: ids.map((id) => map.get(id)).filter(Boolean),
      youth: [],
      lineup: s.national?.lineups?.[id] || [],
      tactics: s.national?.plans?.[id],
      isNational: true,
    };
  }
  function review(s, force = false) {
    const n = ensure(s),
      expired = n.invites.filter(
        (o) =>
          o.status === "pending" &&
          (o.season !== s.season || s.today > o.expires),
      );
    expired.forEach((o) => (o.status = "expired"));
    if (!s.clubId || (!force && s.today < n.nextReview)) return null;
    n.nextReview = s.today + 28;
    if (
      n.invites.some((o) => o.status === "pending") ||
      (n.lastInviteSeason === s.season &&
        s.today - (n.lastInviteOffset || 0) < 84)
    )
      return null;
    const club = s.teams.find((t) => t.id === s.clubId),
      l = s.leagues.find((l) => l.id === club.leagueId);
    const ranked = [...l.table].sort(
      (a, b) => b.p - a.p || b.gf - b.ga - (a.gf - a.ga),
    );
    const row = ranked.find((r) => r.id === s.clubId),
      games = row.w + row.d + row.l;
    if (games < 6 && !force) return null;
    if (games < 6 && !s.trophies?.some((t) => t.coachId === "you")) return null;
    const place = ranked.findIndex((r) => r.id === s.clubId) + 1;
    const performance = Math.round(
      (0.5 - (place - 1) / Math.max(1, ranked.length - 1)) * 24,
    );
    const score = s.reputation + performance;
    const candidates = available(s)
      .filter(
        (d) =>
          d.id !== n.job &&
          !n.invites.some(
            (o) => o.selectionId === d.id && o.season === s.season,
          ),
      )
      .map((d) => {
        const ids = best(s, d.country),
          map = new Map(pool(s, d.country).map((p) => [p.id, p]));
        const avg =
          ids
            .slice(0, 11)
            .reduce((sum, id) => sum + (map.get(id)?.ovr || 60), 0) / 11;
        return {
          ...d,
          required: Math.max(35, Math.round(avg - 25)),
          affinity: d.country === s.profile?.nationality ? 3 : 0,
        };
      })
      .filter((d) => score + d.affinity >= d.required)
      .sort(
        (a, b) =>
          b.affinity - a.affinity ||
          b.required - a.required ||
          a.id.localeCompare(b.id),
      );
    const choice = candidates[0];
    if (!choice) return null;
    const offer = {
      id: `invite-${s.season}-${s.today}-${choice.id}`,
      selectionId: choice.id,
      name: choice.name,
      season: s.season,
      offset: s.today,
      expires: s.today + 14,
      status: "pending",
      required: choice.required,
      reason: `A federação destacou seu trabalho no ${club.name}: ${place}º lugar, ${row.w} vitórias e reputação ${s.reputation}.`,
    };
    n.invites.unshift(offer);
    n.invites = n.invites.slice(0, 24);
    n.invitationRevision++;
    n.lastInviteSeason = s.season;
    n.lastInviteOffset = s.today;
    return offer;
  }
  function decline(s, id) {
    const offer = ensure(s).invites.find(
      (o) => o.id === id && o.status === "pending",
    );
    if (!offer) throw Error("Convite indisponível.");
    offer.status = "declined";
  }
  function assume(s, id) {
    if (!s.clubId) throw Error("Comece sua carreira em um clube primeiro.");
    if (s.live && !s.live.done)
      throw Error("Conclua a partida antes de assumir uma seleção.");
    if (!available(s).some((n) => n.id === id))
      throw Error(
        "Seleção sem onze jogadores reais e goleiro disponíveis na base.",
      );
    const n = ensure(s);
    const offer = n.invites.find(
      (o) =>
        o.selectionId === id &&
        o.status === "pending" &&
        o.season === s.season &&
        o.expires >= s.today,
    );
    if (!offer)
      throw Error(
        "Você precisa receber um convite vigente da federação para assumir esta seleção.",
      );
    offer.status = "accepted";
    n.job = id;
    n.squads[id] = best(s, definitions.find((x) => x.id === id).country);
  }
  function call(s, id) {
    const n = ensure(s),
      definition = definitions.find((d) => d.id === n.job);
    if (!definition) throw Error("Assuma uma seleção primeiro.");
    if (s.live && !s.live.done)
      throw Error("Conclua a partida antes de mudar a convocação.");
    const p = pool(s, definition.country).find((p) => p.id === id),
      list = n.squads[n.job];
    if (!p) throw Error("Jogador não elegível para esta seleção.");
    if (list.includes(id)) {
      if (list.length <= 11)
        throw Error("Mantenha pelo menos onze convocados.");
      if (
        p.pos === "GOL" &&
        list.filter(
          (pid) =>
            pool(s, definition.country).find((p) => p.id === pid)?.pos ===
            "GOL",
        ).length <= 1
      )
        throw Error("Mantenha pelo menos um goleiro.");
      n.squads[n.job] = list.filter((pid) => pid !== id);
    } else {
      if (list.length >= 23)
        throw Error("Limite de 23 convocados. Dispense um atleta antes.");
      if (p.injury) throw Error("Jogador lesionado. Escolha outro atleta.");
      list.push(id);
    }
  }
  const api = {
    definitions,
    countries,
    players,
    pool,
    best,
    available,
    ensure,
    team,
    assume,
    review,
    decline,
    call,
  };
  root.LegacyNational = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
