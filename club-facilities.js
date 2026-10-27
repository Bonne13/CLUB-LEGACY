"use strict";
(function (root) {
  const DATA =
    typeof module !== "undefined"
      ? require("./club-context-data.js")
      : root.LegacyClubContext;
  const F =
    typeof module !== "undefined"
      ? require("./finance.js")
      : root.LegacyFinance;
  const D =
    typeof module !== "undefined"
      ? require("./schedule.js")
      : root.LegacySchedule;
  const catalog = new Map(DATA.clubs.map((c) => [c.id, c]));
  const definitions = {
    stadium: {
      label: "Estádio",
      days: 90,
      factor: 0.008,
      min: 3000000,
      benefit:
        "Amplia a capacidade em 12% e melhora a receita dos jogos em casa.",
    },
    facility: {
      label: "Centro de treinamento",
      days: 45,
      factor: 0.009,
      min: 1500000,
      benefit: "Melhora a preparação e o desenvolvimento técnico do elenco.",
    },
    academy: {
      label: "Centro de formação",
      days: 60,
      factor: 0.006,
      min: 1000000,
      benefit: "Aumenta o desenvolvimento dos jovens já presentes na base.",
    },
    medical: {
      label: "Departamento médico",
      days: 28,
      factor: 0.003,
      min: 750000,
      benefit: "Melhora a recuperação de energia e reduz o risco de lesões.",
    },
    scouting: {
      label: "Rede de observação",
      days: 21,
      factor: 0.002,
      min: 500000,
      benefit:
        "Acelera as missões e aumenta a confiança dos relatórios dos olheiros.",
    },
    commercial: {
      label: "Área comercial",
      days: 35,
      factor: 0.004,
      min: 1000000,
      benefit:
        "Melhora as receitas de bilheteria e as propostas de patrocínio.",
    },
  };
  const names = {
    Barcelona: "Ciutat Esportiva Joan Gamper",
    "Real Madrid": "Ciudad Real Madrid",
    Flamengo: "CT George Helal · Ninho do Urubu",
    Palmeiras: "Academia de Futebol",
    Corinthians: "CT Joaquim Grava",
    "São Paulo": "Centro de Treinamento da Barra Funda",
    Santos: "CT Rei Pelé",
    Fluminense: "CT Carlos Castilho",
    Botafogo: "Espaço Lonier",
    Grêmio: "CT Presidente Luiz Carvalho",
    Internacional: "CT Parque Gigante",
    Cruzeiro: "Toca da Raposa II",
    "Atlético Mineiro": "Cidade do Galo",
    "Vasco da Gama": "CT Moacyr Barbosa",
    "Manchester City": "City Football Academy",
    "Manchester United": "Carrington",
    Liverpool: "AXA Training Centre",
    Arsenal: "London Colney",
    Chelsea: "Cobham",
    "Bayern de Munique": "Säbener Straße",
    "Paris Saint-Germain": "Campus PSG",
    Benfica: "Benfica Campus",
    "Sporting CP": "Academia Cristiano Ronaldo",
    Ajax: "De Toekomst",
    Juventus: "Juventus Training Center",
    Milan: "Milanello",
    "Inter de Milão": "Centro Sportivo Angelo Moratti",
    "River Plate": "River Camp",
    "Boca Juniors": "Boca Predio",
  };
  const academies = new Set([
    "Barcelona",
    "Ajax",
    "Benfica",
    "Sporting CP",
    "River Plate",
    "Santos",
    "Palmeiras",
  ]);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const level = (t, key) =>
    key === "stadium" || key === "facility"
      ? t[key]
      : t.infrastructure?.levels[key] || 1;
  function profile(t) {
    const source = catalog.get(t.id),
      ref = source?.name === t.name ? source : null,
      revenue = t.finance?.annualRevenue || F.profile(t).revenue;
    const tier =
      revenue >= 3e9
        ? 5
        : revenue >= 1e9
          ? 4
          : revenue >= 3e8
            ? 3
            : revenue >= 6e7
              ? 2
              : 1;
    const capacity = ref?.venue.capacity || null,
      gameCapacity = capacity || [6000, 12000, 24000, 42000, 60000][tier - 1];
    return {
      venue: ref
        ? { ...ref.venue }
        : {
            name: "Estádio a confirmar",
            capacity: null,
            url: null,
            reference: null,
          },
      gameCapacity,
      trainingName: names[t.name] || "Centro de treinamento de " + t.name,
      facility: tier,
      stadium:
        gameCapacity >= 80000
          ? 5
          : gameCapacity >= 45000
            ? 4
            : gameCapacity >= 24000
              ? 3
              : gameCapacity >= 12000
                ? 2
                : 1,
      levels: {
        academy: academies.has(t.name) ? 5 : clamp(tier, 1, 4),
        medical: clamp(tier - 1, 1, 4),
        scouting: clamp(tier, 1, 4),
        commercial: clamp(tier - 1, 1, 4),
      },
    };
  }
  function ensure(t, s, preserve = true) {
    if (t.infrastructure) return t.infrastructure;
    const p = profile(t),
      extraFacility = preserve ? Math.max(0, (t.facility || 1) - 1) : 0,
      extraStadium = preserve ? Math.max(0, (t.stadium || 1) - 1) : 0;
    t.facility = clamp(p.facility + extraFacility, 1, 5);
    t.stadium = clamp(p.stadium + extraStadium, 1, 5);
    return (t.infrastructure = {
      version: 1,
      referenceRevision: DATA.revision,
      venue: p.venue,
      trainingName: p.trainingName,
      gameCapacity: Math.round(p.gameCapacity * Math.pow(1.12, extraStadium)),
      initialCapacity: p.gameCapacity,
      levels: p.levels,
      projects: [],
      history: [],
    });
  }
  function quote(s, t, key) {
    if (!Object.hasOwn(definitions, key)) throw Error("Instalação inválida.");
    const i = ensure(t, s),
      current = level(t, key),
      def = definitions[key];
    const cost =
      Math.round(
        (Math.max(
          def.min,
          (t.finance?.annualRevenue || F.profile(t).revenue) * def.factor +
            (key === "stadium" ? i.gameCapacity * 900 : 0),
        ) *
          (current + 1)) /
          4 /
          10000,
      ) * 10000;
    const days = Math.round(def.days * (0.6 + (current + 1) * 0.16));
    return {
      key,
      current,
      target: Math.min(5, current + 1),
      cost,
      days,
      max: current >= 5,
      active:
        i.projects.find((p) => p.key === key && p.status === "building") ||
        null,
    };
  }
  function start(s, t, key) {
    if (s.live && !s.live.done)
      throw Error("Conclua a partida antes de iniciar uma obra.");
    const q = quote(s, t, key);
    if (q.max) throw Error("Instalação no nível máximo.");
    if (q.active) throw Error("Já existe uma obra em andamento nesta área.");
    if (t.money < q.cost) throw Error("Caixa insuficiente para esta obra.");
    const i = t.infrastructure,
      startAt = D.at(s).getTime(),
      project = {
        id: "build-" + key + "-" + startAt + "-" + i.projects.length,
        key,
        target: q.target,
        cost: q.cost,
        days: q.days,
        startAt,
        dueAt: startAt + q.days * D.dayMS,
        status: "building",
      };
    F.post(
      t,
      s,
      -q.cost,
      "facilities",
      "Início da obra · " + definitions[key].label + " · nível " + q.target,
    );
    i.projects.push(project);
    return project;
  }
  function progress(s, p) {
    return clamp((D.at(s).getTime() - p.startAt) / (p.dueAt - p.startAt), 0, 1);
  }
  function refund(s, p) {
    return Math.round(p.cost * (1 - progress(s, p)) * 0.8);
  }
  function cancel(s, t, id) {
    if (s.live && !s.live.done)
      throw Error("Conclua a partida antes de cancelar uma obra.");
    const p = t.infrastructure?.projects.find(
      (p) => p.id === id && p.status === "building",
    );
    if (!p) throw Error("Obra indisponível para cancelamento.");
    const amount = refund(s, p);
    p.status = "cancelled";
    p.closedAt = D.at(s).getTime();
    p.refund = amount;
    F.post(
      t,
      s,
      amount,
      "facilities",
      "Restituição parcial · " + definitions[p.key].label,
    );
    return amount;
  }
  function tick(s, t) {
    const i = t.infrastructure;
    if (!i) return [];
    const completed = [];
    for (const p of i.projects)
      if (p.status === "building" && D.at(s).getTime() >= p.dueAt) {
        if (p.key === "stadium" || p.key === "facility")
          t[p.key] = Math.max(t[p.key], p.target);
        else i.levels[p.key] = Math.max(i.levels[p.key], p.target);
        if (p.key === "stadium")
          i.gameCapacity = Math.round(i.gameCapacity * 1.12);
        p.status = "completed";
        p.closedAt = D.at(s).getTime();
        i.history.unshift({ ...p });
        completed.push(p);
      }
    i.history = i.history.slice(0, 60);
    return completed;
  }
  const recoveryLevel = (t) =>
    t.infrastructure?.levels.medical
      ? (t.facility || 1) * 0.6 + level(t, "medical") * 0.4
      : t.facility || 1;
  const injuryFactor = (t) => 1 - (level(t, "medical") - 1) * 0.05;
  const commercialFactor = (t) => 1 + (level(t, "commercial") - 1) * 0.05;
  function validate(t) {
    const i = t.infrastructure;
    if (!i) return;
    const fail = () => {
        throw Error("Estrutura do clube inválida.");
      },
      num = (n, a, b) => {
        if (!Number.isFinite(n) || n < a || n > b) fail();
      };
    if (
      i.version !== 1 ||
      !i.venue ||
      typeof i.venue.name !== "string" ||
      i.venue.name.length > 250
    )
      fail();
    num(i.gameCapacity, 1000, 250000);
    num(i.initialCapacity, 1000, 150000);
    if (i.venue.capacity !== null) num(i.venue.capacity, 1000, 150000);
    if (typeof i.trainingName !== "string" || i.trainingName.length > 200)
      fail();
    for (const k of ["academy", "medical", "scouting", "commercial"]) {
      num(i.levels?.[k], 1, 5);
      if (!Number.isInteger(i.levels[k])) fail();
    }
    if (
      !Array.isArray(i.projects) ||
      i.projects.length > 300 ||
      !Array.isArray(i.history) ||
      i.history.length > 60
    )
      fail();
    const active = new Set();
    for (const p of i.projects) {
      if (
        !Object.hasOwn(definitions, p.key) ||
        !["building", "completed", "cancelled"].includes(p.status) ||
        typeof p.id !== "string"
      )
        fail();
      num(p.cost, 0, 1e12);
      num(p.target, 2, 5);
      num(p.days, 1, 1000);
      num(p.startAt, 0, 1e14);
      num(p.dueAt, p.startAt + 1, 1e14);
      if (p.status === "building") {
        if (active.has(p.key)) fail();
        active.add(p.key);
      }
    }
  }
  const api = {
    DATA,
    definitions,
    profile,
    ensure,
    level,
    quote,
    start,
    progress,
    refund,
    cancel,
    tick,
    recoveryLevel,
    injuryFactor,
    commercialFactor,
    validate,
  };
  root.LegacyFacilities = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
