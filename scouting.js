"use strict";
(function (root) {
  const F =
    typeof module !== "undefined"
      ? require("./finance.js")
      : root.LegacyFinance;
  const T =
    typeof module !== "undefined"
      ? require("./tactics.js")
      : root.LegacyTactics;
  const own = (s) => s.teams.find((t) => t.id === s.clubId);
  function ensure(s) {
    const data = (s.scouting ??= {
      sequence: 0,
      revision: 0,
      missions: [],
      reports: [],
    });
    data.shortlist ??= [];
    return data;
  }
  function advice(s, p, seller = null) {
    const club = own(s),
      f = club.finance;
    const baseFee = seller
      ? Math.round(p.price * (p.contract <= s.season + 1 ? 0.8 : 1))
      : 0;
    const askingFee = seller
      ? Math.ceil(
          baseFee *
            (seller.players.filter((x) => x.ovr > p.ovr).length < 3
              ? 1.15
              : 1.05),
        )
      : 0;
    const minimumOpening = seller ? Math.ceil(askingFee * 0.85) : 0;
    const salary = Math.min(
      30000000,
      Math.ceil(
        Math.max(p.salary, p.marketSalary || p.salary) *
          (seller ? 1.15 : 1.05) *
          1.05 *
          Math.max(
            1,
            Math.min(1.25, 1 + (p.ovr - 50 - s.reputation * 0.4) * 0.005),
          ),
      ),
    );
    const bonus = salary * 4,
      feeRoom = Math.max(0, Math.min(f.transferBudget, club.money - bonus));
    const wageRoom = Math.max(0, f.wageBudget - F.payroll(club));
    const affordable =
      askingFee <= feeRoom &&
      salary <= wageRoom &&
      club.money >= askingFee + bonus;
    const average =
      club.players.reduce((n, p) => n + p.ovr, 0) /
      Math.max(1, club.players.length);
    const peers = club.players
      .filter((x) => T.positionMatches(x, p.naturalPositions?.[0] || p.pos))
      .sort((a, b) => b.ovr - a.ovr);
    const reference = peers.length
      ? peers.slice(0, 3).reduce((n, x) => n + x.ovr, 0) /
        Math.min(3, peers.length)
      : average;
    const concerns = [];
    if (seller && seller.players.length <= 16)
      concerns.push("Clube de origem com elenco reduzido: pode não liberar.");
    if (p.ageUnknown) concerns.push("Idade não confirmada.");
    else if (p.age >= 32)
      concerns.push("Pouco retorno de revenda; priorize contrato curto.");
    if ((p.fatigue || 0) > 55)
      concerns.push("Desgaste acumulado alto: vale observar sua recuperação.");
    if (p.injury) concerns.push(`Lesionado por ${p.injury} dia(s).`);
    if (p.ratingEstimated)
      concerns.push("Overall estimado; observe antes de decidir.");
    if (!affordable)
      concerns.push("O pacote recomendado excede uma das verbas atuais.");
    const level =
      p.ovr >= reference
        ? "Reforço para o time titular"
        : p.potential >= average + 5 && p.age < 24
          ? "Aposta de desenvolvimento"
          : "Opção de elenco";
    return {
      baseFee,
      askingFee,
      minimumOpening,
      recommendedFee: Math.max(minimumOpening, Math.ceil(askingFee * 0.96)),
      salary,
      bonus,
      total: askingFee + bonus,
      annualWages: salary * 52,
      feeRoom,
      wageRoom,
      affordable,
      annualTotal: askingFee + bonus + salary * 52,
      reference: Math.round(reference),
      difference: Math.round(p.ovr - reference),
      strengths: [
        p.ovr >= reference
          ? "Pode disputar a titularidade nesta posição."
          : "Amplia as opções de rotação.",
        p.potential >= p.ovr + 5
          ? "Margem de evolução acima de cinco pontos."
          : "Perfil para rendimento imediato.",
        !seller
          ? "Sem pagamento de taxa a outro clube."
          : p.contract <= s.season + 1
            ? "Contrato próximo do fim pode ajudar na negociação."
            : "Contrato de origem exige negociação com o clube.",
      ],
      level,
      concerns,
      openingAdvice: seller
        ? "Uma abertura nessa faixa mantém espaço para negociar. O clube ainda pode recusar; ofertas abaixo de 65% do pedido podem irritar a diretoria."
        : "Atleta livre: concentre a negociação em salário, luvas e duração.",
    };
  }
  function recommend(s, options = {}) {
    const club = own(s),
      scope = options.scope || "market",
      budget = Math.min(
        club.finance.transferBudget,
        Number(options.maxFee ?? club.finance.transferBudget),
      );
    const candidates = s.teams
      .flatMap((t) => [
        ...(t.id === s.clubId && scope === "youth" ? t.youth : []).map((p) => ({
          p,
          t,
          academy: true,
        })),
        ...(t.id === s.clubId
          ? []
          : t.players.map((p) => ({ p, t, academy: false }))),
      ])
      .concat(
        scope === "market"
          ? s.freeAgents.map((p) => ({ p, t: null, academy: false }))
          : [],
      );
    const regions = new Map(s.leagues.map((l) => [l.id, l.region]));
    return candidates
      .filter(
        ({ p, t, academy }) =>
          !p.injury &&
          (academy || !t || t.players.length > 16) &&
          (!options.position ||
            options.position === "all" ||
            T.positionMatches(p, options.position)) &&
          (!options.nationality ||
            options.nationality === "all" ||
            (p.nationalities || []).includes(options.nationality)) &&
          (!options.league ||
            options.league === "all" ||
            (options.league === "free"
              ? !t
              : t?.leagueId === options.league)) &&
          (!options.region ||
            options.region === "all" ||
            regions.get(t?.leagueId) === options.region) &&
          p.ovr >= Number(options.minOverall || 0) &&
          (p.ageUnknown
            ? Boolean(options.includeUnknown) && scope !== "youth"
            : p.age >= Number(options.minAge || 15) &&
              p.age <=
                Number(options.maxAge || (scope === "youth" ? 21 : 45))) &&
          (scope !== "youth" ||
            (!p.ageUnknown &&
              p.age >= 15 &&
              p.age <= Number(options.maxAge || 21))),
      )
      .map(({ p, t, academy }) => {
        const a = advice(s, p, academy ? null : t),
          cost = academy ? 100000 : a.askingFee;
        const affordable = academy
          ? club.money >= 100000 && Math.max(p.salary, 3000) <= a.wageRoom
          : a.affordable && a.askingFee <= budget;
        if (
          options.maxSalary !== undefined &&
          a.salary > Number(options.maxSalary)
        )
          return null;
        if (options.profile === "starter" && p.ovr < a.reference - 1)
          return null;
        const score =
          (scope === "youth" || options.profile === "potential"
            ? p.potential * 0.65 + p.ovr * 0.35
            : p.ovr * 0.85 + p.potential * 0.15) -
          Math.log10(Math.max(10000, cost)) * 1.5 +
          (academy ? 2 : 0) +
          (options.profile === "value"
            ? Math.max(0, 8 - Math.log10(Math.max(1, cost)))
            : 0);
        return {
          playerId: p.id,
          clubId: t?.id || null,
          academy,
          score: Math.round(score * 10) / 10,
          affordable,
          confidence: Math.min(
            99,
            Math.max(
              45,
              (options.depth === "deep"
                ? 93
                : options.depth === "quick"
                  ? 68
                  : 81) +
                ((club.infrastructure?.levels.scouting || 1) - 1) * 2 -
                (p.ratingEstimated ? 12 : 0) -
                (p.ageUnknown ? 8 : 0),
            ),
          ),
          reason: a.strengths[0],
          observedFee: cost,
          observedSalary: a.salary,
        };
      })
      .filter((x) => x?.affordable)
      .sort((a, b) => b.score - a.score || a.playerId.localeCompare(b.playerId))
      .slice(0, 10);
  }
  function start(s, options = {}) {
    if (!s.clubId) throw Error("Comece uma carreira primeiro.");
    if (s.live && !s.live.done)
      throw Error("Conclua a partida antes de enviar o olheiro.");
    const scope = options.scope || "market",
      data = ensure(s);
    if (!["market", "youth"].includes(scope))
      throw Error("Tipo de observação inválido.");
    if (data.missions.some((m) => m.status === "pending" && m.scope === scope))
      throw Error("Esse departamento já está em observação.");
    const maxFee = Number(options.maxFee ?? own(s).finance.transferBudget),
      maxAge = Number(options.maxAge || (scope === "youth" ? 21 : 45)),
      minAge = Number(options.minAge || 15),
      minOverall = Number(options.minOverall || 0),
      maxSalary = Number(
        options.maxSalary ?? Math.min(30000000, own(s).finance.wageBudget),
      ),
      profile = options.profile || "balanced",
      depth = options.depth || "standard";
    if (
      !Number.isFinite(maxFee) ||
      maxFee < 0 ||
      maxFee > 1e13 ||
      !Number.isInteger(maxAge) ||
      maxAge < 15 ||
      maxAge > (scope === "youth" ? 23 : 45) ||
      !Number.isInteger(minAge) ||
      minAge < 15 ||
      minAge > maxAge ||
      !Number.isInteger(minOverall) ||
      minOverall < 0 ||
      minOverall > 99 ||
      !Number.isFinite(maxSalary) ||
      maxSalary < 0 ||
      maxSalary > 30000000 ||
      !["balanced", "starter", "potential", "value"].includes(profile) ||
      !["quick", "standard", "deep"].includes(depth) ||
      (options.region &&
        !["all", "eu", "sa", "na", "as"].includes(options.region)) ||
      (options.league &&
        !["all", "free", ...s.leagues.map((l) => l.id)].includes(
          options.league,
        ))
    )
      throw Error("Revise o orçamento e a idade da missão.");
    if (
      options.position &&
      !["all", "LAT", "ATA", ...Object.keys(T.positionNames)].includes(
        options.position,
      )
    )
      throw Error("Posição de observação inválida.");
    const multiplier = depth === "quick" ? 0.6 : depth === "deep" ? 2 : 1;
    const cost = Math.round((scope === "market" ? 10000 : 5000) * multiplier);
    if (own(s).money < cost)
      throw Error("Caixa insuficiente para a observação.");
    F.post(
      own(s),
      s,
      -cost,
      "scouting",
      scope === "market"
        ? "Missão de olheiro · mercado"
        : "Missão de olheiro · base",
    );
    const m = {
      id: "scout-" + ++data.sequence,
      clubId: s.clubId,
      scope,
      position: options.position || "all",
      maxFee,
      maxAge,
      minAge,
      minOverall,
      maxSalary,
      profile,
      depth,
      region: options.region || "all",
      league: options.league || "all",
      nationality: options.nationality || "all",
      includeUnknown: Boolean(options.includeUnknown),
      status: "pending",
      season: s.season,
      started: s.today,
      due:
        s.today +
        (depth === "quick"
          ? 2
          : depth === "deep"
            ? 7
            : scope === "market"
              ? 3
              : 5) -
        Math.min(
          1,
          Math.floor(((own(s).infrastructure?.levels.scouting || 1) - 1) / 2),
        ),
    };
    data.missions.unshift(m);
    data.missions = data.missions.slice(0, 30);
    return m;
  }
  function process(s) {
    const data = ensure(s),
      ready = [];
    for (const m of data.missions.filter((m) => m.status === "pending")) {
      if (m.clubId !== s.clubId || m.season !== s.season) {
        m.status = "cancelled";
        continue;
      }
      if (s.today < m.due) continue;
      m.status = "completed";
      const report = {
        id: m.id,
        clubId: m.clubId,
        scope: m.scope,
        season: s.season,
        offset: s.today,
        options: {
          position: m.position,
          maxFee: m.maxFee,
          maxAge: m.maxAge,
          profile: m.profile,
          depth: m.depth,
          region: m.region,
          league: m.league,
        },
        players: recommend(s, m),
      };
      data.reports.unshift(report);
      data.reports = data.reports.slice(0, 12);
      data.revision++;
      ready.push(report);
    }
    return ready;
  }
  function toggleShortlist(s, id) {
    const data = ensure(s);
    const index = data.shortlist.indexOf(id);
    if (index >= 0) {
      data.shortlist.splice(index, 1);
      return false;
    }
    if (
      !s.teams.some((t) =>
        [...t.players, ...t.youth].some((p) => p.id === id),
      ) &&
      !s.freeAgents.some((p) => p.id === id)
    )
      throw Error("Jogador indisponível.");
    if (data.shortlist.length >= 30)
      throw Error("A lista acompanha até 30 jogadores.");
    data.shortlist.push(id);
    return true;
  }
  const api = { ensure, advice, recommend, start, process, toggleShortlist };
  root.LegacyScouting = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
