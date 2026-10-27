"use strict";
(function (root) {
  const L =
    typeof module !== "undefined"
      ? require("./leadership.js")
      : root.LegacyLeadership;
  const DS =
    typeof module !== "undefined"
      ? require("./discipline.js")
      : root.LegacyDiscipline;
  const usable = (t, p) =>
    DS.available(p, t.selectionCompetition || t.leagueId);
  const slot = (id, label, pos, x, y) => ({ id, label, pos, x, y });
  const back4 = [
    slot("gk", "GOL", "GOL", 50, 91),
    slot("rb", "LD", "LAT", 85, 73),
    slot("rcb", "ZD", "ZAG", 63, 77),
    slot("lcb", "ZE", "ZAG", 37, 77),
    slot("lb", "LE", "LAT", 15, 73),
  ];
  const front3 = [
    slot("rw", "PD", "ATA", 85, 20),
    slot("st", "CA", "ATA", 50, 13),
    slot("lw", "PE", "ATA", 15, 20),
  ];
  const formations = {
    "4-3-3": [
      ...back4,
      slot("dm", "VOL", "VOL", 50, 58),
      slot("rcm", "MC-D", "MEI", 66, 40),
      slot("lcm", "MC-E", "MEI", 34, 40),
      ...front3,
    ],
    "4-2-3-1": [
      ...back4,
      slot("rdm", "VOL-D", "VOL", 65, 57),
      slot("ldm", "VOL-E", "VOL", 35, 57),
      slot("am", "MEI", "MEI", 50, 34),
      ...front3,
    ],
    "4-4-2": [
      ...back4,
      slot("rm", "MD", "MEI", 88, 41),
      slot("rcm", "MC-D", "MEI", 64, 48),
      slot("lcm", "MC-E", "MEI", 36, 48),
      slot("lm", "ME", "MEI", 12, 41),
      slot("rst", "CA-D", "ATA", 65, 17),
      slot("lst", "CA-E", "ATA", 35, 17),
    ],
    "3-5-2": [
      slot("gk", "GOL", "GOL", 50, 91),
      slot("rcb", "ZD", "ZAG", 77, 74),
      slot("cb", "ZC", "ZAG", 50, 78),
      slot("lcb", "ZE", "ZAG", 23, 74),
      slot("rwb", "AD", "LAT", 90, 43),
      slot("rdm", "VOL-D", "VOL", 65, 58),
      slot("ldm", "VOL-E", "VOL", 35, 58),
      slot("am", "MEI", "MEI", 50, 36),
      slot("lwb", "AE", "LAT", 10, 43),
      slot("rst", "CA-D", "ATA", 65, 17),
      slot("lst", "CA-E", "ATA", 35, 17),
    ],
    "5-3-2": [
      slot("gk", "GOL", "GOL", 50, 91),
      slot("rcb", "ZD", "ZAG", 73, 77),
      slot("cb", "ZC", "ZAG", 50, 79),
      slot("lcb", "ZE", "ZAG", 27, 77),
      slot("rwb", "AD", "LAT", 91, 61),
      slot("dm", "VOL", "VOL", 50, 58),
      slot("rcm", "MC-D", "MEI", 68, 39),
      slot("lcm", "MC-E", "MEI", 32, 39),
      slot("lwb", "AE", "LAT", 9, 61),
      slot("rst", "CA-D", "ATA", 65, 17),
      slot("lst", "CA-E", "ATA", 35, 17),
    ],
    "4-1-4-1": [
      ...back4,
      slot("dm", "VOL", "VOL", 50, 60),
      slot("rm", "MD", "MEI", 87, 36),
      slot("rcm", "MC-D", "MEI", 63, 43),
      slot("lcm", "MC-E", "MEI", 37, 43),
      slot("lm", "ME", "MEI", 13, 36),
      slot("st", "CA", "ATA", 50, 15),
    ],
  };
  const instructions = {
    mentality: ["Defensivo", "Equilibrado", "Ofensivo"],
    style: ["Equilibrado", "Posse de bola", "Contra-ataque", "Jogo direto"],
    pressing: ["Baixa", "Média", "Alta"],
    tempo: ["Lento", "Normal", "Rápido"],
    width: ["Estreita", "Normal", "Aberta"],
    line: ["Baixa", "Média", "Alta"],
  };
  const duties = ["Defender", "Apoiar", "Atacar"];
  const assignments = {
    captain: "Capitão",
    viceCaptain: "Vice-capitão",
    cornersLeft: "Escanteios pela esquerda",
    cornersRight: "Escanteios pela direita",
    freeKicks: "Faltas diretas",
    penalties: "Pênaltis",
  };
  function roleOptions(s) {
    return s.pos === "GOL"
      ? ["Goleiro", "Goleiro-líbero"]
      : s.pos === "LAT"
        ? ["Lateral", "Ala"]
        : s.pos === "ZAG"
          ? ["Zagueiro", "Defensor com bola"]
          : s.pos === "VOL"
            ? ["Volante", "Primeiro volante", "Construtor recuado"]
            : s.pos === "MEI"
              ? ["Meia central", "Armador", "Meia de chegada"]
              : [
                  "Atacante",
                  "Ponta",
                  "Atacante interior",
                  "Centroavante",
                  "Falso 9",
                ];
  }
  function ensure(t) {
    if (!t.tactics)
      t.tactics = {
        formation: "4-3-3",
        mentality: "Equilibrado",
        style: "Equilibrado",
        pressing: "Média",
        tempo: "Normal",
        width: "Normal",
        line: "Média",
        roles: {},
        assignments: {},
        bench: [],
      };
    return t.tactics;
  }
  const slotCache = new WeakMap();
  function slots(t) {
    const formation = t.tactics?.formation || "4-3-3",
      template = formations[formation] || formations["4-3-3"],
      roleKey = template
        .filter((s) => ["st", "rst", "lst"].includes(s.id))
        .map((s) => t.tactics?.roles?.[s.id]?.role || "Atacante")
        .join("|"),
      saved = slotCache.get(t);
    if (saved?.formation === formation && saved.roleKey === roleKey)
      return saved.slots;
    const result = template.map((s) =>
      ["st", "rst", "lst"].includes(s.id) &&
      t.tactics?.roles?.[s.id]?.role !== "Centroavante"
        ? { ...s, label: s.label.replace("CA", "ATA"), target: "ATA" }
        : s,
    );
    slotCache.set(t, { formation, roleKey, slots: result });
    return result;
  }
  const positionNames = {
    GOL: "Goleiro",
    LD: "Lateral direito",
    LE: "Lateral esquerdo",
    ZAG: "Zagueiro",
    AD: "Ala direito",
    AE: "Ala esquerdo",
    VOL: "Volante",
    MC: "Meia central",
    MEI: "Meia ofensivo",
    MD: "Meia pela direita",
    ME: "Meia pela esquerda",
    PD: "Ponta direita",
    PE: "Ponta esquerda",
    CA: "Centroavante",
    SA: "Segundo atacante",
    ATA: "Atacante",
  };
  const targetPosition = (s) =>
    s.target ||
    {
      gk: "GOL",
      rb: "LD",
      lb: "LE",
      rcb: "ZAG",
      lcb: "ZAG",
      cb: "ZAG",
      rwb: "AD",
      lwb: "AE",
      dm: "VOL",
      rdm: "VOL",
      ldm: "VOL",
      rcm: "MC",
      lcm: "MC",
      am: "MEI",
      rm: "MD",
      lm: "ME",
      rw: "PD",
      lw: "PE",
      st: "CA",
      rst: "CA",
      lst: "CA",
    }[s.id] ||
    null;
  const positionGroups = {
    GOL: "GOL",
    LD: "LAT",
    LE: "LAT",
    AD: "LAT",
    AE: "LAT",
    ZAG: "ZAG",
    VOL: "VOL",
    MC: "MEI",
    MEI: "MEI",
    MD: "MEI",
    ME: "MEI",
    PD: "ATA",
    PE: "ATA",
    CA: "ATA",
    SA: "ATA",
  };
  const positionGroup = (code) => positionGroups[code];
  const equivalentPositions = {
    PD: "MD",
    MD: "PD",
    PE: "ME",
    ME: "PE",
    LD: "AD",
    AD: "LD",
    LE: "AE",
    AE: "LE",
  };
  function positionMatches(p, code) {
    const known = [
      ...(p.naturalPositions || []),
      ...(p.secondaryPositions || []),
    ];
    return known.length
      ? known.some(
          (position) =>
            position === code ||
            equivalentPositions[position] === code ||
            positionGroup(position) === code ||
            positionGroup(equivalentPositions[position]) === code ||
            (code === "ATA" && position === "MEI"),
        )
      : p.pos === code;
  }
  function generalFit(p, s) {
    if (p.pos === s.pos) return 1;
    if (p.pos === "GOL" || s.pos === "GOL") return 0.25;
    return (
      {
        LAT: { ZAG: 0.8, VOL: 0.75, MEI: 0.83, ATA: 0.7 },
        ZAG: { LAT: 0.75, VOL: 0.85, MEI: 0.65, ATA: 0.55 },
        VOL: { ZAG: 0.83, LAT: 0.7, MEI: 0.9, ATA: 0.6 },
        MEI: { LAT: 0.7, ZAG: 0.6, VOL: 0.88, ATA: 0.85 },
        ATA: { MEI: 0.82, VOL: 0.6, LAT: 0.55, ZAG: 0.5 },
      }[p.pos]?.[s.pos] || 0.65
    );
  }
  const related = {
    LD: { LE: 0.65, AD: 0.9, MD: 0.8, ZAG: 0.72 },
    LE: { LD: 0.65, AE: 0.9, ME: 0.8, ZAG: 0.72 },
    AD: { LD: 0.9, AE: 0.65, MD: 0.86, PD: 0.76 },
    AE: { LE: 0.9, AD: 0.65, ME: 0.86, PE: 0.76 },
    ZAG: { VOL: 0.78, LD: 0.65, LE: 0.65 },
    VOL: { MC: 0.9, ZAG: 0.78, MEI: 0.72 },
    MC: { VOL: 0.86, MEI: 0.86, MD: 0.78, ME: 0.78 },
    MEI: { MC: 0.86, SA: 0.86, PE: 0.74, PD: 0.74 },
    MD: { PD: 0.88, ME: 0.7, MC: 0.82, AD: 0.76 },
    ME: { PE: 0.88, MD: 0.7, MC: 0.82, AE: 0.76 },
    PD: { PE: 0.68, MD: 0.88, CA: 0.78, SA: 0.84, MEI: 0.76 },
    PE: { PD: 0.68, ME: 0.88, CA: 0.78, SA: 0.84, MEI: 0.76 },
    CA: { SA: 0.9, PE: 0.72, PD: 0.72, MEI: 0.65 },
    SA: { CA: 0.92, MEI: 0.9, PE: 0.75, PD: 0.75 },
  };
  function fit(p, s) {
    const target = targetPosition(s),
      natural = p.naturalPositions || [],
      secondary = p.secondaryPositions || [];
    if (!target) return generalFit(p, s);
    if (target === "ATA") {
      if (positionMatches(p, "ATA")) return 1;
      const primary = positionGroup(natural[0] || secondary[0]) || p.pos;
      return generalFit({ ...p, pos: primary }, s);
    }
    if (natural.includes(target) || secondary.includes(target)) return 1;
    const equivalent = equivalentPositions[target];
    if (
      equivalent &&
      (natural.includes(equivalent) || secondary.includes(equivalent))
    )
      return 1;
    if (!natural.length) return generalFit(p, s);
    if (natural.includes("GOL") || target === "GOL") return 0.25;
    return Math.max(
      ...natural.map(
        (code) => related[code]?.[target] || Math.min(0.78, generalFit(p, s)),
      ),
    );
  }
  function adaptation(p, s) {
    const factor = fit(p, s),
      target = targetPosition(s);
    return {
      factor,
      effective: Math.round(p.ovr * factor),
      penalty: Math.round((1 - factor) * 100),
      label: p.naturalPositions?.includes(target)
        ? "Natural"
        : p.secondaryPositions?.includes(target) ||
            (equivalentPositions[target] &&
              (p.naturalPositions?.includes(equivalentPositions[target]) ||
                p.secondaryPositions?.includes(equivalentPositions[target])))
          ? "Habitual"
          : factor === 1
            ? target === "ATA" &&
              (p.naturalPositions?.length || p.secondaryPositions?.length)
              ? "Habitual"
              : "Posição geral"
            : factor >= 0.85
              ? "Adaptado"
              : "Fora da posição",
      natural: p.naturalPositions?.length
        ? p.naturalPositions.join(" / ")
        : p.pos + " · lado não informado",
    };
  }
  function positions(t) {
    const available = t.players.filter((p) => usable(t, p)),
      chosen = Array(11).fill(null),
      reserved = new Set();
    slots(t).forEach((s, i) => {
      const p = available.find((p) => p.id === t.lineup[i]);
      if (p && !reserved.has(p.id)) {
        chosen[i] = p;
        reserved.add(p.id);
      }
    });
    slots(t).forEach((s, i) => {
      if (chosen[i]) return;
      let p = null,
        best = -Infinity;
      for (const candidate of available) {
        if (reserved.has(candidate.id)) continue;
        const score =
          candidate.ovr *
          candidate.fitness *
          (1 - (candidate.fatigue || 0) * 0.002) *
          fit(candidate, s);
        if (score > best) {
          best = score;
          p = candidate;
        }
      }
      if (p) {
        chosen[i] = p;
        reserved.add(p.id);
      }
    });
    return chosen;
  }
  function select(t, index, id) {
    if (!Number.isInteger(index) || index < 0 || index > 10)
      throw Error("Posição inválida.");
    if (id && !t.players.some((p) => p.id === id && usable(t, p)))
      throw Error("Jogador suspenso, indisponível ou lesionado.");
    const current = positions(t).map((p) => p?.id || ""),
      other = current.indexOf(id);
    if (id && other !== index && other >= 0) current[other] = current[index];
    current[index] = id;
    t.lineup = current;
    const plan = ensure(t);
    plan.bench = plan.bench.filter((pid) => !current.includes(pid));
  }
  function formation(t, id) {
    if (!formations[id]) throw Error("Formação inválida.");
    const previous = slots(t),
      players = positions(t),
      map = new Map(previous.map((s, i) => [s.id, players[i]?.id || ""]));
    ensure(t).formation = id;
    t.lineup = formations[id].map((s) => map.get(s.id) || "");
    t.lineup = positions(t).map((p) => p?.id || "");
    ensure(t).bench = ensure(t).bench.filter((pid) => !t.lineup.includes(pid));
  }
  function update(t, key, value) {
    if (!instructions[key]?.includes(value))
      throw Error("Instrução tática inválida.");
    ensure(t)[key] = value;
  }
  function setRole(t, index, role, duty) {
    const s = slots(t)[index];
    if (!s || !roleOptions(s).includes(role) || !duties.includes(duty))
      throw Error("Função ou tarefa inválida.");
    ensure(t).roles[s.id] = { role, duty };
  }
  function role(t, index) {
    const s = slots(t)[index],
      r = t.tactics?.roles?.[s.id];
    return r && roleOptions(s).includes(r.role)
      ? r
      : {
          role: roleOptions(s)[0],
          duty: ["GOL", "ZAG", "VOL"].includes(s.pos)
            ? "Defender"
            : s.pos === "ATA"
              ? "Atacar"
              : "Apoiar",
        };
  }
  function skills(p) {
    const seed = [...p.id].reduce(
        (n, c) => (n * 31 + c.charCodeAt(0)) >>> 0,
        17,
      ),
      clamp = (n) => Math.max(25, Math.min(96, Math.round(n)));
    const result = {
      leadership: clamp(
        Math.max(
          L.reference(p)?.leadership || 0,
          p.ovr * 0.55 +
            Math.min(37, p.ageUnknown ? 24 : p.age) * 0.85 +
            (seed % 13) -
            5,
        ),
      ),
      crossing: clamp(
        p.ovr +
          (["LAT", "MEI"].includes(p.pos) ? 3 : p.pos === "GOL" ? -30 : -8) +
          (seed % 9) -
          4,
      ),
      freeKicks: clamp(
        p.ovr + (["MEI", "ATA"].includes(p.pos) ? 0 : -15) + (seed % 15) - 7,
      ),
      penalties: clamp(
        p.ovr +
          (p.pos === "ATA" ? 4 : p.pos === "GOL" ? -25 : -5) +
          (seed % 11) -
          5,
      ),
    };
    const b = p.trainingBonuses || {};
    result.crossing = clamp(
      result.crossing + (b.technical || 0) + (b.balanced || 0) * 0.5,
    );
    result.leadership = clamp(result.leadership + (b.leadership || 0));
    result.penalties = clamp(result.penalties + (b.setpieces || 0));
    result.freeKicks = clamp(result.freeKicks + (b.setpieces || 0));
    result.finishingBonus = b.finishing || 0;
    return result;
  }
  function setAssignment(t, key, id) {
    if (
      !Object.hasOwn(assignments, key) ||
      (id && !t.players.some((p) => p.id === id))
    )
      throw Error("Responsável inválido.");
    const a = ensure(t).assignments;
    if (
      id &&
      ((key === "captain" && a.viceCaptain === id) ||
        (key === "viceCaptain" && a.captain === id))
    )
      throw Error("Capitão e vice-capitão devem ser diferentes.");
    a[key] = id;
  }
  function specialists(t, eleven = positions(t).filter(Boolean)) {
    const a = t.tactics?.assignments || {},
      result = {},
      choose = (key, skill, exclude = null) =>
        eleven.find((p) => p.id === a[key] && p.id !== exclude) ||
        [...eleven]
          .filter((p) => p.id !== exclude)
          .sort((x, y) => skills(y)[skill] - skills(x)[skill])[0] ||
        null;
    const hierarchy = L.hierarchy(t)
      .map((c) => eleven.find((p) => p.id === c.id))
      .filter(Boolean);
    const available = (id) => eleven.find((p) => p.id === id);
    const leaders = [...eleven].sort(
      (x, y) => skills(y).leadership - skills(x).leadership,
    );
    result.captain =
      available(a.captain) ||
      available(a.viceCaptain) ||
      hierarchy[0] ||
      leaders[0] ||
      null;
    result.viceCaptain =
      [available(a.viceCaptain), ...hierarchy, ...leaders].find(
        (p) => p && p.id !== result.captain?.id,
      ) || null;
    for (const [key, skill] of [
      ["cornersLeft", "crossing"],
      ["cornersRight", "crossing"],
      ["freeKicks", "freeKicks"],
      ["penalties", "penalties"],
    ])
      result[key] = choose(key, skill);
    return result;
  }
  function bench(t) {
    const starters = new Set(
        positions(t)
          .filter(Boolean)
          .map((p) => p.id),
      ),
      available = t.players.filter((p) => usable(t, p) && !starters.has(p.id));
    const preferred = (t.tactics?.bench || [])
      .map((id) => available.find((p) => p.id === id))
      .filter(Boolean);
    return [
      ...preferred,
      ...available
        .filter((p) => !preferred.includes(p))
        .sort((a, b) => b.ovr - a.ovr),
    ].slice(0, 9);
  }
  function toggleBench(t, id) {
    if (!t.players.some((p) => p.id === id && usable(t, p)))
      throw Error("Jogador indisponível.");
    if (positions(t).some((p) => p?.id === id))
      throw Error("Este jogador está entre os titulares.");
    const plan = ensure(t);
    plan.bench = plan.bench.filter(
      (pid) =>
        t.players.some((p) => p.id === pid && usable(t, p)) &&
        !positions(t).some((p) => p?.id === pid),
    );
    if (plan.bench.includes(id))
      plan.bench = plan.bench.filter((p) => p !== id);
    else {
      if (plan.bench.length >= 9)
        throw Error("Escolha até nove reservas prioritários.");
      plan.bench.push(id);
    }
  }
  function ratings(t) {
    const ps = positions(t),
      plan = ensure(t);
    let total = 0,
      attack = 0,
      defense = 0;
    ps.forEach((p, i) => {
      if (!p) return;
      total +=
        p.ovr *
        (0.65 + (0.35 * p.fitness) / 100) *
        (1 - (p.fatigue || 0) * 0.001) *
        fit(p, slots(t)[i]);
      const d = role(t, i).duty;
      attack += d === "Atacar" ? 1 : d === "Defender" ? -0.45 : 0;
      defense += d === "Defender" ? 1 : d === "Atacar" ? -0.5 : 0;
      const r = role(t, i).role;
      if (
        ["Armador", "Falso 9", "Construtor recuado"].includes(r) &&
        plan.style === "Posse de bola"
      )
        attack += 0.3;
      if (r === "Ala" && plan.width === "Aberta") attack += 0.3;
    });
    const trainedAttack =
        ps.reduce(
          (n, p) =>
            n +
            ((p?.trainingBonuses?.technical || 0) +
              (p?.trainingBonuses?.balanced || 0) * 0.5),
          0,
        ) / 11,
      trainedDefense =
        ps.reduce(
          (n, p) =>
            n +
            ((p?.trainingBonuses?.defending || 0) +
              (p?.trainingBonuses?.balanced || 0) * 0.5),
          0,
        ) / 11;
    return {
      strength: total / 11,
      attack: attack * 0.003 + trainedAttack * 0.001,
      defense: defense * 0.002 + trainedDefense * 0.001,
      fatigue:
        (plan.pressing === "Alta" ? 3 : plan.pressing === "Baixa" ? -1 : 0) +
        (plan.tempo === "Rápido" ? 2 : plan.tempo === "Lento" ? -1 : 0),
    };
  }
  function validate(t) {
    const p = t.tactics;
    if (!p) return true;
    if (
      !formations[p.formation] ||
      !p.roles ||
      !p.assignments ||
      !Array.isArray(p.bench) ||
      p.bench.length > 9 ||
      new Set(p.bench).size !== p.bench.length
    )
      throw Error("Plano tático inválido.");
    for (const key of Object.keys(instructions))
      if (!instructions[key].includes(p[key]))
        throw Error("Instrução tática inválida.");
    for (const key of Object.keys(p.assignments))
      if (
        !Object.hasOwn(assignments, key) ||
        typeof p.assignments[key] !== "string"
      )
        throw Error("Bola parada inválida.");
    for (const [id, r] of Object.entries(p.roles))
      if (
        typeof id !== "string" ||
        !r ||
        typeof r.role !== "string" ||
        !duties.includes(r.duty)
      )
        throw Error("Função inválida.");
    if (p.bench.some((id) => typeof id !== "string"))
      throw Error("Banco inválido.");
    return true;
  }
  const api = {
    formations,
    instructions,
    duties,
    assignments,
    leadership: L,
    roleOptions,
    ensure,
    slots,
    fit,
    adaptation,
    positionNames,
    targetPosition,
    positionMatches,
    positions,
    select,
    formation,
    update,
    setRole,
    role,
    skills,
    setAssignment,
    specialists,
    bench,
    toggleBench,
    ratings,
    validate,
  };
  root.LegacyTactics = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
