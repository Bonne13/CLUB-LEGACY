"use strict";
// Motor compartilhado pelo navegador e pelos testes. Não depende da interface.
(function (root) {
  const WORLD =
    typeof module !== "undefined" ? require("./world.js") : root.LegacyWorld;
  const REFERENCES =
    typeof module !== "undefined"
      ? require("./calendar-data.js")
      : root.LegacyCalendars;
  const R =
    typeof module !== "undefined"
      ? require("./rosters.js")
      : root.LegacyRosters;
  const F =
    typeof module !== "undefined"
      ? require("./finance.js")
      : root.LegacyFinance;
  const N =
    typeof module !== "undefined"
      ? require("./national.js")
      : root.LegacyNational;
  const T =
    typeof module !== "undefined"
      ? require("./tactics.js")
      : root.LegacyTactics;
  const LEAGUES = WORLD.leagues;
  const CUP_DEFS = [
    {
      id: "champions",
      name: "UEFA Champions League",
      region: "eu",
      prize: 18000000,
      stageGames: 8,
    },
    {
      id: "europa",
      name: "UEFA Europa League",
      region: "eu",
      prize: 8000000,
      stageGames: 8,
    },
    {
      id: "conference",
      name: "UEFA Conference League",
      region: "eu",
      prize: 5000000,
      stageGames: 6,
    },
    {
      id: "libertadores",
      name: "CONMEBOL Libertadores",
      region: "sa",
      prize: 12000000,
      stageGames: 6,
    },
  ];
  const FIRST = [
    "Lucas",
    "Rafael",
    "Gabriel",
    "Matheus",
    "Pedro",
    "André",
    "Bruno",
    "Caio",
    "Diego",
    "Felipe",
    "Igor",
    "João",
    "Marcos",
    "Nicolas",
    "Otávio",
    "Paulo",
    "Renan",
    "Samuel",
    "Daniel",
    "Eduardo",
    "Arthur",
    "Henrique",
    "Tomás",
    "Enzo",
    "Miguel",
    "Leonardo",
    "Alex",
    "Victor",
    "Davi",
    "Gustavo",
    "Hugo",
    "Vinícius",
  ];
  const LAST = [
    "Almeida",
    "Barros",
    "Costa",
    "Dias",
    "Esteves",
    "Ferreira",
    "Gomes",
    "Henrique",
    "Lima",
    "Mendes",
    "Nunes",
    "Oliveira",
    "Pereira",
    "Queiroz",
    "Ramos",
    "Silva",
    "Teixeira",
    "Vieira",
    "Cardoso",
    "Moura",
    "Duarte",
    "Rocha",
    "Pinto",
    "Castro",
    "Reis",
    "Santos",
    "Andrade",
    "Cunha",
    "Farias",
    "Torres",
    "Lopes",
    "Neves",
  ];
  const POS = [
    "GOL",
    "LAT",
    "ZAG",
    "ZAG",
    "LAT",
    "VOL",
    "MEI",
    "MEI",
    "ATA",
    "ATA",
    "ATA",
    "GOL",
    "LAT",
    "ZAG",
    "ZAG",
    "LAT",
    "VOL",
    "MEI",
    "MEI",
    "ATA",
    "ATA",
    "ATA",
  ];
  const FORMATION = [
    "GOL",
    "LAT",
    "ZAG",
    "ZAG",
    "LAT",
    "VOL",
    "MEI",
    "MEI",
    "ATA",
    "ATA",
    "ATA",
  ];
  const fail = (m) => {
    throw new Error(m);
  };
  const copy = (x) => JSON.parse(JSON.stringify(x));
  function fixtures(ids, single = false) {
    const a = [...ids];
    if (a.length % 2) a.push(null);
    const rounds = [];
    for (let r = 0; r < a.length - 1; r++) {
      const pairs = [];
      for (let i = 0; i < a.length / 2; i++) {
        const pair =
          r % 2 ? [a[a.length - 1 - i], a[i]] : [a[i], a[a.length - 1 - i]];
        if (!pair.includes(null)) pairs.push(pair);
      }
      rounds.push(pairs);
      a.splice(1, 0, a.pop());
    }
    return single
      ? rounds
      : rounds.concat(rounds.map((p) => p.map(([a, b]) => [b, a])));
  }
  function calendar() {
    const days = [],
      cupAfter = [1, 3, 5, 7, 9, 11, 13, 15, 19, 23, 27, 31, 37];
    for (let r = 0; r < 38; r++) {
      days.push({ kind: "league", round: r, offset: r * 7 });
      if (cupAfter.includes(r))
        days.push({
          kind: "cup",
          round: cupAfter.indexOf(r),
          offset: r * 7 + 3,
        });
    }
    return days;
  }
  function formatDate(s, offset) {
    return new Date(Date.UTC(s.season, 1, 1 + offset)).toLocaleDateString(
      "pt-BR",
      { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" },
    );
  }
  function date(s, day) {
    if (day !== undefined) {
      const event = calendar()[day];
      return event ? formatDate(s, event.offset) : "Fim da temporada";
    }
    return formatDate(s, s.today ?? calendar()[s.day]?.offset ?? 0);
  }
  const blankTable = (ids) =>
    ids.map((id) => ({ id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }));
  const rank = (table) =>
    [...table].sort(
      (a, b) =>
        b.p - a.p ||
        b.gf - b.ga - (a.gf - a.ga) ||
        b.gf - a.gf ||
        a.id.localeCompare(b.id),
    );
  const team = (s, id = s.clubId) =>
    s.teams.find((t) => t.id === id) || N.team(s, id);
  const league = (s, id) => s.leagues.find((l) => l.id === id);
  function leaguePhase(ids, games) {
    const rounds = [];
    for (const step of [1, 3, 5, 7].slice(0, games / 2)) {
      const visited = new Set(),
        first = [],
        second = [];
      for (let start = 0; start < ids.length; start++) {
        if (visited.has(start)) continue;
        const cycle = [];
        let n = start;
        while (!visited.has(n)) {
          cycle.push(n);
          visited.add(n);
          n = (n + step) % ids.length;
        }
        for (let j = 0; j < cycle.length; j++)
          (j % 2 ? second : first).push([
            ids[cycle[j]],
            ids[cycle[(j + 1) % cycle.length]],
          ]);
      }
      rounds.push(first, second);
    }
    return rounds;
  }
  function selectCups(s) {
    const eu = s.leagues.filter((l) => l.region === "eu"),
      sa = s.leagues.filter((l) => l.region === "sa");
    const euPool = [],
      saPool = [];
    for (let place = 0; place < 18; place++)
      eu.forEach((l) => {
        if (l.ranking[place]) euPool.push(l.ranking[place]);
      });
    for (let place = 0; place < 6; place++)
      sa.forEach((l) => {
        if (l.ranking[place]) saPool.push(l.ranking[place]);
      });
    return CUP_DEFS.map((d, i) => {
      const entrants =
        d.region === "sa"
          ? saPool.slice(0, 32)
          : euPool.slice(i * 36, i * 36 + 36);
      const c = {
        ...d,
        entrants,
        table: blankTable(entrants),
        rounds: [],
        champion: null,
      };
      if (d.region === "sa") {
        c.groups = Array.from({ length: 8 }, (_, j) =>
          entrants.filter((_, n) => n % 8 === j),
        );
        c.stageFixtures = Array.from({ length: 6 }, (_, r) =>
          c.groups.flatMap((g) => fixtures(g)[r]),
        );
      } else c.stageFixtures = leaguePhase(entrants, d.stageGames);
      return c;
    });
  }
  function cupPairs(c, phase) {
    if (phase < c.stageGames) return c.stageFixtures[phase] || [];
    if (phase < 8) return [];
    return c.rounds.find((r) => r.phase === phase)?.pairs || [];
  }
  function prepareKnockouts(s, phase) {
    if (phase < 8) return;
    s.cups.forEach((c) => {
      if (c.rounds.some((r) => r.phase === phase)) return;
      if (c.region === "sa" && phase === 8) return;
      let pairs = [];
      if (phase === 8) {
        const order = rank(c.table).map((r) => r.id);
        c.byes = order.slice(0, 8);
        const playoff = order.slice(8, 24);
        pairs = Array.from({ length: 8 }, (_, i) => [
          playoff[i],
          playoff[15 - i],
        ]);
      } else if (phase === 9) {
        if (c.region === "sa") {
          const first = c.groups.map(
              (g) => rank(c.table.filter((r) => g.includes(r.id)))[0].id,
            ),
            second = c.groups.map(
              (g) => rank(c.table.filter((r) => g.includes(r.id)))[1].id,
            );
          pairs = first.map((id, i) => [id, second[(i + 1) % 8]]);
        } else {
          const winners = c.rounds
            .find((r) => r.phase === 8)
            .results.map((r) => r.winner);
          pairs = c.byes.map((id, i) => [id, winners[7 - i]]);
        }
      } else {
        const previous = c.rounds.find((r) => r.phase === phase - 1);
        const winners = previous.results.map((r) => r.winner);
        pairs = Array.from({ length: winners.length / 2 }, (_, i) => [
          winners[i * 2],
          winners[i * 2 + 1],
        ]);
      }
      c.rounds.push({ phase, pairs, results: [] });
    });
  }
  function fresh() {
    const s = {
      version: 3,
      mode: "normal",
      testFundingTotal: 0,
      today: 0,
      season: R.DATA.initialSeason || 2025,
      rosterRevision: R.DATA.revision || "historical-1",
      day: 0,
      clubId: null,
      tactic: "Equilibrado",
      training: "Técnica",
      reputation: 40,
      news: ["Bem-vindo. Escolha seu clube para construir um legado."],
      history: [],
      transfers: [],
      coachMoves: [],
      offers: [],
      freeAgents: [],
      live: null,
      last: null,
    };
    s.teams = LEAGUES.flatMap((l, li) =>
      l.clubs.map((name, i) => {
        const id = l.id + "-" + i;
        return {
          id,
          name,
          leagueId: l.id,
          money: 0,
          facility: 1,
          stadium: 1,
          manager: id + "-coach",
          players: R.roster(id, s.season),
          youth: [],
          lineup: [],
          rosterReference: copy(
            R.DATA.teams[id]?.rosterReference || {
              source: "historical",
              date: null,
              kind: "historical",
            },
          ),
        };
      }),
    );
    s.leagues = LEAGUES.map((l) => ({
      ...l,
      ids: s.teams.filter((t) => t.leagueId === l.id).map((t) => t.id),
    })).map((l) => ({
      ...l,
      table: blankTable(l.ids),
      ranking: [...l.ids],
      fixtures:
        (l.referenceCompatible !== false ? REFERENCES?.[l.id]?.rounds : null) ||
        fixtures(l.ids, l.single),
    }));
    s.coaches = s.teams.map((t, i) => ({
      id: t.manager,
      name: FIRST[(i + 9) % 32] + " " + LAST[(i * 3) % 32],
      reputation: 45 + (i % 35),
      contract: s.season + 2,
      clubId: t.id,
    }));
    s.teams.forEach((t) => {
      // A base contém somente atletas reais já associados ao clube na fonte.
      const eligible = t.players
        .filter((p) => p.age < 20 && p.pos !== "GOL")
        .slice(0, Math.max(0, Math.min(4, t.players.length - 22)));
      t.youth = eligible;
      t.players = t.players.filter((p) => !eligible.includes(p));
      t.rosterCoverage = R.DATA.teams[t.id]?.players.length || 0;
      F.init(t, s);
    });
    s.cups = selectCups(s);
    s.dataRevision = R.DATA.revision || "historical-1";
    N.ensure(s);
    return s;
  }
  function setProfile(s, profile) {
    const name = String(profile.name || "").trim(),
      age = Number(profile.age),
      nationality = profile.nationality;
    if (name.length < 2 || name.length > 60 || /[\x00-\x1f]/.test(name))
      fail("Informe um nome de 2 a 60 caracteres.");
    if (!Number.isInteger(age) || age < 18 || age > 85)
      fail("A idade do treinador deve estar entre 18 e 85 anos.");
    if (!N.countries.some(([country]) => country === nationality))
      fail("Escolha uma nacionalidade disponível.");
    const result = { name, birthYear: s.season - age, nationality };
    s.profile = result;
    const coach = s.coaches.find((c) => c.id === "you");
    if (coach) Object.assign(coach, result);
    return result;
  }
  function prepareCareer(s) {
    s.mode ??= "normal";
    s.rosterRevision ??= "legacy-preserved";
    s.testFundingTotal ??= 0;
    // Atualiza metadados de identidades existentes sem desfazer transferências ou evolução.
    const rows = new Map(
      Object.values(R.DATA.teams)
        .flatMap((t) => t.players)
        .map((row) => [/^\d+$/.test(row[0]) ? "tm-" + row[0] : row[0], row]),
    );
    const existing = [
      ...s.teams.flatMap((t) => [...t.players, ...t.youth]),
      ...s.freeAgents,
    ];
    for (const p of existing) {
      const row = rows.get(p.id);
      if (row && !p.nationalities) {
        const ref = R.make(row, s.season, "");
        p.nationalities = ref.nationalities;
        p.nationality = ref.nationality;
        p.dataSource = ref.dataSource;
        p.ageEstimated = ref.ageEstimated;
      }
    }
    if (!R.DATA.revision && s.dataRevision !== "historical-1") {
      const ids = new Set(existing.map((p) => p.id));
      if (s.season === 2025)
        for (const t of s.teams)
          for (const p of R.roster(t.id, s.season))
            if (!ids.has(p.id) && p.dataSource.startsWith("sofifa-")) {
              t.players.push(p);
              ids.add(p.id);
            }
      s.dataRevision = "historical-1";
      if (s.rosterRecovery && team(s)?.players.length >= 11) {
        s.rosterRecovery = false;
        s.offers = [];
      }
    }
    if (!s.profile) {
      const coach = s.coaches.find((c) => c.id === "you");
      setProfile(s, {
        name: coach?.name || "Você",
        age: 35,
        nationality: "Brazil",
      });
    }
    s.teams.forEach((t) => T.ensure(t));
    if (s.clubId) T.ensure(team(s)).mentality = s.tactic;
    N.ensure(s);
    if (s.live && !s.live.done) {
      const fixture = nextFixture(s);
      if (
        s.live.offset == null &&
        s.live.day === s.day &&
        fixture &&
        s.live.pair?.join("|") === fixture.pair.join("|")
      )
        s.live.offset = s.today;
      if (!currentMatch(s).active) {
        s.interruptedMatchArchive = s.live;
        s.live = null;
        news(s, "Uma partida antiga fora da data atual foi arquivada.", {
          body: "O calendário atual foi preservado. Nenhum placar extra foi lançado.",
        });
      }
    }
    return s;
  }
  function assumeNational(s, id) {
    N.assume(s, id);
    news(
      s,
      `${s.profile?.name || "Você"} assume a seleção de ${team(s, id).name}.`,
      {
        category: "coaches",
        clubIds: [s.clubId, id],
        body: "O treinador acumula a função no clube e na seleção. Convocações e amistosos são simulados.",
      },
    );
  }
  function start(
    s,
    id,
    profile = { name: "Você", age: 35, nationality: "Brazil" },
    mode = "normal",
  ) {
    if (s.clubId) fail("A carreira já foi iniciada.");
    const t = team(s, id);
    if (!t) fail("Clube inválido.");
    if (t.players.length < 11)
      fail(
        "Este clube ainda não tem onze atletas confirmados na base. Escolha um clube com elenco disponível.",
      );
    if (!["normal", "test"].includes(mode)) fail("Modo de carreira inválido.");
    setProfile(s, profile);
    s.mode = mode;
    const previous = s.coaches.find((c) => c.id === t.manager);
    previous.clubId = null;
    const coach = {
      id: "you",
      ...s.profile,
      reputation: s.reputation,
      contract: s.season + 2,
      clubId: id,
    };
    s.coaches.push(coach);
    t.manager = "you";
    s.clubId = id;
    news(s, `Você assumiu o comando de ${t.name}.`, {
      category: "coaches",
      body: `O novo treinador assume o elenco e a gestão do clube, com contrato até ${coach.contract}.`,
      clubIds: [id],
    });
    return s;
  }
  function articleMeta(s, clubIds = [], competitionId = null) {
    const ids = [...new Set(clubIds)].filter((id) => team(s, id));
    const regions = [
      ...new Set(
        ids
          .map(
            (id) =>
              team(s, id).region || league(s, team(s, id).leagueId)?.region,
          )
          .filter(Boolean),
      ),
    ];
    const competition = s.cups.find((c) => c.id === competitionId);
    if (competition && !regions.includes(competition.region))
      regions.push(competition.region);
    return { clubIds: ids, competitionId, regions };
  }
  function ensureJournal(s) {
    if (Array.isArray(s.articles)) return;
    s.articleSequence = 0;
    s.articles = (s.news || [])
      .slice(0, 70)
      .filter((title) => !title.startsWith("Bem-vindo. Escolha seu clube"))
      .map((title) => {
        const ids = s.teams
          .filter((t) => title.includes(t.name))
          .map((t) => t.id);
        return {
          id: "archive-" + ++s.articleSequence,
          season: s.season,
          day: s.day,
          offset: s.today,
          title,
          body: "",
          category: "club",
          ...articleMeta(s, ids.length ? ids : [s.clubId]),
        };
      });
  }
  function news(s, text, details = {}) {
    ensureJournal(s);
    s.news.unshift(text);
    s.news = s.news.slice(0, 70);
    s.articleSequence = (s.articleSequence || 0) + 1;
    s.articles.unshift({
      id: "news-" + s.articleSequence,
      season: s.season,
      day: s.day,
      offset: s.today,
      title: text,
      body: details.body || "",
      category: details.category || "club",
      ...articleMeta(
        s,
        details.clubIds || [s.clubId],
        details.competitionId || null,
      ),
    });
    s.articles = s.articles.slice(0, 180);
  }
  function journal(s, scope = "club", category = "all") {
    if (!s.clubId) return [];
    ensureJournal(s);
    const own = team(s),
      ownLeague = league(s, own.leagueId);
    const articles = [...s.articles];
    for (const h of s.history)
      for (const r of h.results) {
        const [home, away] = r.pair.map((id) => team(s, id)),
          [a, b] = r.goals;
        const title =
          a === b
            ? `${home.name} e ${away.name} empatam por ${a} a ${b}`
            : `${a > b ? home.name : away.name} vence ${a > b ? away.name : home.name} por ${Math.max(a, b)} a ${Math.min(a, b)}`;
        const shootout = r.penalties
          ? ` Nos pênaltis, ${team(s, r.winner).name} avançou por ${r.penalties.join(" a ")}.`
          : "";
        articles.push({
          id: `result-${h.season}-${h.day}-${r.competition}-${r.pair[0]}`,
          season: h.season,
          day: h.day,
          offset: h.offset ?? calendar()[h.day]?.offset,
          title,
          body: `${r.name}. ${home.name} foi o mandante. Placar: ${a} a ${b}.${shootout}`,
          category: "results",
          ...articleMeta(s, r.pair, r.competition),
        });
      }
    if (dayInfo(s))
      for (const f of allFixtures(s)) {
        articles.push({
          id: `preview-${s.season}-${s.day}-${f.competition}-${f.pair[0]}`,
          season: s.season,
          day: s.day,
          offset: s.today,
          title: `${team(s, f.pair[0]).name} recebe ${team(s, f.pair[1]).name}`,
          body: `${f.name}: o confronto está marcado para ${date(s)} no calendário da carreira. ${f.kind === "league" ? "O resultado contará para a classificação nacional." : f.kind === "cup" ? "Quem vencer avança; empate leva aos pênaltis." : "O resultado contará para a classificação da fase inicial."}`,
          category: "preview",
          ...articleMeta(s, f.pair, f.competition),
        });
      }
    let filtered = articles.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (scope === "club")
        return (
          a.clubIds.includes(s.clubId) || a.clubIds.includes(s.national?.job)
        );
      if (scope === "league")
        return (
          a.competitionId === ownLeague.id ||
          a.clubIds.some((id) => team(s, id)?.leagueId === ownLeague.id)
        );
      return a.regions.includes(ownLeague.region);
    });
    // As prévias não devem esconder resultados e movimentações já publicados.
    if (category === "all") {
      const previews = filtered
        .filter((a) => a.category === "preview")
        .sort(
          (a, b) =>
            Number(b.clubIds.includes(s.clubId)) -
            Number(a.clubIds.includes(s.clubId)),
        );
      const visible = new Set(),
        competitions = new Set(),
        limit = scope === "club" ? 1 : scope === "league" ? 3 : 12;
      for (const a of previews) {
        if (visible.size >= limit) break;
        if (scope === "continent" && competitions.has(a.competitionId))
          continue;
        visible.add(a.id);
        competitions.add(a.competitionId);
      }
      filtered = filtered.filter(
        (a) => a.category !== "preview" || visible.has(a.id),
      );
    }
    return filtered
      .sort(
        (a, b) =>
          b.season - a.season ||
          b.day - a.day ||
          Number(a.category === "preview") - Number(b.category === "preview"),
      )
      .slice(0, 80);
  }

  function lineup(t) {
    return T.positions(t).filter(Boolean);
  }
  function strength(t) {
    return T.ratings(t).strength;
  }
  function currentMatch(s) {
    const fixture = nextFixture(s),
      m = s.live;
    const active = Boolean(
      m &&
        !m.done &&
        m.offset === s.today &&
        m.day === s.day &&
        fixture &&
        fixture.pair.join("|") === m.pair.join("|"),
    );
    return { fixture, active, available: Boolean(fixture || active) };
  }
  function matchPlans(s, m) {
    return m.pair.map((id) => {
      const t = team(s, id),
        plan = copy(T.ensure(t)),
        starters = lineup(t),
        responsible = T.specialists(t, starters);
      if (id === s.clubId && m.kind !== "national") plan.mentality = s.tactic;
      return {
        name: t.name,
        ...T.ratings(t),
        instructions: plan,
        slots: copy(T.slots(t)),
        starters: starters.map((p) => ({
          id: p.id,
          name: p.name,
          pos: p.pos,
          ovr: p.ovr,
          skills: T.skills(p),
        })),
        specialists: Object.fromEntries(
          Object.entries(responsible).map(([key, p]) => [
            key,
            p ? { id: p.id, name: p.name, skills: T.skills(p) } : null,
          ]),
        ),
      };
    });
  }
  function dayInfo(s) {
    const event = calendar()[s.day];
    if (!event) return null;
    const today = s.today ?? event.offset;
    return today === event.offset
      ? event
      : { kind: "rest", offset: today, round: Math.floor(today / 7) };
  }
  function upcomingFixture(s) {
    for (let offset = s.today; offset <= calendar().at(-1).offset; offset++) {
      const event = calendar().findIndex((d) => d.offset >= offset);
      if (event < 0) break;
      const f = nextFixture({ ...s, day: event, today: offset });
      if (f) return { ...f, event, offset };
    }
    return null;
  }
  function simulate(s, amount, unit = "days", rng = Math.random) {
    if (
      !Number.isInteger(amount) ||
      amount < 1 ||
      amount > 365 ||
      !["days", "weeks"].includes(unit)
    )
      fail("Escolha um período válido: 1 a 365 dias ou semanas.");
    if (s.live && !s.live.done)
      fail(
        "Conclua ou pause a gestão da partida antes de simular o calendário.",
      );
    if (s.live?.done) s.live = null;
    const limit = Math.min(365, amount * (unit === "weeks" ? 7 : 1));
    let advanced = 0;
    while (advanced < limit && dayInfo(s) && !nextFixture(s)) {
      advance(s, rng);
      advanced++;
    }
    return {
      advanced,
      stoppedForMatch: Boolean(nextFixture(s)),
      finished: !dayInfo(s),
    };
  }
  const roundName = (r) =>
    r < 8
      ? "Fase de liga / grupos"
      : {
          8: "Playoffs",
          9: "Oitavas de final",
          10: "Quartas de final",
          11: "Semifinal",
          12: "Final",
        }[r];
  function clubFixtures(s) {
    const day = dayInfo(s);
    if (!day || day.kind === "rest") return [];
    if (day.kind === "league")
      return s.leagues.flatMap((l) =>
        (l.fixtures[day.round] || []).map((pair) => ({
          pair,
          competition: l.id,
          name: l.name,
          kind: "league",
          round: day.round,
          referenceDate:
            l.referenceCompatible === false
              ? null
              : REFERENCES?.[l.id]?.matches.find(
                  (m) => m.pair[0] === pair[0] && m.pair[1] === pair[1],
                )?.date || null,
        })),
      );
    return s.cups.flatMap((c) =>
      cupPairs(c, day.round).map((pair) => ({
        pair,
        competition: c.id,
        name: c.name,
        kind: day.round < c.stageGames ? "group" : "cup",
        round: day.round,
      })),
    );
  }
  function allFixtures(s) {
    return [
      ...clubFixtures(s),
      ...(s.national?.fixtures || []).filter((f) => f.offset === s.today),
    ];
  }
  const managed = (s, f) =>
    f.kind === "national"
      ? Boolean(s.national?.job && f.pair.includes(s.national.job))
      : f.pair.includes(s.clubId);
  const nextFixture = (s) => allFixtures(s).find((f) => managed(s, f)) || null;
  function makeMatch(s, mode = "text") {
    if (s.live && !s.live.done) {
      if (!currentMatch(s).active)
        fail(
          "A partida recuperada não pertence à data atual. Importe um save compatível.",
        );
      return s.live;
    }
    const f = nextFixture(s);
    if (!f) fail("Seu clube não joga nesta data. Avance o calendário.");
    if (
      lineup(team(s, f.kind === "national" ? s.national.job : s.clubId))
        .length < 11
    )
      fail(
        "Você precisa de 11 jogadores disponíveis. Contrate ou promova atletas da base.",
      );
    s.live = {
      ...copy(f),
      day: s.day,
      offset: s.today,
      mode,
      minute: 0,
      goals: [0, 0],
      shots: [0, 0],
      events: ["A bola está rolando!"],
      done: false,
    };
    s.live.plans = matchPlans(s, s.live);
    s.live.events.push(
      ...s.live.plans.map(
        (p) =>
          `Capitão de ${p.name}: ${p.specialists.captain?.name || "não definido"}.`,
      ),
    );
    return s.live;
  }
  function minute(s, m, rng = Math.random) {
    if (m.done || m.minute >= 90) return;
    if (!m.plans) m.plans = matchPlans(s, m);
    m.minute++;
    const pace = (p) =>
      p.instructions.tempo === "Rápido"
        ? 0.035
        : p.instructions.tempo === "Lento"
          ? -0.035
          : 0;
    const ambition = (p) =>
      p.instructions.mentality === "Ofensivo"
        ? 0.025
        : p.instructions.mentality === "Defensivo"
          ? -0.025
          : 0;
    const shotRate =
      0.24 +
      (pace(m.plans[0]) + pace(m.plans[1])) / 2 +
      (ambition(m.plans[0]) + ambition(m.plans[1])) / 2;
    if (rng() < shotRate) {
      const side =
        rng() <
        Math.max(
          0.25,
          Math.min(
            0.75,
            0.52 + (m.plans[0].strength - m.plans[1].strength) / 240,
          ),
        )
          ? 0
          : 1;
      const own = m.plans[side],
        opponent = m.plans[1 - side],
        kind = rng(),
        delta = own.strength - opponent.strength;
      let chance =
          0.14 + delta / 200 + ambition(own) + own.attack - opponent.defense,
        type = "jogada",
        taker = null;
      if (
        own.instructions.style === "Contra-ataque" &&
        opponent.instructions.line === "Alta"
      )
        chance += 0.025;
      if (
        own.instructions.style === "Posse de bola" &&
        opponent.instructions.pressing === "Baixa"
      )
        chance += 0.015;
      if (
        own.instructions.style === "Jogo direto" &&
        opponent.instructions.line === "Alta"
      )
        chance += 0.015;
      if (own.instructions.pressing === "Alta")
        chance += m.minute < 60 ? 0.01 : -0.01;
      if (
        own.instructions.width === "Aberta" &&
        own.instructions.style === "Jogo direto"
      )
        chance += 0.01;
      chance += (own.specialists.captain?.skills.leadership - 65 || 0) / 5000;
      if (kind < 0.012) {
        type = "pênalti";
        taker = own.specialists.penalties;
        chance = 0.7 + ((taker?.skills.penalties || 55) - 65) / 200;
      } else if (kind < 0.09) {
        type = "falta direta";
        taker = own.specialists.freeKicks;
        chance =
          0.08 + ((taker?.skills.freeKicks || 55) - 65) / 500 + delta / 1000;
      } else if (kind < 0.3) {
        type = "escanteio";
        taker =
          kind < 0.195
            ? own.specialists.cornersLeft
            : own.specialists.cornersRight;
        chance =
          0.075 + ((taker?.skills.crossing || 55) - 65) / 700 + delta / 500;
      }
      chance = Math.max(0.025, Math.min(0.9, chance));
      const attackers = own.starters.filter((p) =>
          ["ATA", "MEI"].includes(p.pos),
        ),
        pool = attackers.length ? attackers : own.starters;
      const scorer =
        type === "pênalti" || type === "falta direta"
          ? taker
          : pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
      m.shots[side]++;
      const detail =
        type === "escanteio"
          ? `escanteio cobrado por ${taker?.name || own.name}`
          : type;
      if (rng() < chance) {
        m.goals[side]++;
        m.events.unshift(
          `${m.minute}' — GOL de ${scorer?.name || own.name} (${own.name}) · ${detail}!`,
        );
      } else
        m.events.unshift(
          `${m.minute}' — ${own.name}: ${type === "jogada" ? scorer?.name || "o ataque" : taker?.name || "o cobrador"} tenta ${detail}; ${rng() < 0.5 ? "a bola sai" : "o goleiro defende"}.`,
        );
    }
    m.events = m.events.slice(0, 45);
  }
  function score(s, f, rng) {
    const m = { ...f, minute: 0, goals: [0, 0], shots: [0, 0], events: [] };
    while (m.minute < 90) minute(s, m, rng);
    return m.goals;
  }
  function record(table, pair, g) {
    const [a, b] = pair.map((id) => table.find((t) => t.id === id));
    a.gf += g[0];
    a.ga += g[1];
    b.gf += g[1];
    b.ga += g[0];
    if (g[0] === g[1]) {
      a.d++;
      b.d++;
      a.p++;
      b.p++;
    } else {
      const [w, l] = g[0] > g[1] ? [a, b] : [b, a];
      w.w++;
      w.p += 3;
      l.l++;
    }
  }
  function windowOpen(s) {
    const d = dayInfo(s);
    if (!d) return true;
    const r = d.kind === "league" ? d.round : Math.floor((d.offset || 0) / 7);
    return r <= 5 || (r >= 17 && r <= 21);
  }
  function train(s, t, rng, played = false, international = new Map()) {
    const mode = t.id === s.clubId ? s.training : "Técnica",
      starters = played
        ? lineup(t)
        : t.players.filter((p) => international.has(p.id)),
      fatigue = played ? T.ratings(t).fatigue : 0;
    for (const p of t.players) {
      if (p.injury) p.injury--;
      p.fitness = Math.max(
        45,
        Math.min(
          100,
          p.fitness +
            (starters.includes(p)
              ? -(12 + (international.get(p.id) ?? fatigue))
              : mode === "Recuperação"
                ? 10
                : mode === "Intensivo"
                  ? 2
                  : 5),
        ),
      );
      if (starters.includes(p) && !p.injury && rng() < 0.012) {
        p.injury = 2 + Math.floor(rng() * 5);
        if (t.id === s.clubId)
          news(s, `${p.name} se lesionou: ${p.injury} dias de recuperação.`, {
            category: "training",
            body: "O atleta ficará fora enquanto se recupera.",
          });
      }
      if (
        (s.today + 1) % 7 === 0 &&
        mode !== "Recuperação" &&
        rng() <
          (p.age < 24 ? 0.22 : 0.06) *
            (mode === "Intensivo" ? 1.4 : 1) *
            (1 + (t.facility - 1) * 0.2)
      )
        p.ovr = Math.min(p.potential, p.ovr + 1);
    }
    if ((s.today + 1) % 7 === 0)
      t.youth.forEach((p) => {
        if (rng() < 0.3 + t.facility * 0.03)
          p.ovr = Math.min(p.potential, p.ovr + 1);
      });
  }
  function ensureAI(s, t) {
    while (t.players.length < 16 && t.youth.length) {
      const p = t.youth.shift();
      p.contract = Math.max(p.contract, s.season + 1);
      t.players.push(p);
    }
  }
  function advance(s, rng = Math.random) {
    const d = dayInfo(s);
    if (!d) fail("A temporada terminou. Inicie a próxima.");
    const own = nextFixture(s),
      m = s.live;
    if (
      own &&
      (!m ||
        m.minute < 90 ||
        m.day !== s.day ||
        (m.offset != null && m.offset !== s.today))
    )
      fail("Conclua a partida antes de avançar.");
    const results = [];
    const participants = new Set(),
      international = new Map();
    for (const f of allFixtures(s)) {
      if (f.kind !== "national") f.pair.forEach((id) => participants.add(id));
      const g = managed(s, f) ? [...m.goals] : score(s, f, rng);
      const entry = { ...copy(f), goals: g, winner: null, penalties: null };
      if (f.kind === "national") {
        const plans = managed(s, f) && m.plans ? m.plans : matchPlans(s, f);
        for (const plan of plans)
          for (const p of plan.starters) international.set(p.id, plan.fatigue);
        s.national.results.push({
          ...entry,
          season: s.season,
          offset: s.today,
        });
        if (managed(s, f))
          news(
            s,
            `${team(s, f.pair[0]).name} ${g[0]} × ${g[1]} ${team(s, f.pair[1]).name}`,
            {
              category: "results",
              clubIds: [s.clubId, ...f.pair],
              body: "Amistoso internacional. Resultado registrado no histórico da seleção.",
            },
          );
      } else if (f.kind === "league") {
        record(league(s, f.competition).table, f.pair, g);
        F.gate(team(s, f.pair[0]), s);
      } else if (f.kind === "group") {
        record(s.cups.find((c) => c.id === f.competition).table, f.pair, g);
        f.pair.forEach((id) =>
          F.post(team(s, id), s, 200000, "prize", `Participação · ${f.name}`),
        );
      } else {
        if (g[0] === g[1]) {
          const win = rng() < 0.5 ? 0 : 1;
          entry.penalties = win === 0 ? [5, 4] : [4, 5];
          entry.winner = f.pair[win];
        } else entry.winner = f.pair[g[0] > g[1] ? 0 : 1];
        f.pair.forEach((id) =>
          F.post(
            team(s, id),
            s,
            250000,
            "prize",
            `Participação em mata-mata · ${f.name}`,
          ),
        );
        const c = s.cups.find((c) => c.id === f.competition);
        c.rounds.find((r) => r.phase === d.round).results.push(entry);
        if (d.round === 12) {
          c.champion = entry.winner;
          F.post(
            team(s, entry.winner),
            s,
            c.prize,
            "prize",
            `Título · ${c.name}`,
          );
          news(s, `${team(s, entry.winner).name} venceu a ${c.name}!`, {
            category: "competitions",
            clubIds: entry.pair,
            competitionId: c.id,
            body: `O campeão recebe R$ ${c.prize.toLocaleString("pt-BR")} em premiação.`,
          });
        }
      }
      if (f.kind !== "national" && g[0] !== g[1])
        F.winBonus(team(s, f.pair[g[0] > g[1] ? 0 : 1]), s);
      results.push(entry);
    }
    s.teams.forEach((t) => {
      F.daily(t, s);
      train(s, t, rng, participants.has(t.id), international);
      if (t.id !== s.clubId) ensureAI(s, t);
    });
    for (const p of [...s.freeAgents, ...s.teams.flatMap((t) => t.youth)]) {
      if (p.injury) p.injury--;
      p.fitness = Math.max(
        45,
        Math.min(
          100,
          p.fitness +
            (international.has(p.id) ? -(12 + international.get(p.id)) : 5),
        ),
      );
    }
    const ownResult = results.find((r) => managed(s, r));
    if (ownResult) {
      s.last = ownResult;
      s.news.unshift(
        `${team(s, ownResult.pair[0]).name} ${ownResult.goals[0]} × ${ownResult.goals[1]} ${team(s, ownResult.pair[1]).name}${ownResult.penalties ? " · pênaltis " + ownResult.penalties.join("–") : ""}.`,
      );
      s.news = s.news.slice(0, 70);
      if (m) {
        m.done = true;
        m.penalties = ownResult.penalties;
        m.events.unshift("Fim de jogo. Resultado e calendário salvos.");
      }
    }
    if (results.length)
      s.history.push({
        season: s.season,
        day: s.day,
        offset: s.today,
        results,
      });
    s.history = s.history.filter((h) => h.season === s.season).slice(-6);
    if (d.kind !== "rest") s.day++;
    s.today = (s.today ?? d.offset) + 1;
    const next = calendar()[s.day];
    if (next?.kind === "cup") prepareKnockouts(s, next.round);
    if (!next) seasonEnd(s, rng);
    return results;
  }
  function seasonEnd(s, rng) {
    const my = team(s);
    const position =
      rank(league(s, my.leagueId).table).findIndex((t) => t.id === my.id) + 1;
    s.reputation = Math.max(
      15,
      Math.min(
        99,
        s.reputation +
          (Math.ceil(league(s, my.leagueId).ids.length / 2) - position) * 2,
      ),
    );
    s.leagues.forEach((l) => {
      l.ranking = rank(l.table).map((t) => t.id);
      F.post(
        team(s, l.ranking[0]),
        s,
        3500000,
        "prize",
        `Título nacional · ${l.name}`,
      );
      news(
        s,
        `${team(s, l.ranking[0]).name} é campeão da ${l.name} ${s.season}.`,
        {
          category: "competitions",
          clubIds: [l.ranking[0]],
          competitionId: l.id,
          body: `O título foi confirmado ao término da temporada, com ${rank(l.table)[0].p} pontos. A premiação é de R$ 3,5 milhões.`,
        },
      );
    });
    const you = s.coaches.find((c) => c.id === "you");
    you.reputation = s.reputation;
    // Clubes do último quarto trocam de treinador ao fim da temporada.
    s.leagues.forEach((l) =>
      l.ranking.slice(-Math.ceil(l.ids.length / 5)).forEach((id) => {
        const t = team(s, id);
        if (id === s.clubId) return;
        const old = s.coaches.find((c) => c.id === t.manager);
        old.clubId = null;
        const candidates = s.coaches
          .filter((c) => !c.clubId && c.id !== "you" && c.id !== old.id)
          .sort((a, b) => b.reputation - a.reputation);
        const incoming = candidates[0] || old;
        incoming.clubId = id;
        incoming.contract = s.season + 2;
        t.manager = incoming.id;
        news(s, `${incoming.name} assume o comando de ${t.name}`, {
          category: "coaches",
          clubIds: [id],
          body: `${old.name} deixa o cargo após a temporada. O novo contrato vai até ${incoming.contract}.`,
        });
        s.coachMoves.unshift({
          season: s.season,
          clubId: id,
          from: old.name,
          to: incoming.name,
        });
      }),
    );
    s.coachMoves = s.coachMoves.slice(0, 50);
    const options = s.teams.filter(
      (t) =>
        t.id !== s.clubId &&
        t.players.length >= 11 &&
        rank(league(s, t.leagueId).table).findIndex((r) => r.id === t.id) >=
          Math.max(0, 5 - Math.floor(s.reputation / 20)),
    );
    s.offers = options
      .sort(() => rng() - 0.5)
      .slice(0, 5)
      .map((t) => ({ clubId: t.id, expires: s.season, years: 2 }));
    news(
      s,
      `Temporada encerrada. Reputação: ${s.reputation}. ${s.offers.length} propostas para sua carreira.`,
    );
  }
  function renew(s, id, years, salary) {
    const t = team(s),
      p = t.players.find((p) => p.id === id);
    if (!p) fail("Jogador não encontrado.");
    terms(s, years, salary);
    if (salary < Math.ceil(p.salary * 1.1))
      fail("O atleta exige aumento de pelo menos 10%.");
    const bonus = salary * 4;
    if (F.payroll(t) - p.salary + salary > t.finance.wageBudget)
      fail(
        "A renovação excede o orçamento salarial. Realocar verbas no Financeiro pode liberar espaço.",
      );
    if (t.money < bonus) fail("Saldo insuficiente para as luvas.");
    F.post(t, s, -bonus, "signing", `Luvas de renovação · ${p.name}`);
    p.salary = salary;
    p.contract = Math.max(s.season, p.contract) + years;
    news(s, `${p.name} renovou até ${p.contract}.`, {
      category: "contracts",
      body: `${t.name} acertou salário semanal de R$ ${salary.toLocaleString("pt-BR")} e pagou quatro salários em luvas.`,
    });
  }
  function terms(s, years, salary) {
    if (!Number.isInteger(years) || years < 1 || years > 5)
      fail("Escolha um contrato de 1 a 5 temporadas.");
    if (!Number.isInteger(salary) || salary < 1500 || salary > 30000000)
      fail("Salário semanal inválido (R$ 1.500 a R$ 30 milhões).");
  }
  function locate(s, id) {
    for (const t of s.teams) {
      const p = t.players.find((p) => p.id === id);
      if (p) return { p, t };
    }
    const p = s.freeAgents.find((p) => p.id === id);
    return p ? { p, t: null } : null;
  }
  function minFee(s, p) {
    return Math.round(p.price * (p.contract <= s.season + 1 ? 0.8 : 1));
  }
  function buy(s, id, fee, salary, years) {
    if (!windowOpen(s)) fail("A janela de transferências está fechada.");
    terms(s, years, salary);
    const found = locate(s, id),
      buyer = team(s);
    if (!found || found.t === buyer) fail("Jogador indisponível.");
    const { p, t: seller } = found;
    if (!Number.isFinite(fee) || fee < 0) fail("Valor de proposta inválido.");
    if (!seller && fee !== 0)
      fail("Jogadores sem clube não têm taxa de transferência.");
    if (seller && fee < minFee(s, p))
      fail(
        `Proposta recusada. O clube pede pelo menos R$ ${minFee(s, p).toLocaleString("pt-BR")}.`,
      );
    if (seller && seller.players.length <= 16)
      fail("O clube não libera o atleta: elenco reduzido.");
    if (salary < Math.ceil(p.salary * (seller ? 1.1 : 1)))
      fail("O jogador recusou o salário. Ofereça o valor sugerido ou mais.");
    const cost = fee + salary * 4;
    F.canHire(buyer, p, fee, salary, s);
    F.post(buyer, s, -fee, "transfer", `Compra · ${p.name}`);
    F.post(
      buyer,
      s,
      -salary * 4,
      "signing",
      `Luvas de contratação · ${p.name}`,
    );
    buyer.finance.transferBudget -= fee;
    if (seller) {
      F.post(seller, s, fee, "transfer", `Venda · ${p.name}`);
      seller.finance.transferBudget += Math.round(fee * 0.8);
      seller.players.splice(seller.players.indexOf(p), 1);
      seller.lineup = seller.lineup.map((x) => (x === id ? "" : x));
    } else s.freeAgents.splice(s.freeAgents.indexOf(p), 1);
    buyer.players.push(p);
    p.salary = salary;
    p.contract = s.season + years;
    s.transfers.unshift({
      season: s.season,
      player: p.name,
      from: seller?.name || "Sem clube",
      to: buyer.name,
      fee,
    });
    s.transfers = s.transfers.slice(0, 100);
    news(s, `${p.name} contratado por ${buyer.name}.`, {
      category: "market",
      clubIds: [buyer.id, ...(seller ? [seller.id] : [])],
      body: `Origem: ${seller?.name || "sem clube"}. Transferência de R$ ${fee.toLocaleString("pt-BR")}, contrato até ${p.contract} e salário semanal de R$ ${salary.toLocaleString("pt-BR")}.`,
    });
  }
  function sell(s, id, buyerId, fee) {
    if (!windowOpen(s)) fail("A janela de transferências está fechada.");
    const seller = team(s),
      p = seller.players.find((p) => p.id === id),
      buyer = team(s, buyerId);
    if (!p || !buyer || buyer === seller) fail("Proposta indisponível.");
    if (seller.players.length <= 16)
      fail("Mantenha pelo menos 16 jogadores no elenco.");
    if (!Number.isFinite(fee) || fee <= 0 || fee > p.price)
      fail("Valor de venda inválido.");
    F.canHire(buyer, p, fee, p.salary, s);
    F.post(buyer, s, -fee, "transfer", `Compra · ${p.name}`);
    F.post(buyer, s, -p.salary * 4, "signing", `Luvas · ${p.name}`);
    buyer.finance.transferBudget -= fee;
    F.post(seller, s, fee, "transfer", `Venda · ${p.name}`);
    seller.finance.transferBudget += Math.round(fee * 0.8);
    seller.players.splice(seller.players.indexOf(p), 1);
    seller.lineup = seller.lineup.map((x) => (x === id ? "" : x));
    buyer.players.push(p);
    p.contract = s.season + 2;
    s.transfers.unshift({
      season: s.season,
      player: p.name,
      from: seller.name,
      to: buyer.name,
      fee,
    });
    s.transfers = s.transfers.slice(0, 100);
    news(s, `${p.name} vendido ao ${buyer.name}.`, {
      category: "market",
      clubIds: [seller.id, buyer.id],
      body: `${seller.name} recebeu R$ ${fee.toLocaleString("pt-BR")}. O novo contrato vai até ${p.contract}.`,
    });
  }
  function saleOffer(s, id) {
    const p = team(s).players.find((p) => p.id === id);
    if (!p) return null;
    const fee = Math.round(p.price * 0.85);
    const buyers = s.teams
      .filter(
        (t) =>
          t.id !== s.clubId &&
          t.money >= fee + p.salary * 4 &&
          t.finance.transferBudget >= fee &&
          F.payroll(t) + p.salary <= t.finance.wageBudget &&
          t.players.length < 28,
      )
      .sort((a, b) => a.players.length - b.players.length || b.money - a.money);
    return buyers[0] ? { buyerId: buyers[0].id, fee } : null;
  }
  function promote(s, id) {
    const t = team(s),
      p = t.youth.find((p) => p.id === id);
    if (!p) fail("Atleta não encontrado.");
    if (t.money < 100000) fail("Saldo insuficiente.");
    if (F.payroll(t) + Math.max(3000, p.salary) > t.finance.wageBudget)
      fail("Orçamento de salários insuficiente para a promoção.");
    F.post(t, s, -100000, "youth", `Promoção da base · ${p.name}`);
    t.youth.splice(t.youth.indexOf(p), 1);
    p.salary = Math.max(3000, p.salary);
    p.contract = s.season + 3;
    t.players.push(p);
    news(s, `${p.name} promovido ao profissional.`, {
      category: "youth",
      body: `O jovem de ${p.age} anos assinou contrato até ${p.contract}. A promoção custou R$ 100 mil ao clube.`,
    });
  }
  function upgrade(s, kind) {
    if (!["stadium", "facility"].includes(kind)) fail("Instalação inválida.");
    const t = team(s),
      cost = t[kind] * 1500000;
    if (t[kind] >= 5) fail("Instalação no nível máximo.");
    if (t.money < cost) fail("Saldo insuficiente.");
    F.post(
      t,
      s,
      -cost,
      "facilities",
      `Investimento em ${kind === "stadium" ? "estádio" : "centro de treinamento"}`,
    );
    t[kind]++;
    news(
      s,
      `${kind === "stadium" ? "Estádio" : "Centro de treinamento"} ampliado para o nível ${t[kind]}.`,
      {
        category: "facilities",
        body: `${t.name} investiu R$ ${cost.toLocaleString("pt-BR")} na estrutura do clube.`,
      },
    );
  }
  function changeClub(s, id) {
    if (dayInfo(s) && !s.rosterRecovery)
      fail("Trocas de clube acontecem entre temporadas.");
    const offer = s.offers.find(
      (o) => o.clubId === id && o.expires === s.season,
    );
    if (!offer) fail("Proposta expirada ou inexistente.");
    const old = team(s),
      next = team(s, id),
      displaced = s.coaches.find((c) => c.id === next.manager),
      you = s.coaches.find((c) => c.id === "you");
    if (next.players.length < 11)
      fail("O clube de destino ainda tem dados insuficientes de elenco.");
    displaced.clubId = old.id;
    displaced.contract = s.season + 2;
    old.manager = displaced.id;
    next.manager = "you";
    you.clubId = id;
    you.contract = s.season + offer.years;
    s.coachMoves.unshift({
      season: s.season,
      clubId: id,
      from: displaced.name,
      to: "Você",
    });
    s.clubId = id;
    s.rosterRecovery = false;
    s.offers = [];
    s.live = null;
    news(
      s,
      `Você deixou ${old.name} e assumiu ${next.name}. Caixa, elenco e estrutura pertencem a cada clube.`,
      {
        category: "coaches",
        clubIds: [old.id, next.id],
        body: `O novo contrato de treinador vai até ${you.contract}. ${displaced.name} assume o clube anterior.`,
      },
    );
  }
  function enableTestMode(s) {
    if (!s.clubId) fail("Comece uma carreira primeiro.");
    if (s.live && !s.live.done)
      fail("Conclua a partida antes de ativar o modo teste.");
    s.mode = "test";
    s.testFundingTotal ??= 0;
    news(s, "Modo teste ativado nesta carreira.", {
      category: "club",
      body: "Aportes manuais ficam identificados no extrato. O modo é preservado no save.",
    });
  }
  function addTestFunds(s, amount, destination = "transfer") {
    if (s.mode !== "test")
      fail("Adicionar dinheiro está disponível apenas no modo teste.");
    if (!s.clubId) fail("Comece uma carreira primeiro.");
    if (s.live && !s.live.done)
      fail("Conclua a partida antes de adicionar dinheiro.");
    const t = team(s);
    if (
      !Number.isSafeInteger(amount) ||
      amount < 1 ||
      amount > 1e12 ||
      !["cash", "transfer", "wages"].includes(destination) ||
      !Number.isSafeInteger(t.money + amount)
    )
      fail(
        "Informe um aporte inteiro entre R$ 1 e R$ 1 trilhão e um destino válido.",
      );
    F.post(
      t,
      s,
      amount,
      "test",
      "Aporte manual · modo teste · " +
        {
          cash: "caixa",
          transfer: "caixa e transferências",
          wages: "caixa e teto salarial",
        }[destination],
    );
    if (destination === "transfer") t.finance.transferBudget += amount;
    if (destination === "wages")
      t.finance.wageBudget += Math.floor(amount / 52);
    s.testFundingTotal = (s.testFundingTotal || 0) + amount;
    return amount;
  }
  function signSponsor(s, id) {
    const c = F.sign(team(s), s, id);
    news(s, `${c.name} é o novo parceiro de ${team(s).name}`, {
      body: `Acordo de R$ ${c.annual.toLocaleString("pt-BR")} por temporada, até ${c.expires}. Contrato fictício da simulação.`,
    });
    return c;
  }
  function nextSeason(s) {
    if (dayInfo(s)) fail("Conclua a temporada atual.");
    s.season++;
    s.day = 0;
    s.today = 0;
    s.live = null;
    s.last = null;
    s.offers = [];
    s.teams.forEach((t) => {
      if (t.id !== s.clubId) {
        t.finance.wageBudget = Math.max(
          t.finance.wageBudget,
          F.payroll(t) * 1.15,
        );
        for (const p of t.players)
          if (p.contract < s.season && p.age < 37 && t.money >= p.salary * 4) {
            p.contract = s.season + 2;
            F.post(
              t,
              s,
              -p.salary * 4,
              "signing",
              `Renovação de contrato · ${p.name}`,
            );
          }
      }
      t.players = t.players.filter((p) => {
        p.age++;
        p.injury = 0;
        p.fitness = 100;
        if (p.contract < s.season) {
          s.freeAgents.push(p);
          if (t.id === s.clubId)
            news(s, `${p.name} deixou o clube ao fim do contrato.`, {
              category: "contracts",
              body: `O vínculo com ${t.name} terminou. O jogador agora está livre para negociar com outros clubes.`,
            });
          return false;
        }
        return true;
      });
      t.lineup = t.lineup.map((id) =>
        t.players.some((p) => p.id === id) ? id : "",
      );
      t.youth.forEach((p) => p.age++);
      const graduates = t.youth.filter((p) => p.age >= 20);
      t.youth = t.youth.filter((p) => p.age < 20);
      graduates.forEach((p) => {
        p.salary = Math.max(p.salary, 3000);
        p.contract = s.season + 2;
        t.players.push(p);
      });
      // Sem geração de atletas: só existem identidades reais da base importada.
      t.finance.wageBudget = Math.max(t.finance.wageBudget, F.payroll(t));
      if (
        t.id !== s.clubId &&
        t.finance.sponsors.every((c) => c.expires < s.season)
      )
        t.finance.sponsors = [{ ...F.offers(t, s)[0], expires: s.season + 1 }];
      if (t.id !== s.clubId) ensureAI(s, t);
    });
    s.freeAgents = s.freeAgents.filter((p) => p.age < 40);
    N.ensure(s);
    s.leagues.forEach((l) => (l.table = blankTable(l.ids)));
    s.cups = selectCups(s);
    const you = s.coaches.find((c) => c.id === "you");
    if (you.contract < s.season) {
      you.contract = s.season + 2;
      news(s, "Seu contrato de treinador foi renovado por duas temporadas.");
    }
    news(
      s,
      `Temporada ${s.season} iniciada. Novas classificações continentais e janela aberta.`,
    );
  }
  function upgradeSave(old) {
    if (old.version === 3) return old;
    const baseline = fresh(),
      s = {
        ...baseline,
        ...copy(old),
        version: 3,
        today: calendar()[old.day]?.offset ?? 263,
        freeAgents: [],
        live: null,
      };
    s.previousCareerArchive = {
      news: copy(old.news || []),
      transfers: copy(old.transfers || []),
    };
    s.news = [];
    s.articles = [];
    s.transfers = [];
    const oldTeams = new Map(old.teams.map((t) => [t.id, t]));
    s.teams = baseline.teams.map((base) => {
      const prior = oldTeams.get(base.id);
      if (!prior) return base;
      const initial = 18000000 + (7 - Number(base.id.split("-")[1])) * 500000;
      const delta = Number.isFinite(prior.money) ? prior.money - initial : 0;
      const t = {
        ...base,
        facility: prior.facility || 1,
        stadium: prior.stadium || 1,
        manager: prior.manager || base.manager,
        money: base.money + delta,
        lineup: [],
      };
      [...t.players, ...t.youth].forEach((p) => {
        p.age = R.ageOn(p.birthDate, s.season);
        p.contract = Math.max(s.season, p.contract);
      });
      delete t.finance;
      F.init(t, s, true);
      F.post(
        t,
        s,
        0,
        "adjustment",
        "Migração: capital inicial recalibrado; variação líquida da carreira anterior preservada. O histórico detalhado começa nesta atualização.",
      );
      return t;
    });
    const canonical = (name) =>
      name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    const catalog = new Map(
      s.teams.flatMap((t) =>
        [...t.players, ...t.youth].map((p) => [canonical(p.name), { p, t }]),
      ),
    );
    for (const prior of old.teams)
      for (const oldPlayer of prior.players.filter((p) => p.real)) {
        const found = catalog.get(canonical(oldPlayer.name)),
          destination = team(s, prior.id);
        if (!found || !destination) continue;
        const { p, t: owner } = found;
        if (owner !== destination) {
          owner.players = owner.players.filter((q) => q.id !== p.id);
          owner.youth = owner.youth.filter((q) => q.id !== p.id);
          destination.players.push(p);
          found.t = destination;
        }
        p.fitness = oldPlayer.fitness ?? 100;
        p.injury = oldPlayer.injury || 0;
        if (oldPlayer.contract >= s.season) p.contract = oldPlayer.contract;
      }
    s.teams.forEach((t) => {
      t.finance.wageBudget = Math.max(t.finance.wageBudget, F.payroll(t) * 1.1);
    });
    s.live = old.live && old.live.day === s.day ? copy(old.live) : null;
    if (s.clubId && team(s).players.length < 11) {
      s.rosterRecovery = true;
      s.live = null;
      s.offers = s.leagues
        .flatMap((l) =>
          s.teams
            .filter((t) => t.leagueId === l.id && t.players.length >= 11)
            .slice(0, 2),
        )
        .map((t) => ({ clubId: t.id, expires: s.season, years: 2 }));
    }
    news(
      s,
      "Atualização: elencos reais, valores de referência e financeiro separados.",
      {
        body: "Os atletas gerados foram removidos. O capital inicial foi recalibrado, preservando a variação líquida anterior. Há uma cópia do salvamento anterior no navegador.",
      },
    );
    return s;
  }
  function migrate(old) {
    const s = fresh();
    if (!old?.club) return s;
    const aliases = {
      "Porto Imperial": "Fluminense",
      "Rubro da Guanabara": "Flamengo",
      "Palmeiras do Vale": "Palmeiras",
      "Alvinegro Paulista": "Corinthians",
      "Cruzeiro das Serras": "Cruzeiro",
      "Tricolor do Sul": "Grêmio",
      "Leões da Bahia": "Bahia",
      "Atlético Central": "Atlético Mineiro",
    };
    const t = s.teams.find((t) => t.name === (aliases[old.club] || old.club));
    if (!t) return s;
    s.season = old.season || 2025;
    start(s, t.id);
    const completed = Math.max(0, Math.min(14, (old.week || 1) - 1));
    while (
      dayInfo(s) &&
      (dayInfo(s).kind === "rest" ||
        dayInfo(s).kind === "cup" ||
        dayInfo(s).round < completed)
    ) {
      const f = nextFixture(s);
      if (f)
        s.live = {
          ...f,
          day: s.day,
          offset: s.today,
          minute: 90,
          goals: [0, 0],
          shots: [0, 0],
          events: [],
        };
      advance(s);
      s.live = null;
    }
    s.legacyArchive = {
      club: old.club,
      money: old.money,
      season: old.season,
      week: old.week,
      table: copy(old.table || []),
      news: copy(old.news || []),
    };
    s.tactic = old.tactic || s.tactic;
    s.training = old.training || s.training;
    news(
      s,
      "Carreira anterior importada. O histórico original está arquivado.",
      {
        body: "Elenco e finanças foram atualizados para a base real. Não são mantidos atletas gerados.",
      },
    );
    return s;
  }
  const api = {
    WORLD,
    enableTestMode,
    addTestFunds,
    tactics: T,
    currentMatch,
    matchPlans,
    national: N,
    setProfile,
    prepareCareer,
    assumeNational,
    ROSTERS: R.DATA,
    finance: F,
    formatDate,
    simulate,
    signSponsor,
    upcomingFixture,
    journal,
    REFERENCES,
    date,
    cupPairs,
    LEAGUES,
    CUP_DEFS,
    FORMATION,
    fresh,
    start,
    team,
    league,
    rank,
    fixtures,
    calendar,
    dayInfo,
    allFixtures,
    nextFixture,
    lineup,
    strength,
    makeMatch,
    minute,
    advance,
    windowOpen,
    renew,
    buy,
    sell,
    saleOffer,
    promote,
    upgrade,
    changeClub,
    nextSeason,
    migrate,
    upgradeSave,
    minFee,
    roundName,
    copy,
  };
  root.Legacy = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
