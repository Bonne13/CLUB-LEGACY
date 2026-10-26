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
    return (s.scouting ??= {
      sequence: 0,
      revision: 0,
      missions: [],
      reports: [],
    });
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
        Math.max(p.salary,p.marketSalary||p.salary) *
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
    const affordable = askingFee <= feeRoom && salary <= wageRoom;
    const average =
      club.players.reduce((n, p) => n + p.ovr, 0) /
      Math.max(1, club.players.length);
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
      p.ovr >= average + 2
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
        const score =
          (scope === "youth"
            ? p.potential * 0.65 + p.ovr * 0.35
            : p.ovr * 0.85 + p.potential * 0.15) -
          Math.log10(Math.max(10000, cost)) * 1.5 +
          (academy ? 2 : 0);
        return {
          playerId: p.id,
          clubId: t?.id || null,
          academy,
          score: Math.round(score * 10) / 10,
          affordable,
        };
      })
      .filter((x) => x.affordable)
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
      maxAge = Number(options.maxAge || 21);
    if (
      !Number.isFinite(maxFee) ||
      maxFee < 0 ||
      maxFee > 1e13 ||
      !Number.isInteger(maxAge) ||
      maxAge < 15 ||
      maxAge > 23
    )
      throw Error("Revise o orçamento e a idade da missão.");
    if (
      options.position &&
      !["all", "LAT", "ATA", ...Object.keys(T.positionNames)].includes(
        options.position,
      )
    )
      throw Error("Posição de observação inválida.");
    const cost = scope === "market" ? 10000 : 5000;
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
      status: "pending",
      season: s.season,
      started: s.today,
      due: s.today + (scope === "market" ? 3 : 5),
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
        options: { position: m.position, maxFee: m.maxFee, maxAge: m.maxAge },
        players: recommend(s, m),
      };
      data.reports.unshift(report);
      data.reports = data.reports.slice(0, 12);
      data.revision++;
      ready.push(report);
    }
    return ready;
  }
  const api = { ensure, advice, recommend, start, process };
  root.LegacyScouting = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
