"use strict";
(function (root) {
  const groups = [
    {
      id: "overview",
      page: "Visão geral",
      label: "Visão geral",
      category: "DIA A DIA",
      description: "Seu próximo jogo, notícias e situação do clube.",
      sections: [
        { key: "overview", page: "Visão geral", label: "Visão geral" },
      ],
    },
    {
      id: "news",
      page: "Jornal",
      label: "Jornal",
      category: "DIA A DIA",
      description: "Notícias do clube, da liga e do mundo.",
      sections: [{ key: "news", page: "Jornal", label: "Jornal" }],
    },
    {
      id: "calendar",
      page: "Calendário",
      label: "Calendário",
      category: "DIA A DIA",
      description: "Datas, amistosos e preparação da temporada.",
      sections: [{ key: "calendar", page: "Calendário", label: "Calendário" }],
    },
    {
      id: "squad",
      page: "Elenco",
      label: "Elenco",
      category: "FUTEBOL",
      description: "Escalação, jogadores, treinamento, base e disciplina.",
      sections: [
        {
          key: "tactics",
          page: "Elenco",
          label: "Escalação",
          squadTab: "tactics",
        },
        {
          key: "players",
          page: "Elenco",
          label: "Jogadores",
          squadTab: "players",
        },
        { key: "training", page: "Treinamento", label: "Treinamento" },
        { key: "youth", page: "Categorias de base", label: "Base" },
        { key: "discipline", page: "Disciplina", label: "Disciplina" },
      ],
    },
    {
      id: "market",
      page: "Transferências",
      label: "Transferências",
      category: "FUTEBOL",
      description: "Contratações, negociações e olheiros.",
      sections: [
        { key: "transfers", page: "Transferências", label: "Mercado" },
        { key: "scouting", page: "Olheiros", label: "Olheiros" },
      ],
    },
    {
      id: "competitions",
      page: "Competições",
      label: "Competições",
      category: "FUTEBOL",
      description: "Campeonatos, classificações, prêmios e estatísticas.",
      sections: [
        { key: "competitions", page: "Competições", label: "Campeonatos" },
        { key: "awards", page: "Prêmios", label: "Prêmios e estatísticas" },
      ],
    },
    {
      id: "career",
      page: "Carreira",
      label: "Carreira",
      category: "GESTÃO",
      description: "Seu treinador, troféus, seleções e salvamentos.",
      sections: [
        { key: "coach", page: "Carreira", label: "Treinador" },
        { key: "trophies", page: "Troféus", label: "Troféus" },
        { key: "national", page: "Seleções", label: "Seleções" },
        { key: "saves", page: "Salvamentos", label: "Salvamentos" },
      ],
    },
    {
      id: "club",
      page: "Clube",
      label: "Clube",
      category: "GESTÃO",
      description: "Estrutura, finanças, orçamentos e patrocínios.",
      sections: [
        { key: "facilities", page: "Clube", label: "Estrutura" },
        {
          key: "finance",
          page: "Financeiro",
          label: "Financeiro e patrocínios",
        },
      ],
    },
  ];
  const normalize = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const groupFor = (page) =>
    groups.find((g) => g.sections.some((s) => s.page === page)) || null;
  const sectionFor = (page, squadTab = "tactics") =>
    groupFor(page)?.sections.find(
      (s) => s.page === page && (!s.squadTab || s.squadTab === squadTab),
    ) || null;
  function search(query = "") {
    const term = normalize(query);
    return groups.flatMap((g) =>
      term
        ? g.sections
            .filter((s) =>
              normalize(
                [g.label, g.description, s.label, s.page].join(" "),
              ).includes(term),
            )
            .map((s) => ({ group: g, section: s }))
        : [{ group: g, section: g.sections[0] }],
    );
  }
  const tabId = (g, s) =>
    s.page === "Elenco"
      ? "squad-tab-" + s.squadTab
      : "section-tab-" + g.id + "-" + s.key;
  const panelId = (g, s) =>
    s.page === "Elenco"
      ? "squad-panel-" + s.squadTab
      : "section-panel-" + g.id + "-" + s.key;
  const api = { groups, groupFor, sectionFor, search, tabId, panelId };
  root.LegacyNavigation = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
