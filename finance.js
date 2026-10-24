"use strict";
(function (root) {
  const fail = (m) => {
    throw Error(m);
  };
  const round = (n) => Math.round(n);
  const payroll = (t) => t.players.reduce((n, p) => n + p.salary, 0);
  // Valores de planejamento da simulação em BRL, não saldos bancários divulgados pelos clubes.
  const plans = {
    "Real Madrid": [700e6, 5.5e9],
    "Manchester City": [850e6, 5e9],
    Barcelona: [180e6, 4.5e9],
    "Paris Saint-Germain": [700e6, 4.6e9],
    Liverpool: [600e6, 4.4e9],
    Arsenal: [650e6, 4.2e9],
    "Manchester United": [450e6, 4.4e9],
    Chelsea: [600e6, 3.2e9],
    "Bayern de Munique": [650e6, 4.5e9],
    "Inter de Milão": [220e6, 2.5e9],
    Milan: [250e6, 2.4e9],
    Juventus: [300e6, 2.5e9],
    Flamengo: [250e6, 1.5e9],
    Palmeiras: [300e6, 1.3e9],
    Botafogo: [200e6, 950e6],
    Corinthians: [55e6, 950e6],
    Santos: [65e6, 550e6],
    "São Paulo": [65e6, 700e6],
    Fluminense: [95e6, 700e6],
    Cruzeiro: [140e6, 650e6],
    "Atlético Mineiro": [70e6, 650e6],
    "River Plate": [130e6, 650e6],
    "Boca Juniors": [90e6, 520e6],
    "Al-Hilal": [1100e6, 3e9],
    "Al-Nassr": [900e6, 3e9],
    "Al-Ittihad": [850e6, 2.8e9],
  };
  function profile(t) {
    const value = t.players.reduce((n, p) => n + p.price, 0),
      wage = payroll(t),
      preset = plans[t.name];
    const target =
      preset?.[0] ||
      Math.max(1500000, value * (t.leagueId === "br" ? 0.09 : 0.055));
    const revenue =
      preset?.[1] || Math.max(5e6, wage * 52 * 1.65 + value * 0.12);
    return {
      transfer: round(target),
      weeklyWage: round(wage * 1.18),
      revenue: round(revenue),
      cash: round(target + wage * 13),
    };
  }
  function init(t, s, preserve = false) {
    if (t.finance) return t.finance;
    const p = profile(t);
    if (!preserve || !Number.isFinite(t.money)) t.money = p.cash;
    const i = Number(t.id.split("-")[1]);
    t.finance = {
      openingBalance: t.money,
      transferBudget: preserve
        ? Math.max(0, Math.min(p.transfer, t.money * 0.6))
        : p.transfer,
      wageBudget: p.weeklyWage,
      annualRevenue: p.revenue,
      ledger: [],
      sequence: 0,
      sponsors: [
        {
          id: "baseline",
          slot: "master",
          name: ["Atlas Telecom", "Horizonte Energia", "Vértice Financeira"][
            i % 3
          ],
          annual: round(p.revenue * 0.13),
          winBonus: 0,
          expires: s.season,
          years: 1,
        },
      ],
    };
    return t.finance;
  }
  function post(t, s, amount, category, description) {
    if (!Number.isFinite(amount)) fail("Lançamento financeiro inválido.");
    const f = init(t, s, true),
      v = round(amount);
    t.money += v;
    f.ledger.push({
      id: ++f.sequence,
      season: s.season,
      offset: s.today ?? 0,
      category,
      amount: v,
      description,
      balance: t.money,
    });
    return v;
  }
  function summaries(t, season) {
    const rows = t.finance.ledger.filter(
      (r) => season === undefined || r.season === season,
    );
    const income = rows.reduce((n, r) => n + Math.max(0, r.amount), 0),
      expenses = rows.reduce((n, r) => n + Math.max(0, -r.amount), 0);
    return {
      income,
      expenses,
      net: income - expenses,
      payroll: payroll(t),
      wageRoom: t.finance.wageBudget - payroll(t),
      transfer: t.finance.transferBudget,
    };
  }
  function daily(t, s) {
    const f = init(t, s, true),
      day = (s.today ?? 0) + 1;
    if (day % 7 === 0)
      post(
        t,
        s,
        -payroll(t),
        "wages",
        "Folha salarial semanal do elenco profissional",
      );
    if (day % 30 === 0) {
      for (const c of f.sponsors)
        if (c.expires >= s.season)
          post(
            t,
            s,
            c.annual / 12,
            "sponsors",
            `Parcela mensal · ${c.name} (${c.slot})`,
          );
      post(
        t,
        s,
        (f.annualRevenue * 0.36) / 12,
        "broadcast",
        "Parcela de direitos de transmissão e receitas comerciais",
      );
      post(
        t,
        s,
        (-f.annualRevenue * 0.22) / 12,
        "operations",
        "Custos administrativos e operação do clube",
      );
    }
  }
  function gate(t, s) {
    const homeGames = Math.max(12, t.players.length ? 19 : 1);
    return post(
      t,
      s,
      ((t.finance.annualRevenue * 0.16) / homeGames) *
        (1 + (t.stadium - 1) * 0.12),
      "matchday",
      "Bilheteria e receitas de jogo em casa",
    );
  }
  function winBonus(t, s) {
    for (const c of t.finance.sponsors)
      if (c.expires >= s.season && c.winBonus)
        post(t, s, c.winBonus, "sponsors", `Bônus por vitória · ${c.name}`);
  }
  function canHire(t, p, fee, salary, s) {
    const f = init(t, s, true),
      bonus = salary * 4;
    if (fee > f.transferBudget)
      fail(
        "Orçamento de transferências insuficiente. Realocar verbas no Financeiro pode liberar espaço.",
      );
    if (payroll(t) + salary > f.wageBudget)
      fail(
        "Limite da folha salarial excedido. Ajuste o orçamento de salários no Financeiro.",
      );
    if (t.money < fee + bonus)
      fail("Caixa insuficiente para a transferência e as luvas.");
  }
  function allocate(t, s, percent) {
    if (!Number.isFinite(percent) || percent < 0 || percent > 100)
      fail("Escolha uma alocação de 0 a 100%.");
    const f = init(t, s, true),
      current = payroll(t),
      pool = f.transferBudget + Math.max(0, f.wageBudget - current) * 52;
    const transfer = round((pool * percent) / 100);
    return setBudgets(
      t,
      s,
      transfer,
      current + Math.floor((pool - transfer) / 52),
    );
  }
  function budgetCapacity(t) {
    const committed = payroll(t),
      f = t.finance;
    const allocated =
      f.transferBudget + Math.max(0, f.wageBudget - committed) * 52;
    return {
      committed,
      allocated,
      reserve: committed * 13,
      free: freeCash(t),
      maximum: allocated + freeCash(t),
    };
  }
  function setBudgets(t, s, transfer, wage) {
    const f = init(t, s, true),
      capacity = budgetCapacity(t);
    if (
      !Number.isSafeInteger(transfer) ||
      transfer < 0 ||
      !Number.isSafeInteger(wage) ||
      wage < capacity.committed
    )
      fail(
        "Informe valores inteiros em reais. O teto salarial precisa cobrir a folha já contratada.",
      );
    const requested = transfer + (wage - capacity.committed) * 52;
    if (requested > capacity.maximum)
      fail(
        "A distribuição ultrapassa os recursos disponíveis. Reduza os valores de transferência ou salários.",
      );
    const before = { transfer: f.transferBudget, wage: f.wageBudget };
    f.transferBudget = transfer;
    f.wageBudget = wage;
    if (!f.budgetHistory) f.budgetHistory = [];
    f.budgetHistory.push({
      season: s.season,
      offset: s.today || 0,
      before,
      after: { transfer, wage },
      funding: Math.max(0, requested - capacity.allocated),
      released: Math.max(0, capacity.allocated - requested),
    });
    post(
      t,
      s,
      0,
      "budget",
      `Realocação: transferências R$ ${f.transferBudget.toLocaleString("pt-BR")}; teto semanal de salários R$ ${f.wageBudget.toLocaleString("pt-BR")}`,
    );
    return { before, after: { transfer, wage } };
  }
  function freeCash(t) {
    const f = t.finance;
    return Math.max(
      0,
      Math.floor(
        t.money -
          f.transferBudget -
          Math.max(0, f.wageBudget - payroll(t)) * 52 -
          payroll(t) * 13,
      ),
    );
  }
  function fundBudget(t, s, amount) {
    if (!Number.isInteger(amount) || amount < 1 || amount > freeCash(t))
      fail("Valor acima do caixa livre após as reservas.");
    return setBudgets(
      t,
      s,
      t.finance.transferBudget + amount,
      Math.max(t.finance.wageBudget, payroll(t)),
    );
  }

  function offers(t, s) {
    const annual = t.finance.annualRevenue;
    return [
      {
        id: "atlas-master",
        slot: "master",
        name: "Atlas Telecom",
        annual: round(annual * 0.15),
        winBonus: 0,
        years: 2,
      },
      {
        id: "vertice-kit",
        slot: "kit",
        name: "Vértice Financeira",
        annual: round(annual * 0.035),
        winBonus: round(annual * 0.00015),
        years: 2,
      },
      {
        id: "horizonte-regional",
        slot: "regional",
        name: "Horizonte Energia",
        annual: round(annual * 0.025),
        winBonus: 0,
        years: 1,
      },
    ];
  }
  function sign(t, s, id) {
    const offer = offers(t, s).find((o) => o.id === id);
    if (!offer) fail("Proposta indisponível.");
    const f = t.finance,
      old = f.sponsors.find((c) => c.slot === offer.slot);
    if (old?.id === id && old.expires >= s.season)
      fail("Este contrato já está ativo.");
    const termination =
      old && old.expires >= s.season ? round(old.annual / 12) : 0;
    if (t.money < termination)
      fail("Caixa insuficiente para a rescisão do contrato atual.");
    if (termination)
      post(
        t,
        s,
        -termination,
        "sponsors",
        `Rescisão do patrocínio · ${old.name}`,
      );
    const c = { ...offer, expires: s.season + offer.years - 1 };
    f.sponsors = f.sponsors.filter((c) => c.slot !== offer.slot);
    f.sponsors.push(c);
    post(
      t,
      s,
      0,
      "sponsors",
      `Contrato assinado · ${c.name}, R$ ${c.annual.toLocaleString("pt-BR")}/ano, até ${c.expires}`,
    );
    return c;
  }
  const api = {
    setBudgets,
    budgetCapacity,
    freeCash,
    fundBudget,
    plans,
    payroll,
    profile,
    init,
    post,
    summaries,
    daily,
    gate,
    winBonus,
    canHire,
    allocate,
    offers,
    sign,
  };
  root.LegacyFinance = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
