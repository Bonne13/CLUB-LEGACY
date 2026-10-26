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
  const TR =
    typeof module !== "undefined"
      ? require("./training.js")
      : root.LegacyTraining;
  const P =
    typeof module !== "undefined"
      ? require("./physical.js")
      : root.LegacyPhysical;
  const SC =
    typeof module !== "undefined"
      ? require("./scouting.js")
      : root.LegacyScouting;
  const D =
    typeof module !== "undefined"
      ? require("./schedule.js")
      : root.LegacySchedule;
  const PF =
    typeof module !== "undefined"
      ? require("./performance.js")
      : root.LegacyPerformance;
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
  function calendar(s) {
    return D.calendar(s?.calendarProfile);
  }
  function formatDate(s, offset) {
    return D.at(s, offset).toLocaleDateString("pt-BR", {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  function date(s, day) {
    if (day !== undefined) {
      const event = calendar(s)[day];
      return event ? formatDate(s, event.offset) : "Fim da temporada";
    }
    return formatDate(s, s.today ?? calendar(s)[s.day]?.offset ?? 0);
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
  const lookupCache = new WeakMap();
  function lookups(s) {
    let cache = lookupCache.get(s);
    if (!cache || cache.teams !== s.teams || cache.leagues !== s.leagues) {
      cache = {
        teams: s.teams,
        leagues: s.leagues,
        teamMap: new Map(s.teams.map((t) => [t.id, t])),
        leagueMap: new Map(s.leagues.map((l) => [l.id, l])),
      };
      lookupCache.set(s, cache);
    }
    return cache;
  }
  const team = (s, id = s.clubId) =>
    lookups(s).teamMap.get(id) || N.team(s, id);
  const league = (s, id) => lookups(s).leagueMap.get(id);
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
      fixtureResults: [],
      trophies: [],
      transfers: [],
      negotiations: [],
      negotiationSequence: 0,
      negotiationRevision: 0,
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
      ensureSquadNumbers(t);
      F.init(t, s);
    });
    s.cups = selectCups(s);
    s.dataRevision = R.DATA.revision || "historical-1";
    N.ensure(s);
    SC.ensure(s);
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
    PF.ensure(s);
    ensureFriendlies(s);
    TR.ensure(s);
    SC.ensure(s);
    s.trophies ??= [];
    s.fixtureResults ??= [];
    s.negotiations ??= [];
    s.negotiationSequence ??= 0;
    s.negotiationRevision ??= 0;
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
    const references = new Map(
      Object.keys(R.DATA.teams).flatMap((id) =>
        R.roster(id, s.season).map((p) => [p.id, p]),
      ),
    );
    for (const p of existing) {
      p.fatigue ??= Math.max(0, Math.round((100 - p.fitness) * 0.6));
      p.trainingPlan ??= "auto";
      p.restDays ??= 0;
      const row = rows.get(p.id);
      if (row) {
        const ref = references.get(p.id);
        if (p.ratingRevision !== ref.ratingRevision) {
          const growth = Math.max(
            -8,
            Math.min(
              12,
              p.ovr -
                (p.ratingBase ??
                  Math.min(
                    94,
                    Math.max(
                      45,
                      Math.round(
                        40 +
                          10 *
                            Math.log10(
                              Math.max(1000, p.price / R.DATA.eurBrl) / 1000,
                            ),
                      ),
                    ),
                  )),
            ),
          );
          p.ovr = Math.max(35, Math.min(97, ref.ovr + growth));
          p.potential = Math.max(
            p.ovr,
            Math.min(98, ref.potential + Math.max(0, growth)),
          );
          Object.assign(p, {
            ratingBase: ref.ovr,
            ratingRevision: ref.ratingRevision,
            ratingSource: ref.ratingSource,
            ratingEstimated: ref.ratingEstimated,
            referenceOverall: ref.referenceOverall,
            stamina: ref.stamina,
          });
        }
        p.stamina ??= ref.stamina;
        p.marketSalary = Math.max(p.salary, ref.marketSalary);
        if (
          p.positionRevision !== ref.positionRevision ||
          (!p.naturalPositions?.length && ref.naturalPositions.length)
        ) {
          if (ref.naturalPositions.length || ref.secondaryPositions.length) {
            p.naturalPositions = [...ref.naturalPositions];
            p.secondaryPositions = [...ref.secondaryPositions];
            p.preferredFoot = ref.preferredFoot;
            p.positionSource = ref.positionSource;
          }
          p.positionRevision = ref.positionRevision;
        }
        if (!p.nationalities) {
          p.nationalities = ref.nationalities;
          p.nationality = ref.nationality;
          p.dataSource = ref.dataSource;
          p.ageEstimated = ref.ageEstimated;
        }
        if (!p.birthDate && ref.birthDate) {
          p.birthDate = ref.birthDate;
          p.age = ref.age;
          p.ageEstimated = false;
          p.ageUnknown = false;
          p.birthSource = ref.birthSource;
        }
        if (!p.nationalities?.length && ref.nationalities.length) {
          p.nationalities = ref.nationalities;
          p.nationality = ref.nationality;
        }
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
    s.teams.forEach((t) => {
      T.ensure(t);
      ensureSquadNumbers(t);
    });
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
    if (s.live && !s.live.done) {
      const m = s.live;
      m.plans ??= matchPlans(s, m);
      PF.begin(m);
      if (!m.minutesPlayed)
        m.minutesPlayed = Object.fromEntries(
          m.plans.flatMap((plan) => plan.starters.map((p) => [p.id, m.minute])),
        );
      m.possession ??= [Math.ceil(m.minute / 2), Math.floor(m.minute / 2)];
      m.substitutions ??= [];
      m.goalReplays ??= [];
      m.timeline ??= [];
      m.secondHalfStarted ??= m.minute > 45;
      for (let side = 0; side < m.plans.length; side++) {
        const plan = m.plans[side],
          refreshPositions = plan.positionRevision !== R.POSITION_REVISION;
        for (let index = 0; index < m.plans[side].starters.length; index++) {
          const p = m.plans[side].starters[index],
            reference = existing.find((x) => x.id === p.id);
          if (reference) {
            p.fitness ??= reference.fitness;
            p.stamina ??= reference.stamina;
            p.age ??= reference.age;
            p.fatigue ??= reference.fatigue;
            p.naturalPositions ??= reference.naturalPositions;
            p.secondaryPositions ??= reference.secondaryPositions;
            if (refreshPositions) {
              p.naturalPositions = [...(reference.naturalPositions || [])];
              p.secondaryPositions = [...(reference.secondaryPositions || [])];
            }
            p.shirtNumber ??=
              m.kind === "national" ? index + 1 : reference.shirtNumber;
          }
        }
        if (plan.leadershipRevision !== T.leadership.revision) {
          for (const p of plan.starters) {
            const reference = existing.find((x) => x.id === p.id);
            if (reference)
              p.skills = {
                ...p.skills,
                leadership: T.skills(reference).leadership,
              };
          }
          for (const p of Object.values(plan.specialists)) {
            const reference = existing.find((x) => x.id === p?.id);
            if (reference)
              p.skills = {
                ...p.skills,
                leadership: T.skills(reference).leadership,
              };
          }
          const actual = team(s, m.pair[side]);
          const present = plan.starters
            .map((p) => existing.find((x) => x.id === p.id))
            .filter(Boolean);
          const leaders = T.specialists(
            { ...actual, tactics: plan.instructions },
            present,
          );
          for (const key of ["captain", "viceCaptain"]) {
            const p = leaders[key];
            plan.specialists[key] = p
              ? { id: p.id, name: p.name, skills: T.skills(p) }
              : null;
          }
          plan.leadershipRevision = T.leadership.revision;
        }
        if (refreshPositions) {
          const slots = new Map(
            T.slots({ tactics: plan.instructions }).map((slot) => [
              slot.id,
              slot,
            ]),
          );
          plan.slots = plan.slots.map((slot) => {
            const updated = slots.get(slot.id);
            return updated
              ? { ...slot, label: updated.label, target: updated.target }
              : slot;
          });
          plan.baseStrength = matchPlanStrength(plan);
          const condition =
            plan.starters.reduce(
              (sum, p) => sum + matchFitness(p, m, plan.fatigue),
              0,
            ) / 11;
          plan.strength =
            plan.baseStrength *
            (m.minute ? 0.85 + (0.15 * condition) / 100 : 1);
          plan.positionRevision = R.POSITION_REVISION;
        }
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
    settings = {},
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
    if (settings.calendar === "regional")
      D.configure(s, league(s, t.leagueId).region);
    PF.ensure(s).current.label = D.label(s);
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
  function journalText(s, text) {
    const coach = s.profile?.name || "O treinador";
    return String(text ?? "")
      .split(coach)
      .map((part) =>
        part.replace(
          /(^|[^\p{L}\p{N}_])você(?=$|[^\p{L}\p{N}_])/giu,
          (_, prefix) => prefix + coach,
        ),
      )
      .join(coach);
  }
  function news(s, text, details = {}) {
    ensureJournal(s);
    text = journalText(s, text);
    s.news.unshift(text);
    s.news = s.news.slice(0, 70);
    s.articleSequence = (s.articleSequence || 0) + 1;
    s.articles.unshift({
      id: "news-" + s.articleSequence,
      season: s.season,
      day: s.day,
      offset: s.today,
      title: text,
      body: journalText(s, details.body),
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
          offset: h.offset ?? calendar(s)[h.day]?.offset,
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
          body: `${f.name}: o confronto está marcado para ${date(s)} no calendário da carreira. ${f.kind === "league" ? "O resultado contará para a classificação nacional." : f.kind === "cup" ? "Quem vencer avança; empate leva aos pênaltis." : f.kind === "friendly" ? "Jogo de preparação: o resultado não altera a classificação oficial." : "O resultado contará para a classificação da fase inicial."}`,
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
      .slice(0, 80)
      .map((article) => ({
        ...article,
        title: journalText(s, article.title),
        body: journalText(s, article.body),
      }));
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
        positionRevision: R.POSITION_REVISION,
        leadershipRevision: T.leadership.revision,
        ...T.ratings(t),
        instructions: plan,
        slots: copy(T.slots(t)),
        starters: starters.map((p) => ({
          id: p.id,
          name: p.name,
          pos: p.pos,
          shirtNumber:
            m.kind === "national" ? starters.indexOf(p) + 1 : p.shirtNumber,
          ovr: p.ovr,
          fatigue: p.fatigue,
          fitness: p.fitness,
          stamina: p.stamina,
          age: p.age,
          naturalPositions: p.naturalPositions,
          secondaryPositions: p.secondaryPositions,
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
    const event = calendar(s)[s.day];
    if (!event) return null;
    const today = s.today ?? event.offset;
    return today === event.offset
      ? event
      : { kind: "rest", offset: today, round: Math.floor(today / 7) };
  }
  function ensureFriendlies(s) {
    s.friendlies ??= [];
    s.preseasonTournaments ??= [];
    s.friendlySequence ??= 0;
    s.tournamentSequence ??= 0;
  }
  function fixtureReservations(s, id) {
    const t = team(s, id),
      l = league(s, t.leagueId),
      list = [];
    for (const d of calendar(s)) {
      if (
        d.kind === "league" &&
        l.fixtures[d.round]?.some((pair) => pair.includes(id))
      )
        list.push(d.offset);
      if (d.kind === "cup" && s.cups.some((c) => c.entrants.includes(id)))
        list.push(d.offset);
    }
    for (const f of s.friendlies || [])
      if (f.status !== "cancelled" && f.pair.includes(id)) list.push(f.offset);
    return list;
  }
  function checkFriendly(s, pair, offset, pending = []) {
    if (!s.clubId || (s.live && !s.live.done))
      fail("Conclua a partida antes de organizar a agenda.");
    if (
      !Number.isInteger(offset) ||
      offset <= s.today ||
      offset > calendar(s).at(-1).offset
    )
      fail("Escolha uma data futura dentro da temporada.");
    if (
      new Set(pair).size !== 2 ||
      pair.some(
        (id) => !s.teams.some((t) => t.id === id && t.players.length >= 11),
      )
    )
      fail("Escolha dois clubes diferentes com elenco disponível.");
    for (const id of pair)
      if (
        [
          ...fixtureReservations(s, id),
          ...pending.filter((f) => f.pair.includes(id)).map((f) => f.offset),
        ].some((d) => Math.abs(d - offset) < 3)
      )
        fail(
          "Há jogo ou data de copa reservada próximo a esse dia. Mantenha pelo menos três dias entre partidas para os dois clubes.",
        );
    if (
      s.national?.job &&
      pair.includes(s.clubId) &&
      s.national.fixtures.some(
        (f) =>
          f.pair.includes(s.national.job) && Math.abs(f.offset - offset) < 3,
      )
    )
      fail("O amistoso conflita com um compromisso da sua seleção.");
  }
  function arrangeFriendly(s, opponentId, offset, venue = "home") {
    ensureFriendlies(s);
    if (!["home", "away"].includes(venue)) fail("Mando de campo inválido.");
    if (s.friendlies.length >= 60)
      fail("Limite de amistosos desta temporada atingido.");
    const pair =
      venue === "home" ? [s.clubId, opponentId] : [opponentId, s.clubId];
    checkFriendly(s, pair, offset);
    const f = {
      id: "friendly-" + ++s.friendlySequence,
      pair,
      offset,
      competition: "friendly",
      name: "Amistoso de clubes",
      kind: "friendly",
      round: 0,
      status: "scheduled",
      tournamentId: null,
    };
    s.friendlies.push(f);
    news(
      s,
      `Amistoso confirmado: ${team(s, pair[0]).name} × ${team(s, pair[1]).name}.`,
      {
        category: "club",
        clubIds: pair,
        body: `Preparação marcada para ${formatDate(s, offset)}. O resultado não altera a classificação das ligas.`,
      },
    );
    return f;
  }
  function cancelFriendly(s, id) {
    const f = s.friendlies?.find((f) => f.id === id);
    if (
      !f ||
      f.status !== "scheduled" ||
      f.offset <= s.today ||
      (s.live && !s.live.done)
    )
      fail("Este amistoso não pode ser cancelado.");
    if (f.tournamentId) fail("Cancele o torneio completo antes do início.");
    f.status = "cancelled";
  }
  function organizePreseason(
    s,
    opponents,
    startOffset,
    title = "Copa de pré-temporada",
  ) {
    ensureFriendlies(s);
    const ids = [s.clubId, ...opponents];
    if (opponents.length !== 3 || new Set(ids).size !== 4)
      fail("Escolha três adversários diferentes.");
    if (
      !s.calendarProfile ||
      startOffset + 8 >= s.calendarProfile.preseasonDays
    )
      fail(
        "As três rodadas devem acontecer antes do início dos jogos oficiais.",
      );
    if (s.preseasonTournaments.some((t) => t.status === "scheduled"))
      fail("Conclua ou cancele o torneio já organizado.");
    if (s.friendlies.length + 6 > 60)
      fail("Limite de amistosos desta temporada atingido.");
    if (
      typeof title !== "string" ||
      title.trim().length < 3 ||
      title.trim().length > 60
    )
      fail("O nome do torneio deve ter de 3 a 60 caracteres.");
    const rounds = fixtures(ids, true),
      pending = [];
    rounds.forEach((round, r) =>
      round.forEach((pair) => {
        const offset = startOffset + r * 4;
        checkFriendly(s, pair, offset, pending);
        pending.push({ pair, offset, round: r });
      }),
    );
    const id = "preseason-" + ++s.tournamentSequence,
      tournament = {
        id,
        name: title.trim(),
        entrants: ids,
        start: startOffset,
        end: startOffset + 8,
        table: blankTable(ids),
        status: "scheduled",
        champion: null,
      };
    pending.forEach((f) =>
      s.friendlies.push({
        ...f,
        id: "friendly-" + ++s.friendlySequence,
        competition: id,
        name: tournament.name,
        kind: "friendly",
        status: "scheduled",
        tournamentId: id,
      }),
    );
    s.preseasonTournaments.push(tournament);
    news(s, `${tournament.name}: pré-temporada confirmada.`, {
      category: "competitions",
      clubIds: ids,
      body: `Quatro clubes, três rodadas, de ${formatDate(s, startOffset)} a ${formatDate(s, startOffset + 8)}. Todos se enfrentam uma vez; pontos, saldo e gols definem o campeão.`,
    });
    return tournament;
  }
  function cancelPreseason(s, id) {
    const t = s.preseasonTournaments?.find((t) => t.id === id);
    if (
      !t ||
      t.status !== "scheduled" ||
      t.start <= s.today ||
      (s.live && !s.live.done)
    )
      fail("O torneio já começou ou não pode ser cancelado.");
    t.status = "cancelled";
    for (const f of s.friendlies)
      if (f.tournamentId === id) f.status = "cancelled";
  }
  function managedFixtureAt(s, day = s.day, offset = s.today) {
    const event = calendar(s)[day],
      id = s.clubId;
    if (!id) return null;
    if (event?.offset === offset) {
      if (event.kind === "league") {
        const l = league(s, team(s).leagueId),
          pair = l.fixtures[event.round]?.find((pair) => pair.includes(id));
        if (pair)
          return {
            pair,
            competition: l.id,
            name: l.name,
            kind: "league",
            round: event.round,
            referenceDate:
              l.referenceCompatible === false
                ? null
                : REFERENCES?.[l.id]?.matches.find(
                    (m) => m.pair[0] === pair[0] && m.pair[1] === pair[1],
                  )?.date || null,
          };
      } else
        for (const c of s.cups) {
          const pair = cupPairs(c, event.round).find((pair) =>
            pair.includes(id),
          );
          if (pair)
            return {
              pair,
              competition: c.id,
              name: c.name,
              kind: event.round < c.stageGames ? "group" : "cup",
              round: event.round,
            };
        }
    }
    return (
      s.friendlies?.find(
        (f) =>
          f.offset === offset &&
          f.status !== "cancelled" &&
          f.pair.includes(id),
      ) ||
      s.national?.fixtures?.find(
        (f) => f.offset === offset && f.pair.includes(s.national.job),
      ) ||
      null
    );
  }
  function upcomingFixture(s) {
    const candidates = [];
    for (let i = s.day; i < calendar(s).length; i++) {
      const d = calendar(s)[i];
      if (d.offset < s.today) continue;
      const f = managedFixtureAt(s, i, d.offset);
      if (f) {
        candidates.push({ ...f, event: i, offset: d.offset });
        break;
      }
    }
    const national = s.national?.fixtures?.find(
      (f) => f.offset >= s.today && f.pair.includes(s.national.job),
    );
    if (national)
      candidates.push({
        ...national,
        event: calendar(s).findIndex((d) => d.offset >= national.offset),
        offset: national.offset,
      });
    candidates.push(
      ...(s.friendlies || []).filter(
        (f) =>
          f.status === "scheduled" &&
          f.offset >= s.today &&
          f.pair.includes(s.clubId),
      ),
    );
    return candidates.sort((a, b) => a.offset - b.offset)[0] || null;
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
    const revision = s.negotiationRevision || 0;
    const scoutRevision = s.scouting?.revision || 0;
    const invitationRevision = s.national?.invitationRevision || 0;
    while (advanced < limit && dayInfo(s) && !nextFixture(s)) {
      advance(s, rng);
      advanced++;
      if (
        (s.negotiationRevision || 0) !== revision ||
        (s.scouting?.revision || 0) !== scoutRevision ||
        (s.national?.invitationRevision || 0) !== invitationRevision
      )
        break;
    }
    return {
      advanced,
      stoppedForMatch: Boolean(nextFixture(s)),
      finished: !dayInfo(s),
      stoppedForNegotiation: (s.negotiationRevision || 0) !== revision,
      stoppedForReport: (s.scouting?.revision || 0) !== scoutRevision,
      stoppedForInvitation:
        (s.national?.invitationRevision || 0) !== invitationRevision,
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
      ...(s.friendlies || []).filter(
        (f) => f.offset === s.today && f.status === "scheduled",
      ),
      ...(s.national?.fixtures || []).filter((f) => f.offset === s.today),
    ];
  }
  const managed = (s, f) =>
    f.kind === "national"
      ? Boolean(s.national?.job && f.pair.includes(s.national.job))
      : f.pair.includes(s.clubId);
  const nextFixture = (s) => managedFixtureAt(s);
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
      season: s.season,
      day: s.day,
      offset: s.today,
      mode: ["text", "2d", "3d"].includes(mode) ? mode : "2d",
      minute: 0,
      goals: [0, 0],
      shots: [0, 0],
      events: ["A bola está rolando!"],
      minutesPlayed: {},
      substitutions: [],
      possession: [0, 0],
      timeline: [],
      goalReplays: [],
      secondHalfStarted: false,
      done: false,
    };
    s.live.plans = matchPlans(s, s.live);
    PF.begin(s.live);
    s.live.events.push(
      ...s.live.plans.map(
        (p) =>
          `Capitão de ${p.name}: ${p.specialists.captain?.name || "não definido"}.`,
      ),
    );
    return s.live;
  }
  const fatigueLoss = P.loss;
  function matchFitness(p, m, extra = 0) {
    return Math.max(
      40,
      Math.round(
        (p.fitness ?? 100) -
          fatigueLoss(p, m.minutesPlayed?.[p.id] ?? m.minute, extra),
      ),
    );
  }
  function matchVisual(m, play = m.lastPlay) {
    if (play?.positions)
      return {
        positions: play.positions.map((p) => ({ ...p })),
        ball: play.path[0],
        side: play.side,
      };
    const side = play?.side ?? m.possessionSide ?? 0;
    const positions = m.plans.flatMap((plan, teamSide) =>
      plan.starters.map((p, i) => {
        const slot = plan.slots[i],
          advance = teamSide === side ? 5 : -3;
        let x =
            12 +
            (100 - slot.y) * 0.8 +
            advance +
            Math.sin(m.minute * 0.4 + i) * 1.8,
          y = Math.max(
            8,
            Math.min(92, slot.x + Math.cos(m.minute * 0.3 + i) * 2),
          );
        if (teamSide) x = 100 - x;
        return {
          id: p.id,
          name: p.name,
          shirtNumber: p.shirtNumber,
          side: teamSide,
          index: i,
          x: Math.max(3, Math.min(97, x)),
          y,
        };
      }),
    );
    if (play?.from && play.playerId) {
      const scorer = positions.find((p) => p.id === play.playerId);
      if (scorer) Object.assign(scorer, play.from);
    }
    const carrier =
      positions.find((p) => p.side === side && p.index === 7) || positions[0];
    return {
      positions,
      ball: play?.path?.[0] || { x: carrier.x, y: carrier.y },
      side,
    };
  }
  function recordPlay(m, type, side, actor = null, detail = "jogada") {
    const view = matchVisual(m, null),
      players = view.positions.filter((p) => p.side === side),
      shooter = players.find((p) => p.id === actor?.id) ||
        players[8] ||
        players[0] || {
          id: null,
          name: "Autoria não disponível na base",
          x: 50,
          y: 50,
        };
    const direction = side ? -1 : 1,
      from =
        type === "build-up"
          ? { x: shooter.x, y: shooter.y }
          : {
              x: side ? 16 + (m.minute % 5) : 84 - (m.minute % 5),
              y: detail === "pênalti" ? 50 : 36 + ((m.minute * 7) % 28),
            };
    const passer1 = players[5] || players[1] || shooter,
      passer2 =
        players.find((p) => p.id === m.lastShot?.assistId) ||
        players[7] ||
        players[6] ||
        shooter;
    const target =
      type === "goal"
        ? { x: side ? 1 : 99, y: 46 + (m.minute % 9) }
        : type === "shot"
          ? { x: side ? 3 : 97, y: m.minute % 2 ? 26 : 74 }
          : { x: shooter.x, y: shooter.y };
    const path = [
      { x: passer1.x, y: passer1.y, playerId: passer1.id, name: passer1.name },
      { x: passer2.x, y: passer2.y, playerId: passer2.id, name: passer2.name },
      { ...from, playerId: shooter.id, name: shooter.name },
      target,
    ];
    const play = {
      id: `play-${m.minute}-${type}-${side}`,
      minute: m.minute,
      type,
      side,
      playerId: shooter.id,
      playerName: actor?.name || shooter.name,
      assistId: type === "goal" ? m.lastShot?.assistId || null : null,
      assistName: type === "goal" ? m.lastShot?.assistName || null : null,
      from,
      target,
      path,
      detail,
      positions: view.positions.map((p) =>
        p.id === shooter.id ? { ...p, ...from } : p,
      ),
    };
    m.lastPlay = play;
    m.timeline ??= [];
    m.timeline.push(play);
    m.timeline = m.timeline.slice(-40);
    if (type === "goal") {
      m.goalReplays ??= [];
      m.goalReplays.push(play);
      m.goalReplays = m.goalReplays.slice(-12);
    }
    return play;
  }
  function startSecondHalf(s) {
    const m = s.live;
    if (!m || m.done || m.minute !== 45 || m.secondHalfStarted)
      fail("O intervalo não está disponível.");
    m.secondHalfStarted = true;
    m.events.unshift("46' — Começa o segundo tempo.");
  }
  function substitute(s, outId, inId) {
    const m = s.live;
    if (!m || m.done || m.minute >= 90 || !currentMatch(s).active)
      fail("Substituição indisponível.");
    const ownId = m.kind === "national" ? s.national.job : s.clubId,
      side = m.pair.indexOf(ownId),
      plan = m.plans[side],
      t = team(s, ownId);
    if (side < 0 || !plan || !t)
      fail("A equipe gerida não participa desta partida.");
    const changes = (m.substitutions || []).filter((x) => x.side === side),
      index = plan?.starters.findIndex((p) => p.id === outId),
      incoming = t.players.find((p) => p.id === inId && !p.injury);
    if (
      index < 0 ||
      !incoming ||
      plan.starters.some((p) => p.id === inId) ||
      changes.some((x) => x.outId === inId) ||
      changes.length >= 5
    )
      fail(
        "Escolha um titular e um reserva disponível. São permitidas cinco substituições, sem reentrada.",
      );
    const outgoing = plan.starters[index];
    plan.starters[index] = {
      id: incoming.id,
      name: incoming.name,
      shirtNumber: m.kind === "national" ? index + 1 : incoming.shirtNumber,
      pos: incoming.pos,
      ovr: incoming.ovr,
      fitness: incoming.fitness,
      fatigue: incoming.fatigue,
      stamina: incoming.stamina,
      age: incoming.age,
      naturalPositions: incoming.naturalPositions,
      secondaryPositions: incoming.secondaryPositions,
      skills: T.skills(incoming),
    };
    m.minutesPlayed ??= {};
    m.minutesPlayed[inId] ??= 0;
    m.substitutions ??= [];
    m.substitutions.push({ side, outId, inId, minute: m.minute });
    plan.baseStrength = matchPlanStrength(plan);
    plan.strength = plan.baseStrength;
    const valid = new Set(plan.starters.map((p) => p.id));
    if (
      !valid.has(plan.specialists.captain?.id) &&
      valid.has(plan.specialists.viceCaptain?.id)
    )
      plan.specialists.captain = plan.specialists.viceCaptain;
    for (const key of Object.keys(plan.specialists))
      if (!valid.has(plan.specialists[key]?.id)) {
        const skill = key.includes("corners")
          ? "crossing"
          : key === "penalties"
            ? "penalties"
            : key === "freeKicks"
              ? "freeKicks"
              : "leadership";
        const best = [...plan.starters].sort(
          (a, b) => b.skills[skill] - a.skills[skill],
        )[0];
        plan.specialists[key] = {
          id: best.id,
          name: best.name,
          skills: best.skills,
        };
      }
    const leaders = T.specialists(
      { ...team(s, m.pair[side]), tactics: plan.instructions },
      plan.starters,
    );
    for (const key of ["captain", "viceCaptain"]) {
      const p = leaders[key];
      plan.specialists[key] = p
        ? { id: p.id, name: p.name, skills: p.skills }
        : null;
    }
    m.events.unshift(
      `${m.minute}' — Substituição: sai ${outgoing.name}, entra ${incoming.name}.`,
    );
    return m.substitutions.at(-1);
  }
  function matchPlanStrength(plan) {
    return (
      plan.starters.reduce(
        (sum, p, i) =>
          sum +
          p.ovr *
            (0.65 + (0.35 * (p.fitness ?? 100)) / 100) *
            (1 - (p.fatigue || 0) * 0.001) *
            T.fit(p, plan.slots[i]),
        0,
      ) / 11
    );
  }
  function minute(s, m, rng = Math.random) {
    if (m.done || m.minute >= 90) return;
    if (!m.plans) m.plans = matchPlans(s, m);
    m.minute++;
    m.minutesPlayed ??= {};
    m.possession ??= [0, 0];
    if (!m.compact)
      for (const plan of m.plans) {
        for (const p of plan.starters)
          m.minutesPlayed[p.id] = (m.minutesPlayed[p.id] || 0) + 1;
        plan.baseStrength ??= plan.strength;
        const condition =
          plan.starters.reduce(
            (sum, p) => sum + matchFitness(p, m, plan.fatigue),
            0,
          ) / 11;
        plan.strength = plan.baseStrength * (0.85 + (0.15 * condition) / 100);
      }
    m.possessionSide =
      (Math.floor(m.minute / 4) * 37) % 100 <
      50 + (m.plans[0].strength - m.plans[1].strength) * 0.3
        ? 0
        : 1;
    PF.tick(m);
    let producedPlay = false;
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
      m.possessionSide = side;
      producedPlay = true;
      const detail =
        type === "escanteio"
          ? `escanteio cobrado por ${taker?.name || own.name}`
          : type;
      if (type === "jogada")
        chance = Math.min(
          0.9,
          chance + (scorer?.skills.finishingBonus || 0) * 0.003,
        );
      if (rng() < chance) {
        m.goals[side]++;
        PF.shot(m, side, scorer, type, { goal: true, taker });
        if (!m.compact) recordPlay(m, "goal", side, scorer, detail);
        m.events.unshift(
          `${m.minute}' — GOL de ${scorer?.name || own.name} (${own.name}) · ${detail}!`,
        );
      } else {
        const saved = rng() >= 0.5;
        PF.shot(m, side, scorer, type, { saved, taker });
        if (!m.compact) recordPlay(m, "shot", side, scorer, detail);
        m.events.unshift(
          `${m.minute}' — ${own.name}: ${type === "jogada" ? scorer?.name || "o ataque" : taker?.name || "o cobrador"} tenta ${detail}; ${saved ? "o goleiro defende" : "a bola sai"}.`,
        );
      }
    }
    m.possession[m.possessionSide]++;
    if (!producedPlay && !m.compact)
      recordPlay(m, "build-up", m.possessionSide);
    if (m.minute === 45)
      m.events.unshift(
        "45' — Intervalo. Prepare a equipe para o segundo tempo.",
      );
    m.events = m.events.slice(0, 45);
  }
  function score(s, f, rng) {
    const m = {
      ...f,
      season: s.season,
      compact: true,
      minute: 0,
      goals: [0, 0],
      shots: [0, 0],
      events: [],
    };
    while (m.minute < 90) minute(s, m, rng);
    return m;
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
  function advancePlanning(s, rng = Math.random) {
    if (dayInfo(s)) fail("Use o avanço normal enquanto há jogos na temporada.");
    if (s.live && !s.live.done) fail("Conclua a partida antes de planejar.");
    const last =
      Math.round((D.anchor(s, s.season + 1) - D.anchor(s)) / 86400000) - 1;
    if (s.today >= last)
      fail("O planejamento deste ano terminou. Inicie a próxima temporada.");
    for (const t of s.teams) {
      F.daily(t, s);
      train(s, t, rng, false);
    }
    for (const p of s.freeAgents) P.apply(p, { globalMode: "Recuperação" });
    s.today++;
    processNegotiations(s);
    for (const report of SC.process(s))
      news(s, "Relatório do olheiro disponível.", {
        category: "club",
        clubIds: [s.clubId],
        body: `${report.players.length} opções no relatório de observação.`,
      });
    const invitation = N.review(s);
    if (invitation)
      news(s, `Convite para treinar ${invitation.name}.`, {
        category: "coaches",
        clubIds: [s.clubId, invitation.selectionId],
        body: invitation.reason,
      });
    return s.today;
  }
  function transferWindowInfo(s) {
    const ranges =
        s.calendarProfile?.region === "eu"
          ? [
              [0, 61],
              [184, 214],
            ]
          : s.calendarProfile
            ? [
                [0, 90],
                [182, 243],
              ]
            : [
                [0, 41],
                [119, 153],
              ],
      active = ranges.find(
        ([start, end]) => s.today >= start && s.today <= end,
      );
    const next = ranges.find(([start]) => start > s.today);
    const offseason = !dayInfo(s);
    return {
      open: Boolean(active || offseason),
      label: offseason
        ? "Entre temporadas"
        : active
          ? "Janela aberta"
          : "Janela fechada",
      start: active?.[0] ?? next?.[0] ?? 0,
      end: active?.[1] ?? next?.[1] ?? 41,
      days: active ? active[1] - s.today + 1 : next ? next[0] - s.today : null,
      ranges,
    };
  }
  const windowOpen = (s) => transferWindowInfo(s).open;
  function train(
    s,
    t,
    rng,
    played = false,
    international = new Map(),
    playedMinutes = null,
  ) {
    const nextTrainingMatch = t.id === s.clubId ? upcomingFixture(s) : null,
      session =
        t.id === s.clubId
          ? TR.session(
              s,
              nextTrainingMatch ? nextTrainingMatch.offset - s.today : null,
            )
          : { key: "technical", mode: "Técnica", focus: "balanced" },
      mode = session.mode,
      starters = played
        ? playedMinutes
          ? t.players.filter((p) => (playedMinutes[p.id] || 0) > 0)
          : lineup(t)
        : t.players.filter((p) => international.has(p.id)),
      fatigue = played ? T.ratings(t).fatigue : 0;
    let trained = 0,
      improved = 0;
    for (const p of t.players) {
      if (p.injury) p.injury--;
      const minutes = playedMinutes
        ? playedMinutes[p.id] || 0
        : starters.includes(p)
          ? 90
          : 0;
      const internationalLoad = international.get(p.id);
      const loadMinutes = Math.max(minutes, internationalLoad?.minutes || 0);
      if (session.key === "rest" && !loadMinutes)
        p.restDays = Math.max(1, p.restDays || 0);
      const physical = P.apply(p, {
        minutes: loadMinutes,
        extra: internationalLoad?.fatigue ?? fatigue,
        globalMode: mode,
        facility: t.facility,
      });
      const development = TR.process(s, t, p, physical, session);
      if (development) {
        trained++;
        if (development.improved) improved++;
      }
      if (t.id === s.clubId)
        p.lastPhysical = { ...physical, season: s.season, offset: s.today };
      if (
        starters.includes(p) &&
        !p.injury &&
        rng() <
          0.012 *
            (loadMinutes / 90) *
            (1 + Math.max(0, 85 - p.fitness) / 30 + (p.fatigue || 0) / 80)
      ) {
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
        physical.plan !== "rest" &&
        rng() <
          (p.age < 24 ? 0.22 : 0.06) *
            (physical.plan === "intense"
              ? 1.4
              : physical.plan === "light"
                ? 0.5
                : 1) *
            (1 + (t.facility - 1) * 0.2)
      )
        p.ovr = Math.min(p.potential, p.ovr + 1);
    }
    if (t.id === s.clubId) {
      for (const p of t.youth) {
        if (session.key === "rest") p.restDays = Math.max(1, p.restDays || 0);
        const physical = P.apply(p, { globalMode: mode, facility: t.facility });
        p.lastPhysical = { ...physical, season: s.season, offset: s.today };
        const development = TR.process(s, t, p, physical, session);
        if (development) {
          trained++;
          if (development.improved) improved++;
        }
      }
      TR.record(s, session, trained, improved);
    }
    if ((s.today + 1) % 7 === 0)
      t.youth.forEach((p) => {
        if (
          !p.injury &&
          !(p.restDays > 0) &&
          mode !== "Recuperação" &&
          !(
            p.lastPhysical?.offset === s.today &&
            p.lastPhysical?.plan === "rest"
          ) &&
          session.key !== "rest" &&
          session.key !== "recovery" &&
          rng() < 0.3 + t.facility * 0.03
        )
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
      const controlled =
        managed(s, f) &&
        m?.pair.join("|") === f.pair.join("|") &&
        m?.competition === f.competition;
      const played = controlled ? m : score(s, f, rng);
      const g = [...played.goals];
      const playerOfMatch = PF.commit(s, played, { managed: controlled });
      const entry = {
        ...copy(f),
        goals: g,
        winner: null,
        penalties: null,
        playerOfMatch,
      };
      if (f.kind === "national") {
        const plans = played.plans || matchPlans(s, f);
        for (const plan of plans)
          for (const p of plan.starters)
            international.set(p.id, {
              fatigue: plan.fatigue,
              minutes: played.minutesPlayed?.[p.id] ?? 90,
            });
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
      } else if (f.kind === "friendly") {
        const friendly = s.friendlies.find((x) => x.id === f.id);
        friendly.status = "completed";
        friendly.goals = [...g];
        const host = team(s, f.pair[0]);
        F.post(
          host,
          s,
          Math.round(
            ((host.finance.annualRevenue * 0.16) / 19) *
              0.25 *
              (1 + (host.stadium - 1) * 0.12),
          ),
          "matchday",
          `Bilheteria de preparação · ${f.name}`,
        );
        if (f.tournamentId) {
          const tournament = s.preseasonTournaments.find(
            (t) => t.id === f.tournamentId,
          );
          record(tournament.table, f.pair, g);
          if (
            s.friendlies
              .filter((x) => x.tournamentId === tournament.id)
              .every((x) => x.status === "completed")
          ) {
            tournament.status = "completed";
            tournament.champion = rank(tournament.table)[0].id;
            awardTrophy(
              s,
              tournament.champion,
              tournament.id,
              tournament.name,
              "preseason",
            );
            news(
              s,
              `${team(s, tournament.champion).name} venceu ${tournament.name}.`,
              {
                category: "competitions",
                clubIds: tournament.entrants,
                body: "Título de preparação. Os pontos não contam para a liga nem para a classificação continental.",
              },
            );
          }
        }
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
          awardTrophy(s, entry.winner, c.id, c.name, "continental");
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
      if (!["national", "friendly"].includes(f.kind) && g[0] !== g[1])
        F.winBonus(team(s, f.pair[g[0] > g[1] ? 0 : 1]), s);
      results.push(entry);
      if (managed(s, f)) {
        s.fixtureResults ??= [];
        s.fixtureResults.push({
          ...copy(entry),
          season: s.season,
          offset: s.today,
        });
        s.fixtureResults = s.fixtureResults.slice(-2000);
      }
    }
    s.teams.forEach((t) => {
      F.daily(t, s);
      train(
        s,
        t,
        rng,
        participants.has(t.id),
        international,
        m?.pair.includes(t.id) ? m.minutesPlayed || null : null,
      );
      if (t.id !== s.clubId) ensureAI(s, t);
    });
    for (const p of [
      ...s.freeAgents,
      ...s.teams.filter((t) => t.id !== s.clubId).flatMap((t) => t.youth),
    ]) {
      if (p.injury) p.injury--;
      P.apply(p, {
        minutes: international.get(p.id)?.minutes || 0,
        extra: international.get(p.id)?.fatigue || 0,
        globalMode: "Recuperação",
      });
    }
    const ownResult = results.find((r) => managed(s, r));
    if (ownResult) {
      s.last = ownResult;
      if (ownResult.playerOfMatch) {
        const p = ownResult.playerOfMatch;
        news(s, `${p.name} é o melhor em campo.`, {
          category: "results",
          clubIds: ownResult.pair,
          competitionId: ownResult.competition,
          body: `${team(s, p.clubId).name}: nota ${p.rating.toFixed(1).replace(".", ",")}, ${p.goals} gol${p.goals === 1 ? "" : "s"}, ${p.assists} assistência${p.assists === 1 ? "" : "s"}${p.keeper ? `, ${p.saves} defesas e ${p.conceded} gols sofridos` : ""}. O prêmio considera o desempenho nesta partida.`,
        });
      }
      s.news.unshift(
        `${team(s, ownResult.pair[0]).name} ${ownResult.goals[0]} × ${ownResult.goals[1]} ${team(s, ownResult.pair[1]).name}${ownResult.penalties ? " · pênaltis " + ownResult.penalties.join("–") : ""}.`,
      );
      s.news = s.news.slice(0, 70);
      if (m) {
        m.done = true;
        m.penalties = ownResult.penalties;
        m.events.unshift("Fim de jogo. Resultado e calendário salvos.");
        if (ownResult.playerOfMatch)
          m.events.unshift(
            `Melhor em campo: ${ownResult.playerOfMatch.name} · nota ${ownResult.playerOfMatch.rating.toFixed(1).replace(".", ",")}.`,
          );
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
    announcePlayerAwards(s, PF.closeMonth(s));
    processNegotiations(s);
    const invitation = N.review(s);
    if (invitation)
      news(s, `Convite para treinar ${invitation.name}.`, {
        category: "coaches",
        clubIds: [s.clubId, invitation.selectionId],
        body: invitation.reason + " Responda em Seleções dentro de 14 dias.",
      });
    for (const report of SC.process(s))
      news(s, "Relatório do olheiro disponível.", {
        category: "club",
        clubIds: [s.clubId],
        body: `${report.scope === "youth" ? "Base" : "Mercado"}: ${report.players.length} opções compatíveis com os recursos do clube.`,
      });
    const next = calendar(s)[s.day];
    if (next?.kind === "cup") prepareKnockouts(s, next.round);
    if (!next) seasonEnd(s, rng);
    return results;
  }
  function careerCalendar(s, scope = "career") {
    const fixtures = [],
      seen = new Set();
    function add(f, offset) {
      if (!f) return;
      const key = offset + "|" + f.competition + "|" + f.pair.join("|");
      if (seen.has(key)) return;
      seen.add(key);
      const result = (s.fixtureResults || []).find(
        (r) =>
          r.season === s.season &&
          r.offset === offset &&
          r.competition === f.competition &&
          r.pair.join("|") === f.pair.join("|"),
      );
      fixtures.push({
        ...f,
        offset,
        goals: result?.goals || null,
        penalties: result?.penalties || null,
      });
    }
    if (scope !== "national")
      calendar(s).forEach((d, i) => {
        const f = managedFixtureAt(s, i, d.offset);
        if (f?.kind !== "national") add(f, d.offset);
      });
    if (scope !== "national")
      for (const f of s.friendlies || [])
        if (f.status !== "cancelled" && f.pair.includes(s.clubId))
          add(f, f.offset);
    if (scope !== "club" && s.national?.job)
      for (const f of s.national.fixtures.filter((f) =>
        f.pair.includes(s.national.job),
      ))
        add(f, f.offset);
    return fixtures.sort(
      (a, b) => a.offset - b.offset || a.name.localeCompare(b.name),
    );
  }
  function awardTrophy(s, clubId, competitionId, name, kind) {
    s.trophies ??= [];
    const id = `${s.season}-${competitionId}-${clubId}`;
    if (s.trophies.some((t) => t.id === id)) return;
    s.trophies.unshift({
      id,
      clubId,
      competitionId,
      name,
      kind,
      season: s.season,
      offset: s.today,
      coachId: clubId === s.clubId ? "you" : null,
      celebrated: clubId !== s.clubId,
    });
    s.trophies = s.trophies.slice(0, 1000);
    if (kind !== "preseason")
      announcePlayerAwards(
        s,
        [PF.closeCompetition(s, competitionId)].filter(Boolean),
      );
  }
  function announcePlayerAwards(s, awards) {
    const ownLeague = team(s)?.leagueId;
    for (const a of awards) {
      if (
        !["ballon", "keeper"].includes(a.type) &&
        a.competition !== ownLeague &&
        a.winner.clubId !== s.clubId &&
        !s.cups.some(
          (c) => c.id === a.competition && c.entrants.includes(s.clubId),
        )
      )
        continue;
      news(
        s,
        `${a.winner.name} conquista ${a.name}${a.competitionName ? " · " + a.competitionName : ""}.`,
        {
          category: "competitions",
          clubIds: [a.winner.clubId],
          competitionId: a.competition,
          body: `${a.month ? "Referência: " + a.month + ". " : ""}Nota média ${a.winner.average?.toFixed(2).replace(".", ",")}; ${a.winner.goals} gols e ${a.winner.assists} assistências${a.winner.pos === "GOL" ? `; ${a.winner.saves} defesas e ${a.winner.cleanSheets} jogos sem sofrer gol` : ""}. A premiação usa o desempenho acompanhado na carreira.`,
        },
      );
    }
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
      awardTrophy(s, l.ranking[0], l.id, l.name, "league");
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
    announcePlayerAwards(s, PF.closeSeason(s));
    const invitation = N.review(s, true);
    if (invitation)
      news(s, `Convite para treinar ${invitation.name}.`, {
        category: "coaches",
        clubIds: [s.clubId, invitation.selectionId],
        body: invitation.reason,
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
  function marketPlayers(s, filters = {}) {
    const normalize = (value) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const bound = (value, fallback) =>
      value === "" || value == null ? fallback : Number(value);
    const minOverall = bound(filters.overallMin, 0),
      maxOverall = bound(filters.overallMax, 100),
      minAge = bound(filters.ageMin, -Infinity),
      maxAge = bound(filters.ageMax, Infinity),
      maxPrice = bound(filters.priceMax, Infinity),
      ageLimited = Number.isFinite(minAge) || Number.isFinite(maxAge);
    const result = s.teams
      .filter(
        (t) =>
          t.id !== s.clubId &&
          (!filters.league ||
            filters.league === "all" ||
            t.leagueId === filters.league),
      )
      .flatMap((t) => t.players.map((p) => ({ ...p, sellerName: t.name })))
      .concat(
        !filters.league || ["all", "free"].includes(filters.league)
          ? s.freeAgents.map((p) => ({ ...p, sellerName: "Sem clube" }))
          : [],
      )
      .filter((p) => {
        const nations = (
          p.nationalities?.length ? p.nationalities : [p.nationality]
        ).filter(Boolean);
        return (
          (!filters.position ||
            filters.position === "all" ||
            T.positionMatches(p, filters.position)) &&
          normalize(p.name).includes(normalize(filters.query)) &&
          p.ovr >= minOverall &&
          p.ovr <= maxOverall &&
          p.price <= maxPrice &&
          (!ageLimited ||
            (!p.ageUnknown && p.age >= minAge && p.age <= maxAge)) &&
          (!filters.nationality ||
            filters.nationality === "all" ||
            (filters.nationality === "unknown"
              ? !nations.length
              : nations.includes(filters.nationality)))
        );
      });
    const byName = (a, b) =>
      a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id);
    const sorts = {
      "overall-desc": (a, b) => b.ovr - a.ovr || byName(a, b),
      "age-asc": (a, b) =>
        Number(Boolean(a.ageUnknown)) - Number(Boolean(b.ageUnknown)) ||
        (!a.ageUnknown && !b.ageUnknown ? a.age - b.age : 0) ||
        byName(a, b),
      "age-desc": (a, b) =>
        Number(Boolean(a.ageUnknown)) - Number(Boolean(b.ageUnknown)) ||
        (!a.ageUnknown && !b.ageUnknown ? b.age - a.age : 0) ||
        byName(a, b),
      "value-asc": (a, b) => a.price - b.price || byName(a, b),
      "value-desc": (a, b) => b.price - a.price || byName(a, b),
      name: byName,
    };
    return sorts[filters.sort] ? result.sort(sorts[filters.sort]) : result;
  }
  const SQUAD_ROLES = {
    key: "Indispensável",
    important: "Jogador importante",
    rotation: "Rotação",
    backup: "Reserva",
    prospect: "Promessa",
  };
  function ensureSquadNumbers(t) {
    const players = [...t.players, ...t.youth],
      used = new Set(),
      ranked = [...t.players].sort((a, b) => b.ovr - a.ovr);
    for (const p of players)
      if (!p.squadRole) {
        const rank = ranked.indexOf(p);
        p.squadRole =
          t.youth.includes(p) || (p.age < 21 && rank >= 11)
            ? "prospect"
            : rank < 3
              ? "key"
              : rank < 11
                ? "important"
                : rank < 20
                  ? "rotation"
                  : "backup";
      }
    for (const p of players) {
      if (
        Number.isInteger(p.shirtNumber) &&
        p.shirtNumber >= 1 &&
        p.shirtNumber <= 99 &&
        !used.has(p.shirtNumber)
      )
        used.add(p.shirtNumber);
      else delete p.shirtNumber;
    }
    for (const p of [...players].sort(
      (a, b) =>
        Number(b.pos === "GOL") - Number(a.pos === "GOL") || b.ovr - a.ovr,
    ))
      if (!p.shirtNumber) {
        const preferred =
          {
            GOL: [1, 12, 22],
            LAT: [2, 6],
            ZAG: [3, 4, 5],
            VOL: [5, 8],
            MEI: [10, 8],
            ATA: [9, 7, 11],
          }[p.pos] || [];
        p.shirtNumber = [
          ...preferred,
          ...Array.from({ length: 99 }, (_, i) => i + 1),
        ].find((n) => !used.has(n));
        if (p.shirtNumber) used.add(p.shirtNumber);
      }
  }
  function setShirtNumber(s, id, number) {
    if (!s.clubId) fail("Comece uma carreira primeiro.");
    if (s.live && !s.live.done)
      fail("Conclua a partida antes de mudar a numeração.");
    const t = team(s),
      players = [...t.players, ...t.youth],
      p = players.find((p) => p.id === id);
    if (!p || !Number.isInteger(number) || number < 1 || number > 99)
      fail("Escolha um número de 1 a 99 para um atleta do clube.");
    if (players.some((p) => p.id !== id && p.shirtNumber === number))
      fail("Esse número já pertence a outro jogador do elenco ou da base.");
    p.shirtNumber = number;
  }
  function contractCapacity(s, n, p, salary, bonus) {
    if (n.kind !== "renewal")
      return F.canHire(team(s), p, n.fee, salary, s, bonus);
    if (F.payroll(team(s)) - p.salary + salary > team(s).finance.wageBudget)
      fail("A renovação excede o teto salarial. Ajuste o Financeiro.");
    if (team(s).money < bonus)
      fail("Caixa insuficiente para as luvas da renovação.");
  }
  function proposeRenewal(
    s,
    playerId,
    salary,
    years,
    bonus,
    role = "rotation",
  ) {
    if (s.live && !s.live.done)
      fail("Conclua a partida antes de negociar a renovação.");
    const p = team(s)?.players.find((p) => p.id === playerId);
    if (!p) fail("Jogador não pertence ao elenco profissional.");
    terms(s, years, salary);
    if (
      !Number.isSafeInteger(bonus) ||
      bonus < 0 ||
      bonus > 1e12 ||
      !Object.hasOwn(SQUAD_ROLES, role)
    )
      fail("Revise as luvas e o papel no elenco.");
    if (
      s.negotiations.some(
        (n) => negotiationActive(n) && n.playerId === playerId,
      )
    )
      fail("Você já tem uma negociação com esse jogador.");
    if (s.negotiations.filter(negotiationActive).length >= 20)
      fail("Conclua uma negociação antes de iniciar outra.");
    contractCapacity(s, { kind: "renewal" }, p, salary, bonus);
    const n = {
      id: "neg-" + ++s.negotiationSequence,
      kind: "renewal",
      playerId,
      playerName: p.name,
      buyerId: s.clubId,
      sellerId: s.clubId,
      fee: 0,
      salary: 0,
      years,
      bonus: 0,
      role,
      clubRounds: 0,
      playerRounds: 0,
      askFee: 0,
      askSalary: 0,
      askBonus: 0,
      askYears: years,
      createdOn: negotiationDate(s),
      history: [],
    };
    s.negotiations.unshift(n);
    s.negotiations = s.negotiations.slice(0, 100);
    negotiationUpdate(
      s,
      n,
      "contract-ready",
      "Renovação iniciada: o jogador vai avaliar as condições.",
    );
    return negotiatePlayer(s, n.id, salary, years, bonus, role);
  }
  const NEGOTIATION_STAGES = [
    "club-pending",
    "club-counter",
    "contract-ready",
    "player-pending",
    "player-counter",
    "medical-pending",
    "signature-pending",
    "blocked",
    "completed",
    "rejected",
    "cancelled",
    "expired",
  ];
  const negotiationActive = (n) =>
    !["completed", "rejected", "cancelled", "expired"].includes(n.stage);
  const negotiationDate = (s, days = 0) =>
    D.at(s, s.today + days)
      .toISOString()
      .slice(0, 10);
  function negotiationUpdate(s, n, stage, message, delay = 0) {
    n.stage = stage;
    n.message = message;
    n.updatedOn = negotiationDate(s);
    n.dueOn = delay ? negotiationDate(s, delay) : null;
    n.expiresOn = [
      "club-counter",
      "contract-ready",
      "player-counter",
      "blocked",
    ].includes(stage)
      ? negotiationDate(s, 10)
      : null;
    n.history.push({ date: n.updatedOn, stage, message });
    n.history = n.history.slice(-24);
    s.negotiationRevision = (s.negotiationRevision || 0) + 1;
    news(s, `${n.playerName}: ${message}`, {
      category: n.kind === "renewal" ? "contracts" : "market",
      clubIds: [...new Set([n.buyerId, ...(n.sellerId ? [n.sellerId] : [])])],
    });
  }
  function negotiationCheck(s, id, stages) {
    if (s.live && !s.live.done) fail("Conclua a partida antes de negociar.");
    const n = (s.negotiations || []).find((n) => n.id === id);
    if (!n || n.buyerId !== s.clubId || !stages.includes(n.stage))
      fail("Esta negociação não está disponível nesta etapa.");
    if (n.kind !== "renewal" && !windowOpen(s))
      fail("A janela de transferências está fechada.");
    const found = locate(s, n.playerId);
    if (!found || (found.t?.id || null) !== n.sellerId)
      fail(
        "O jogador mudou de clube; avance um dia para atualizar a negociação.",
      );
    return { n, ...found };
  }
  function validateClubFee(s, fee) {
    if (!Number.isSafeInteger(fee) || fee < 0 || fee > 1e13)
      fail("Informe um valor inteiro válido para a transferência.");
    const buyer = team(s);
    if (fee > buyer.finance.transferBudget)
      fail("A proposta excede a verba de transferências.");
    if (fee > buyer.money) fail("O caixa não cobre esta proposta.");
  }
  function negotiateClub(s, playerId, fee) {
    if (!s.clubId) fail("Comece uma carreira primeiro.");
    if (s.live && !s.live.done) fail("Conclua a partida antes de negociar.");
    if (!windowOpen(s)) fail("A janela de transferências está fechada.");
    const found = locate(s, playerId);
    if (!found || found.t?.id === s.clubId) fail("Jogador indisponível.");
    const active = (s.negotiations || []).filter(negotiationActive);
    if (active.some((n) => n.playerId === playerId))
      fail("Você já tem uma negociação em andamento com esse atleta.");
    if (active.length >= 20)
      fail("Conclua ou cancele uma das vinte negociações em andamento.");
    validateClubFee(s, fee);
    if (!found.t && fee !== 0)
      fail("Jogadores livres não têm taxa de transferência.");
    const { p, t } = found;
    const n = {
      id: "neg-" + ((s.negotiationSequence || 0) + 1),
      playerId,
      playerName: p.name,
      buyerId: s.clubId,
      sellerId: t?.id || null,
      fee,
      salary: 0,
      years: 2,
      bonus: 0,
      role: "rotation",
      clubRounds: t ? 1 : 0,
      playerRounds: 0,
      askFee: t
        ? Math.ceil(
            minFee(s, p) *
              (t.players.filter((x) => x.ovr > p.ovr).length < 3 ? 1.15 : 1.05),
          )
        : 0,
      askSalary: 0,
      askBonus: 0,
      askYears: 2,
      createdOn: negotiationDate(s),
      history: [],
    };
    s.negotiationSequence = (s.negotiationSequence || 0) + 1;
    s.negotiations = [n, ...(s.negotiations || [])].filter(
      (x, i, all) =>
        negotiationActive(x) ||
        all.slice(0, i).filter((v) => !negotiationActive(v)).length < 80,
    );
    negotiationUpdate(
      s,
      n,
      t ? "club-pending" : "contract-ready",
      t
        ? "Proposta enviada ao clube. Resposta em dois dias."
        : "Atleta livre: você pode negociar o contrato diretamente.",
      t ? 2 : 0,
    );
    return n;
  }
  function counterClub(s, id, fee) {
    const { n } = negotiationCheck(s, id, ["club-counter"]);
    validateClubFee(s, fee);
    n.fee = fee;
    n.clubRounds++;
    negotiationUpdate(
      s,
      n,
      "club-pending",
      "Nova proposta enviada ao clube. Resposta em dois dias.",
      2,
    );
    return n;
  }
  function negotiatePlayer(s, id, salary, years, bonus, role = "rotation") {
    const { n, p } = negotiationCheck(s, id, [
      "contract-ready",
      "player-counter",
    ]);
    terms(s, years, salary);
    if (
      !Number.isSafeInteger(bonus) ||
      bonus < 0 ||
      bonus > 1e12 ||
      !Object.hasOwn(SQUAD_ROLES, role)
    )
      fail("Informe luvas e papel no elenco válidos.");
    contractCapacity(s, n, p, salary, bonus);
    const roleFactor =
      role === "key"
        ? 0.98
        : role === "important"
          ? 1
          : role === "backup"
            ? 1.12
            : role === "prospect" && p.age >= 24
              ? 1.15
              : 1.05;
    const reputationFactor = Math.max(
      1,
      Math.min(1.25, 1 + (p.ovr - 50 - s.reputation * 0.4) * 0.005),
    );
    n.askSalary = Math.max(
      1500,
      Math.min(
        30000000,
        Math.ceil(
          Math.max(p.salary, p.marketSalary || p.salary) *
            (n.kind === "renewal"
              ? p.age >= 33
                ? 0.98
                : 1.1
              : n.sellerId
                ? 1.15
                : 1.05) *
            roleFactor *
            reputationFactor,
        ),
      ),
    );
    n.askBonus = n.askSalary * 4;
    n.askYears = p.age >= 32 ? 2 : p.age < 24 ? 4 : 3;
    Object.assign(n, {
      salary,
      years,
      bonus,
      role,
      playerRounds: n.playerRounds + 1,
    });
    negotiationUpdate(
      s,
      n,
      "player-pending",
      "Contrato enviado ao jogador e ao empresário. Resposta em dois dias.",
      2,
    );
    return n;
  }
  function cancelNegotiation(s, id) {
    const n = (s.negotiations || []).find(
      (n) => n.id === id && n.buyerId === s.clubId,
    );
    if (!n || !negotiationActive(n)) fail("Negociação já encerrada.");
    negotiationUpdate(
      s,
      n,
      "cancelled",
      "Você encerrou a negociação. Nenhum valor foi cobrado.",
    );
  }
  function retryNegotiation(s, id) {
    const { n, p } = negotiationCheck(s, id, ["blocked"]);
    contractCapacity(s, n, p, n.salary, n.bonus);
    negotiationUpdate(
      s,
      n,
      n.kind === "renewal" ? "signature-pending" : "medical-pending",
      "Recursos conferidos. Documentação será reavaliada em um dia.",
      1,
    );
  }
  function processNegotiations(s) {
    const today = negotiationDate(s);
    for (const n of (s.negotiations || []).filter(negotiationActive)) {
      const found = locate(s, n.playerId);
      if (s.clubId !== n.buyerId) {
        negotiationUpdate(
          s,
          n,
          "cancelled",
          "Negociação cancelada após a mudança de treinador.",
        );
        continue;
      }
      if (!found || (found.t?.id || null) !== n.sellerId) {
        negotiationUpdate(
          s,
          n,
          "cancelled",
          "O jogador não está mais disponível no clube de origem.",
        );
        continue;
      }
      if (n.kind !== "renewal" && !windowOpen(s)) {
        negotiationUpdate(
          s,
          n,
          "expired",
          "A janela encerrou antes da conclusão do acordo.",
        );
        continue;
      }
      if (n.dueOn && Date.parse(today) - Date.parse(n.dueOn) > 10 * 86400000) {
        negotiationUpdate(
          s,
          n,
          "expired",
          "A negociação expirou durante o intervalo entre temporadas.",
        );
        continue;
      }
      if (n.expiresOn && today >= n.expiresOn) {
        negotiationUpdate(
          s,
          n,
          "expired",
          "A proposta expirou após dez dias sem resposta.",
        );
        continue;
      }
      if (!n.dueOn || today < n.dueOn) continue;
      const { p, t } = found;
      if (n.stage === "club-pending") {
        if (t.players.length <= 16)
          negotiationUpdate(
            s,
            n,
            "rejected",
            "O clube recusou liberar o jogador por ter elenco reduzido.",
          );
        else if (
          n.fee >=
          Math.max(
            Math.ceil(
              minFee(s, p) *
                (t.money < F.payroll(t) * 8
                  ? 0.9
                  : t.players.filter((x) => x.ovr > p.ovr).length < 3
                    ? 1
                    : t.players.length >= 25
                      ? 0.93
                      : 0.97),
            ),
            Math.ceil(
              n.askFee *
                (n.clubRounds > 1
                  ? 0.97
                  : p.contract <= s.season + 1
                    ? 0.97
                    : 1),
            ),
          )
        )
          negotiationUpdate(
            s,
            n,
            "contract-ready",
            n.fee < n.askFee
              ? "O clube aceitou ceder no valor. Agora negocie o contrato com o jogador."
              : "O clube aceitou a transferência. Agora negocie o contrato com o jogador.",
          );
        else if (n.fee < n.askFee * 0.45 || n.clubRounds >= 3)
          negotiationUpdate(
            s,
            n,
            "rejected",
            "O clube encerrou as conversas por falta de acordo no valor.",
          );
        else {
          const priorAsk = n.askFee;
          if (n.clubRounds > 1 && n.fee >= priorAsk * 0.8)
            n.askFee = Math.max(
              Math.ceil(minFee(s, p) * 0.93),
              Math.ceil(priorAsk * 0.97),
            );
          negotiationUpdate(
            s,
            n,
            "club-counter",
            `${n.askFee < priorAsk ? "O clube cedeu na negociação. " : n.fee < priorAsk * 0.65 ? "A diretoria considerou a oferta muito baixa. " : ""}Contraproposta: R$ ${n.askFee.toLocaleString("pt-BR")}. Você pode aceitar ou melhorar sua proposta.`,
          );
        }
      } else if (n.stage === "player-pending") {
        const yearsOK = p.age >= 32 ? n.years <= 2 : n.years >= n.askYears;
        if (n.salary >= n.askSalary && n.bonus >= n.askBonus && yearsOK)
          negotiationUpdate(
            s,
            n,
            n.kind === "renewal" ? "signature-pending" : "medical-pending",
            n.kind === "renewal"
              ? "O jogador aceitou a renovação. Assinatura em um dia."
              : "O jogador aceitou o contrato. Exames e documentação em um dia.",
            1,
          );
        else if (n.salary < n.askSalary * 0.55 || n.playerRounds >= 3)
          negotiationUpdate(
            s,
            n,
            "rejected",
            "O jogador encerrou as conversas por falta de acordo contratual.",
          );
        else
          negotiationUpdate(
            s,
            n,
            "player-counter",
            `O empresário pede R$ ${n.askSalary.toLocaleString("pt-BR")} por semana, R$ ${n.askBonus.toLocaleString("pt-BR")} de luvas e ${n.askYears} temporadas.`,
          );
      } else if (
        n.stage === "medical-pending" ||
        n.stage === "signature-pending"
      ) {
        try {
          if (n.kind === "renewal") {
            contractCapacity(s, n, p, n.salary, n.bonus);
            F.post(
              team(s),
              s,
              -n.bonus,
              "signing",
              `Luvas de renovação · ${p.name}`,
            );
            p.salary = n.salary;
            p.contract = Math.max(p.contract, s.season + n.years);
          } else buy(s, p.id, n.fee, n.salary, n.years, n.bonus, n);
          p.squadRole = n.role;
          negotiationUpdate(
            s,
            n,
            "completed",
            n.kind === "renewal"
              ? "Renovação assinada. Salário, duração e papel no clube foram atualizados."
              : "Contrato assinado. O jogador já faz parte do elenco e os valores foram lançados no extrato.",
          );
        } catch (error) {
          negotiationUpdate(
            s,
            n,
            "blocked",
            "Assinatura pendente: " + error.message,
          );
        }
      }
    }
  }
  function buy(
    s,
    id,
    fee,
    salary,
    years,
    signingBonus = salary * 4,
    agreement = null,
  ) {
    if (!windowOpen(s)) fail("A janela de transferências está fechada.");
    terms(s, years, salary);
    const found = locate(s, id),
      buyer = team(s);
    if (!found || found.t === buyer) fail("Jogador indisponível.");
    const { p, t: seller } = found;
    if (!Number.isFinite(fee) || fee < 0) fail("Valor de proposta inválido.");
    if (!seller && fee !== 0)
      fail("Jogadores sem clube não têm taxa de transferência.");
    if (
      seller &&
      fee < minFee(s, p) &&
      !(
        agreement &&
        s.negotiations?.includes(agreement) &&
        agreement.stage === "medical-pending" &&
        agreement.playerId === id &&
        agreement.buyerId === s.clubId &&
        agreement.sellerId === seller.id &&
        agreement.fee === fee
      )
    )
      fail(
        `Proposta recusada. O clube pede pelo menos R$ ${minFee(s, p).toLocaleString("pt-BR")}.`,
      );
    if (seller && seller.players.length <= 16)
      fail("O clube não libera o atleta: elenco reduzido.");
    if (salary < Math.ceil(p.salary * (seller ? 1.1 : 1)))
      fail("O jogador recusou o salário. Ofereça o valor sugerido ou mais.");
    if (
      !Number.isSafeInteger(signingBonus) ||
      signingBonus < 0 ||
      signingBonus > 1e12
    )
      fail("Luvas inválidas.");
    F.canHire(buyer, p, fee, salary, s, signingBonus);
    F.post(buyer, s, -fee, "transfer", `Compra · ${p.name}`);
    F.post(
      buyer,
      s,
      -signingBonus,
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
    delete p.shirtNumber;
    buyer.players.push(p);
    ensureSquadNumbers(buyer);
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
    delete p.shirtNumber;
    buyer.players.push(p);
    ensureSquadNumbers(buyer);
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
  function setRecoveryPlan(s, id, value) {
    if (!s.clubId) fail("Comece uma carreira primeiro.");
    if (s.live && !s.live.done)
      fail("Conclua a partida antes de mudar a carga de treino.");
    const t = team(s),
      p = [...t.players, ...t.youth].find((p) => p.id === id);
    if (!p) fail("Jogador não pertence ao clube.");
    if (/^rest[1-7]$/.test(value)) {
      p.restDays = Number(value.slice(4));
      p.trainingPlan = "auto";
      return;
    }
    if (!["auto", "light", "normal", "intense"].includes(value))
      fail("Plano de recuperação inválido.");
    if (p.injury && value === "intense")
      fail("O departamento médico não libera treino intenso durante a lesão.");
    p.trainingPlan = value;
    p.restDays = 0;
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
    processNegotiations(s);
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
    s.friendlies = [];
    s.preseasonTournaments = [];
    s.day = 0;
    s.today = 0;
    PF.ensure(s);
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
        p.fatigue = 0;
        p.restDays = 0;
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
    processNegotiations(s);
    news(
      s,
      `Temporada ${D.label(s)} iniciada. Novas classificações continentais e janela aberta.`,
    );
  }
  function upgradeSave(old) {
    if (old.version === 3) return old;
    const baseline = fresh(),
      s = {
        ...baseline,
        ...copy(old),
        version: 3,
        today: calendar(old)[old.day]?.offset ?? 263,
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
    marketPlayers,
    scouting: SC,
    SQUAD_ROLES,
    proposeRenewal,
    setShirtNumber,
    physical: P,
    training: TR,
    performance: PF,
    setRecoveryPlan,
    NEGOTIATION_STAGES,
    negotiationActive,
    negotiateClub,
    counterClub,
    negotiatePlayer,
    cancelNegotiation,
    retryNegotiation,
    enableTestMode,
    addTestFunds,
    tactics: T,
    currentMatch,
    arrangeFriendly,
    cancelFriendly,
    organizePreseason,
    cancelPreseason,
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
    schedule: D,
    seasonLabel: D.label,
    dayInfo,
    allFixtures,
    nextFixture,
    lineup,
    strength,
    makeMatch,
    minute,
    matchVisual,
    matchFitness,
    fatigueLoss,
    startSecondHalf,
    substitute,
    advance,
    windowOpen,
    transferWindowInfo,
    advancePlanning,
    careerCalendar,
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
