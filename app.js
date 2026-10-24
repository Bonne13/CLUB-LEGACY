"use strict";
const A = LegacyAppearance;
const E = Legacy,
  T = E.tactics,
  KEY = "club-legacy-v2";
const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (v) =>
  "R$ " + Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
let state,
  loadError = false;
const encodeSave = (s) =>
  "CL3:" +
  LZString.compressToUTF16(typeof s === "string" ? s : JSON.stringify(s));
const decodeSave = (raw) =>
  JSON.parse(
    raw.startsWith("CL3:") ? LZString.decompressFromUTF16(raw.slice(4)) : raw,
  );
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const previous = decodeSave(raw);
    if (
      ![2, 3].includes(previous.version) ||
      !Array.isArray(previous.teams) ||
      !Array.isArray(previous.leagues)
    )
      throw Error("Formato de carreira inválido.");
    if (previous.version === 2) {
      const backup = encodeSave(previous);
      localStorage.setItem(KEY, backup);
      localStorage.setItem("club-legacy-v2-backup", backup);
      state = E.upgradeSave(previous);
      localStorage.setItem(KEY, encodeSave(state));
    } else state = previous;
  } else {
    const old = localStorage.getItem("club-legacy-v1");
    if (old) localStorage.setItem("club-legacy-v1-backup", old);
    state = old ? E.migrate(JSON.parse(old)) : E.fresh();
    if (old) localStorage.setItem(KEY, encodeSave(state));
  }
  E.prepareCareer(state);
} catch (e) {
  state = E.fresh();
  loadError = true;
}
let simulateAmount = state.advancePreference?.amount || 1,
  simulateUnit = state.advancePreference?.unit || "days",
  ledgerCategory = "all",
  ledgerDirection = "all",
  ledgerPage = 0;
let theme = "dark";
try {
  const preference = localStorage.getItem("club-legacy-theme");
  if (["light", "dark"].includes(preference)) theme = preference;
} catch {}
let setupLeague = "br",
  setupClub = "br-0",
  setupMode = "normal",
  setupProfile = { name: "", age: 35, nationality: "Brazil" },
  newsScope = "club",
  newsCategory = "all";
function applyAppearance() {
  const club = team(state.clubId || setupClub),
    colors = A.clubColors(club);
  const background = theme === "dark" ? "#142139" : "#ffffff";
  document.documentElement.dataset.theme = theme;
  document.body.dataset.club = club?.id || "";
  const vars = {
    "--club-primary": colors.primary,
    "--club-secondary": colors.secondary,
    "--club-on-primary": A.readable(colors.primary),
    "--accent": A.accent(colors.primary, colors.secondary, background),
  };
  for (const [key, value] of Object.entries(vars))
    document.documentElement.style.setProperty(key, value);
  const control = $("#theme-toggle");
  control.textContent = theme === "dark" ? "Modo claro" : "Modo escuro";
  control.setAttribute(
    "aria-label",
    theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro",
  );
}
function toggleTheme() {
  theme = theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("club-legacy-theme", theme);
  } catch {
    notify(
      "O tema mudou, mas a preferência não pôde ser salva neste navegador.",
    );
  }
  render();
}
let squadTab = "tactics";
let tacticalScope = "club",
  tacticalSlot = 0,
  squadQuery = "",
  squadPosition = "all";
let calendarView = "career",
  referenceLeague = "",
  referenceClub = "all";
let page = state.rosterRecovery ? "Carreira" : "Visão geral",
  competition = "",
  marketLeague = "all",
  marketPosition = "all",
  marketQuery = "",
  marketExtra = {
    nationality: "all",
    overallMin: "",
    overallMax: "",
    ageMin: "",
    ageMax: "",
    priceMax: "",
    sort: "reference",
  },
  marketPage = 0,
  matchMode = state.live?.mode || "text",
  timer = null,
  speed = 120,
  paused = false;
const pages = [
  "Visão geral",
  "Jornal",
  "Elenco",
  "Treinamento",
  "Transferências",
  "Categorias de base",
  "Competições",
  "Calendário",
  "Carreira",
  "Clube",
  "Financeiro",
  "Seleções",
  "Salvamentos",
  "Dia de jogo",
];
const team = (id = state.clubId) => E.team(state, id),
  name = (id) => team(id)?.name || "A definir";
const options = (values, selected) =>
  values
    .map(
      (v) =>
        `<option value="${esc(v[0])}" ${v[0] === selected ? "selected" : ""}>${esc(v[1])}</option>`,
    )
    .join("");
const btn = (label, action, id = "", cls = "") =>
  `<button class="${cls}" data-action="${action}" data-id="${esc(id)}">${label}</button>`;
function notify(message, error = false) {
  const n = $("#notification");
  n.textContent = message;
  n.className = error ? "notice error" : "notice";
  n.hidden = false;
}
function persist() {
  if (!state.clubId && !loadError) return true;
  if (loadError) {
    notify(
      "A carreira anterior não pôde ser lida. O salvamento está protegido para evitar sobrescrevê-la.",
      true,
    );
    return false;
  }
  try {
    localStorage.setItem(KEY, encodeSave(state));
    return true;
  } catch (e) {
    notify(
      "Não foi possível salvar. Exporte a carreira e verifique o espaço do navegador.",
      true,
    );
    return false;
  }
}
function act(fn) {
  try {
    $("#notification").hidden = true;
    fn();
    persist();
    render();
  } catch (e) {
    notify(e.message, true);
  }
}
function render() {
  const hasCareer = Boolean(state.clubId);
  $("#sidebar").hidden = !hasCareer;
  $("#game").hidden = !hasCareer;
  $("#career-entry").hidden = hasCareer;
  document.body.classList.toggle("entry-mode", !hasCareer);
  applyAppearance();
  if (!hasCareer) {
    $("#nav").innerHTML = "";
    $("#content").innerHTML = "";
    $("#time-controls").innerHTML = "";
    $("#career-entry").innerHTML = setup();
    return;
  }
  $("#career-entry").innerHTML = "";
  const icons = [
    "◈",
    "▤",
    "♟",
    "◎",
    "⇄",
    "◇",
    "♜",
    "▦",
    "↗",
    "⌂",
    "$",
    "⚑",
    "▣",
    "▶",
  ];
  const match = E.currentMatch(state),
    showMatch = match.available;
  $("#match-day").hidden = !showMatch;
  if (page === "Dia de jogo" && !showMatch && !state.live?.done)
    page = "Visão geral";
  $("#time-controls").hidden = page !== "Visão geral" || match.active;
  $("#time-controls").innerHTML = page === "Visão geral" ? timeControls() : "";
  $("#nav").innerHTML = pages
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p !== "Dia de jogo")
    .map(
      ({ p, i }) =>
        `<button class="${page === p ? "active" : ""}" data-page="${p}" ${page === p ? 'aria-current="page"' : ""}><span aria-hidden="true">${icons[i]}</span> ${p}</button>`,
    )
    .join("");
  $("#sidebar-club")?.remove();
  const identity = document.createElement("div");
  identity.id = "sidebar-club";
  identity.className = "sidebar-club";
  identity.innerHTML = `<span class="club-roundel" aria-hidden="true">${esc(initials(team().name))}</span><div><strong>${esc(team().name)}</strong><small>${esc(E.league(state, team().leagueId).country)}</small></div>`;
  $("#nav").before(identity);
  $("#title").textContent = page;
  $("#content").innerHTML = views[page]();
  $("#context").textContent =
    `${team().name} · ${E.date(state)}${state.mode === "test" ? " · MODO TESTE" : ""}`;
  if (page === "Financeiro") updateBudgetPreview();
  if (page === "Dia de jogo" && state.live) draw();
}
function initials(name) {
  return name
    .split(/\s+/)
    .filter((w) => !["de", "da", "do", "e", "&"].includes(w.toLowerCase()))
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
function setup() {
  const chosen = team(setupClub),
    l = E.league(state, setupLeague),
    available = state.teams.filter((t) => t.players.length >= 11).length;
  const clubOptions = state.teams
    .filter((t) => t.leagueId === setupLeague)
    .map(
      (t) =>
        `<option value="${t.id}" ${t.id === setupClub ? "selected" : ""} ${t.players.length < 11 ? "disabled" : ""}>${esc(t.name)}${t.players.length < 11 ? " · elenco incompleto" : ""}</option>`,
    )
    .join("");
  const startButton = btn(
    "Começar carreira →",
    "begin",
    "",
    "primary start-career",
  ).replace(
    "<button ",
    `<button ${chosen.players.length < 11 ? "disabled" : ""} `,
  );
  return `<div class="entry-top"><a class="wordmark" href="#" aria-label="Club Legacy">CLUB<span>LEGACY</span></a><button data-action="toggle-theme" aria-label="${theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}">${theme === "dark" ? "☀ Modo claro" : "☾ Modo escuro"}</button></div><div class="entry-layout"><div class="entry-copy"><span class="badge">SUA HISTÓRIA COMEÇA AQUI</span><h1>Um clube. <br>Mil decisões. <br><em>O seu legado.</em></h1><p>Assuma o comando de um clube real, negocie com atletas reais e controle cada entrada e saída do caixa.</p><div class="entry-facts"><span><strong>${available}</strong> clubes com elenco disponível</span><span><strong>21</strong> ligas no mundo</span><span><strong>4</strong> copas continentais</span></div></div><section class="career-card" aria-label="Escolha seu clube"><div class="entry-step"><span>01 / INÍCIO DA JORNADA</span><span>Treinador & gestor</span></div><h2>Começar carreira</h2><p class="muted">Somente jogadores reais. Valores e caixa são referências e projeções.</p>${profileFields(setupProfile, "start")}<label for="start-game-mode">Modo de carreira</label><select id="start-game-mode">${options(
    [
      ["normal", "Carreira normal"],
      ["test", "Modo teste · adicionar dinheiro"],
    ],
    setupMode,
  )}</select><p class="muted">${setupMode === "test" ? "Você poderá adicionar dinheiro ao caixa e aos orçamentos no Financeiro." : "Administre as receitas, despesas e verbas do clube ao longo da carreira."}</p><label for="start-league">País e liga</label><select id="start-league">${options(
    state.leagues.map((l) => [l.id, l.country + " · " + l.name]),
    setupLeague,
  )}</select><label for="start-club">Seu primeiro clube</label><select id="start-club">${clubOptions}</select><div class="club-preview"><span class="club-roundel" aria-hidden="true">${esc(initials(chosen.name))}</span><div><strong>${esc(chosen.name)}</strong><span>${esc(l.name)}</span><small>Caixa inicial estimado · ${money(chosen.money)}</small><small>${chosen.players.length} profissionais reais confirmados</small></div></div>${rosterReferenceView(chosen)}${chosen.players.length < 11 ? '<p class="notice">A fonte ainda não tem onze atletas confirmados para este clube. Escolha outro clube ou liga.</p>' : ""}${startButton}<p class="entry-save-note">Sua carreira será salva neste navegador. Exporte um arquivo para guardar uma cópia.</p><button data-action="import-save">Importar carreira salva</button>${loadError ? '<button class="danger" data-action="delete-save">Excluir dados ilegíveis</button>' : ""}</section></div><div class="entry-bottom"><span>SEU CLUBE. SUA HISTÓRIA.</span><span>Dias e semanas · Texto ou 2D · Sem instalação</span></div>${dataNotice()}`;
}
function rosterReferenceView(t) {
  const ref = t.rosterReference || { source: "historical", date: null },
    d = ref.date ? ref.date.split("-").reverse().join("/") : null;
  const sources = E.ROSTERS.currentSources || {},
    source = sources[ref.source];
  const label =
    ref.source === "historical"
      ? "Referência histórica; sem atualização de elenco 2026 confirmada."
      : ref.kind === "last-known-transfers"
        ? "Vínculos por últimas transferências conhecidas, até " +
          d +
          ". Cobertura parcial."
        : ref.kind === "appearances"
          ? "Estatísticas europeias 2026/27 · " +
            d +
            ". Reservas sem minutos podem não constar."
          : "Elenco observado em " +
            d +
            ". Cobertura parcial das estatísticas disponíveis.";
  return `<p class="muted">${esc(label)}${source ? ` <a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">Ver fonte</a>` : ""}</p>`;
}
function marketFiltersView() {
  const nations = [
    ...new Set(
      [...state.teams.flatMap((t) => t.players), ...state.freeAgents]
        .flatMap((p) =>
          p.nationalities?.length ? p.nationalities : [p.nationality],
        )
        .filter(Boolean),
    ),
  ].sort((a, b) => countryLabel(a).localeCompare(countryLabel(b), "pt-BR"));
  const range = (key, label, min, max) =>
    `<fieldset><legend>${label}</legend><div class="market-range"><label>Mínimo<input id="market-${key}-min" type="number" step="1" min="${min}" max="${max}" value="${esc(marketExtra[key + "Min"])}" placeholder="Sem mínimo"></label><label>Máximo<input id="market-${key}-max" type="number" step="1" min="${min}" max="${max}" value="${esc(marketExtra[key + "Max"])}" placeholder="Sem máximo"></label></div></fieldset>`;
  return `<form id="search-form" class="market-filters"><label>Nome<input id="market-query" value="${esc(marketQuery)}" placeholder="Nome do jogador"></label><label>Liga<select id="market-league">${options([["all", "Todas as ligas"], ["free", "Sem clube"], ...state.leagues.map((l) => [l.id, l.name])], marketLeague)}</select></label><label>Posição<select id="market-position">${options(
    [
      ["all", "Todas"],
      ...["GOL", "LAT", "ZAG", "VOL", "MEI", "ATA"].map((p) => [p, p]),
      ...Object.entries(T.positionNames)
        .filter(([code]) => !["GOL", "ZAG", "VOL", "MEI"].includes(code))
        .map(([code, label]) => [code, code + " · " + label]),
    ],
    marketPosition,
  )}</select></label><label>Nacionalidade<select id="market-nationality">${options([["all", "Todas"], ["unknown", "Não informada"], ...nations.map((n) => [n, countryLabel(n)])], marketExtra.nationality)}</select></label>${range("overall", "Overall (geral)", 0, 100)}${range("age", "Idade", 0, 100)}<label>Valor máximo (R$)<input id="market-price-max" type="number" min="0" step="1" value="${esc(marketExtra.priceMax)}" placeholder="Sem limite"></label><label>Ordenar por<select id="market-sort">${options(
    [
      ["reference", "Ordem da base"],
      ["overall-desc", "Maior overall"],
      ["age-asc", "Mais jovens"],
      ["age-desc", "Mais experientes"],
      ["value-asc", "Menor valor"],
      ["value-desc", "Maior valor"],
      ["name", "Nome"],
    ],
    marketExtra.sort,
  )}</select></label><div class="row"><button class="primary">Buscar</button>${btn("Limpar filtros", "market-clear").replace("<button ", '<button type="button" ')}</div><p class="muted market-filter-note">Filtros de idade excluem atletas sem idade disponível. Nacionalidade considera também a dupla cidadania. Idades aproximadas permanecem identificadas.</p></form>`;
}
function readMarketFilters() {
  const form = $("#search-form");
  if (!form.reportValidity()) return false;
  const next = {
    nationality: $("#market-nationality").value,
    sort: $("#market-sort").value,
    overallMin: $("#market-overall-min").value,
    overallMax: $("#market-overall-max").value,
    ageMin: $("#market-age-min").value,
    ageMax: $("#market-age-max").value,
    priceMax: $("#market-price-max").value,
  };
  for (const key of ["overall", "age"])
    if (
      next[key + "Min"] !== "" &&
      next[key + "Max"] !== "" &&
      Number(next[key + "Min"]) > Number(next[key + "Max"])
    ) {
      notify("O mínimo não pode ser maior que o máximo.", true);
      return false;
    }
  marketLeague = $("#market-league").value;
  marketPosition = $("#market-position").value;
  marketQuery = $("#market-query").value.trim();
  marketExtra = next;
  marketPage = 0;
  return true;
}
function playerAge(p) {
  return p.ageUnknown
    ? "Não informada"
    : p.age + (p.ageEstimated ? " aprox." : "");
}
function playerReference(p) {
  if (p.membershipReference)
    return (
      "Vínculo " +
      p.membershipReference.split("-").reverse().join("/") +
      (p.membershipKind === "last-known-transfer"
        ? " · última transferência conhecida"
        : "") +
      " · valor " +
      (p.priceEstimated ? "estimado" : "de referência")
    );
  return p.dataSource?.startsWith("sofifa-")
    ? "Vínculo histórico · SoFIFA " +
        p.dataSource.slice(7) +
        " · valor estimado"
    : p.priceEstimated
      ? "Atleta real · valor estimado"
      : "Atleta real · referência de mercado";
}
function dataNotice() {
  const total = Object.values(E.ROSTERS.teams).reduce(
      (n, t) => n + t.players.length,
      0,
    ),
    available = Object.values(E.ROSTERS.teams).filter(
      (t) => t.players.length >= 11,
    ).length;
  return `<details class="notice"><summary>Base de dados e regras da carreira</summary><p>Novas carreiras usam snapshots do Brasileirão 2026 (02/06/2026), MLS 2026 (09/06/2026), estatísticas europeias 2026/27 e últimas transferências observadas em Chile, Uruguai, Paraguai e Peru, cortadas em 23/10/2026. A referência de cada clube aparece no elenco. Clubes sem fonte nova mantêm dados históricos, incluindo SoFIFA 2019/2021/2023. Não é uma atualização ao vivo nem cobertura completa de outubro de 2026.</p><p>O catálogo contém ${total.toLocaleString("pt-BR")} atletas reais e ${available} de 397 clubes com elenco disponível. Nascimentos ausentes são sinalizados; idades não disponíveis ficam identificadas. Algumas posições gerais e todos os atributos são estimados. Homônimos sem confirmação não são conciliados. Registros com dois clubes no mesmo snapshot, sem destino confirmado, não entram como vínculos atuais.</p><p>Valores, salários, caixa e receitas são estimativas de simulação. Dados de mercado anteriores continuam identificados por sua referência. A taxa é fixa em R$ 6,20 por euro. Patrocinadores são fictícios. As datas da carreira são simuladas; os calendários históricos podem ser consultados separadamente.</p>${state.clubId && state.rosterRevision !== E.ROSTERS.revision ? "<p>Sua carreira anterior foi preservada, com seus clubes, transferências e elencos próprios. Para usar a base nova desde o começo, crie uma nova carreira após exportar o save anterior.</p>" : ""}</details>`;
}

function timeControls() {
  const upcoming = E.upcomingFixture(state),
    todayMatch = E.nextFixture(state);
  if (!E.dayInfo(state))
    return `<div class="time-panel"><div><small>TEMPORADA ${state.season} ENCERRADA</small><strong>Planeje o próximo ano</strong></div><button data-page="Carreira">Propostas de trabalho</button>${btn("Iniciar temporada " + (state.season + 1), "next-season", "", "primary")}</div>`;
  return `<div class="time-panel"><div><small>CALENDÁRIO DA CARREIRA</small><strong>${esc(E.date(state))}</strong><p>${todayMatch ? "Hoje: " + matchup(todayMatch) : upcoming ? "Próximo jogo: " + E.formatDate(state, upcoming.offset) + " · " + matchup(upcoming) : "Sem partida confirmada."}</p></div><form id="simulation-form"><label>Avançar<input id="simulate-amount" type="number" min="1" max="52" value="${simulateAmount}" required></label><label>Período<select id="simulate-unit">${options(
    [
      ["days", "Dias"],
      ["weeks", "Semanas"],
    ],
    simulateUnit,
  )}</select></label><button class="primary">Simular período</button></form>${todayMatch ? '<button data-page="Dia de jogo">Jogar hoje →</button>' : ""}</div>`;
}
const metric = (title, value, subtitle) =>
  `<div class="card"><small>${title}</small><div class="metric">${value}</div><span class="muted">${subtitle}</span></div>`;
function standings(rows) {
  return `<div class="table-wrap"><table><thead><tr><th>#</th><th>CLUBE</th><th>PTS</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr></thead><tbody>${E.rank(
    rows,
  )
    .map(
      (t, i) =>
        `<tr class="${t.id === state.clubId ? "mine" : ""}"><td>${i + 1}</td><td>${esc(name(t.id))}</td><td><strong>${t.p}</strong></td><td>${t.w + t.d + t.l}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf - t.ga}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
function playersTable(ps, context = "squad") {
  return `<div class="table-wrap"><table><thead><tr><th>JOGADOR</th><th>POS.</th><th>IDADE</th><th>GERAL</th><th>VALOR</th><th>CONDIÇÃO</th><th>SALÁRIO EST./SEM.</th><th>CONTRATO</th><th>AÇÕES</th></tr></thead><tbody>${ps.map((p) => `<tr><td><strong>${esc(p.name)}</strong><span class="sub">${esc(playerReference(p))}<span class="sub">${esc((p.nationalities?.length ? p.nationalities : [p.nationality]).map(countryLabel).filter(Boolean).join(" / ") || "Nacionalidade indisponível")}</span>${context === "market" ? " · " + esc(p.sellerName) : ""}</span></td><td>${esc(p.naturalPositions?.length ? p.naturalPositions.join(" / ") : p.pos)}${p.secondaryPositions?.length ? `<small class="sub">Também: ${esc(p.secondaryPositions.join(" / "))}</small>` : ""}${p.positionEstimated ? " · est." : ""}</td><td>${playerAge(p)}</td><td><span class="rating">${p.ovr}</span></td><td>${money(p.price)}</td><td>${p.injury ? `Lesão · ${p.injury} dias` : p.fitness + "%"}</td><td>${money(p.salary)}</td><td>${p.contract}${p.contractEstimated ? " · est." : ""}</td><td>${context === "squad" ? btn("Renovar", "renew", p.id) + btn("Vender", "sell", p.id) : context === "youth" ? btn("Promover · R$ 100 mil", "promote", p.id) : btn("Negociar", "buy", p.id)}</td></tr>`).join("")}</tbody></table></div>${ps.length ? "" : '<p class="muted">Nenhum jogador encontrado.</p>'}`;
}
function matchup(f, goals) {
  return `${esc(name(f.pair[0]))} <strong>${goals ? goals.join(" × ") : "×"}</strong> ${esc(name(f.pair[1]))}`;
}
const views = {
  Jornal: () => newspaper(),
  "Visão geral": () => {
    const t = team(),
      d = E.dayInfo(state),
      next = E.nextFixture(state),
      pos =
        E.rank(E.league(state, t.leagueId).table).findIndex(
          (r) => r.id === t.id,
        ) + 1;
    return `<div class="hero"><span class="badge">TEMPORADA ${state.season} · ${esc(E.date(state))}</span><h2>${esc(t.name)}</h2><p>${next ? esc(next.name) + " · " + matchup(next) : d ? "Data sem partida do seu clube. Acompanhe os outros resultados." : "A temporada terminou. Confira os títulos e as propostas para sua carreira."}</p>${next || E.currentMatch(state).active ? '<button class="primary" data-page="Dia de jogo">Central da partida →</button>' : '<button data-page="Calendário">Ver calendário →</button>'}</div><div class="grid">${metric("CAIXA DO CLUBE", money(t.money), "Folha semanal estimada: " + money(t.players.reduce((a, p) => a + p.salary, 0)))}${metric("POSIÇÃO NA LIGA", pos + "º", esc(E.league(state, t.leagueId).name))}${metric("FORÇA DO TIME", Math.round(E.strength(t)), "Reputação do treinador: " + state.reputation)}</div><div class="columns"><div class="card"><div class="row"><h3>Notícias do clube e do mundo</h3><button data-page="Jornal">Abrir jornal →</button></div>${state.news
      .slice(0, 8)
      .map((n) => `<p>${esc(n)}</p>`)
      .join(
        "",
      )}</div><div class="card"><h3>Identidade de jogo</h3><label>Estratégia<select id="tactic">${options(
      ["Equilibrado", "Ofensivo", "Defensivo"].map((x) => [x, x]),
      state.tactic,
    )}</select></label><p class="muted">Ofensivo aumenta o ritmo e o risco para ambos os lados. Defensivo diminui as oportunidades.</p><h3>Último resultado</h3><p>${state.last ? matchup(state.last, state.last.goals) : "Sua história está começando."}</p></div></div>${negotiationOverview()}${dataNotice()}`;
  },
  Elenco: () => squadView(),
  Treinamento: () =>
    `<div class="hero"><span class="badge">CENTRO DE TREINAMENTO · NÍVEL ${team().facility}</span><h2>O trabalho de hoje. As vitórias de amanhã.</h2><p>A recuperação acontece diariamente e a evolução é aplicada semanalmente. Jogadores jovens evoluem mais; o potencial limita o crescimento. Treinos intensivos aceleram o desenvolvimento e reduzem a condição física.</p><label>Plano <select id="training">${options(
      ["Técnica", "Intensivo", "Recuperação"].map((x) => [x, x]),
      state.training,
    )}</select></label></div><div class="card"><h3>Departamento médico</h3>${
      team()
        .players.filter((p) => p.injury)
        .map((p) => `<p>${esc(p.name)} · retorna em ${p.injury} dias.</p>`)
        .join("") || '<p class="muted">Nenhum atleta lesionado.</p>'
    }</div>`,
  Transferências: () => {
    const all = E.marketPlayers(state, {
      league: marketLeague,
      position: marketPosition,
      query: marketQuery,
      ...marketExtra,
    });
    marketPage = Math.min(
      marketPage,
      Math.max(0, Math.ceil(all.length / 20) - 1),
    );
    return `${negotiationsView()}<div class="card"><div class="row"><h3>Mercado mundial</h3><span class="pill">Janela ${E.windowOpen(state) ? "aberta" : "fechada"}</span></div><p class="muted">Negocie o valor da transferência, salário e duração. A contratação inclui quatro salários semanais de luvas. Janelas: rodadas 1–6, 18–22 e entre temporadas (regras unificadas do jogo).</p>${marketFiltersView()}${playersTable(all.slice(marketPage * 20, marketPage * 20 + 20), "market")}<div class="row">${btn("← Anterior", "market-prev")}<span>${all.length} atletas · página ${marketPage + 1} / ${Math.max(1, Math.ceil(all.length / 20))}</span>${btn("Próxima →", "market-next")}</div></div><div class="card"><h3>Últimas transferências</h3>${
      state.transfers
        .slice(0, 12)
        .map(
          (t) =>
            `<p>${esc(t.player)} · ${esc(t.from)} → ${esc(t.to)} · ${money(t.fee)}</p>`,
        )
        .join("") || '<p class="muted">Nenhuma negociação concluída.</p>'
    }</div>`;
  },
  "Categorias de base": () =>
    `<div class="card"><h3>O futuro começa em casa</h3><p class="muted">A base contém apenas atletas reais confirmados. Não há geração de nomes por temporada. Promover custa R$ 100 mil e exige espaço no orçamento salarial; atletas que completam 20 anos sobem ao profissional.</p>${playersTable(team().youth, "youth")}</div>`,
  Competições: () => {
    const id = competition || team().leagueId,
      l = state.leagues.find((l) => l.id === id),
      c = state.cups.find((c) => c.id === id);
    return `<div class="card"><label>Acompanhar competição<select id="competition">${options([...state.leagues.map((l) => [l.id, l.name]), ...state.cups.map((c) => [c.id, c.name])], id)}</select></label>${
      l
        ? `<h3>${esc(l.name)} · ${state.season}</h3><p class="muted">${l.ids.length} clubes · ${l.single ? "Turno único" : "Turno e returno"} · ${l.fixtures.length} rodadas. Pontos, saldo e gols marcados.</p>${standings(l.table)}`
        : `<h3>${esc(c.name)}</h3><p class="muted">${c.entrants.length} clubes · ${c.region === "sa" ? "8 grupos de 4, seis jogos por clube. Os dois melhores de cada grupo avançam." : "Fase de liga com " + c.stageGames + " jogos por clube. Top 8 direto às oitavas; 9º a 24º disputam playoffs."} Mata-mata em jogo único.</p>${c.champion ? `<div class="hero"><span class="badge">CAMPEÃO</span><h2>${esc(name(c.champion))}</h2></div>` : ""}${c.region === "sa" ? c.groups.map((g, i) => `<h3>Grupo ${String.fromCharCode(65 + i)}</h3>${standings(c.table.filter((t) => g.includes(t.id)))}`).join("") : standings(c.table)}${c.rounds
            .map(
              (r) =>
                `<h3 class="spaced">${E.roundName(r.phase)}</h3>${r.pairs
                  .map((pair) => {
                    const result = r.results.find((x) => x.pair[0] === pair[0]);
                    return `<p>${matchup({ pair }, result?.goals)}${result?.penalties ? " · pênaltis " + result.penalties.join("–") : ""}</p>`;
                  })
                  .join("")}`,
            )
            .join("")}`
    }</div>${dataNotice()}`;
  },
  Calendário: () =>
    calendarView === "reference"
      ? referenceCalendar()
      : `<div class="card"><div class="row"><h3>Calendário da carreira · ${state.season}</h3>${btn("Consultar datas reais da base →", "reference-calendar")}</div><p class="muted">Datas simuladas, com rodadas nacionais aos sábados e continentais no meio da semana. Sorteios futuros de mata-mata dependem da classificação.</p>${E.calendar()
          .map((d, i) => {
            let fs;
            if (d.kind === "league") {
              const l = E.league(state, team().leagueId);
              fs = (l.fixtures[d.round] || [])
                .filter((p) => p.includes(state.clubId))
                .map((pair) => ({ pair, name: l.name }));
            } else
              fs = state.cups.flatMap((c) =>
                E.cupPairs(c, d.round)
                  .filter((p) => p.includes(state.clubId))
                  .map((pair) => ({ pair, name: c.name })),
              );
            return `<div class="calendar-row ${d.offset === state.today ? "current" : ""}"><span>${d.offset < state.today ? "✓" : d.offset === state.today ? "→" : "·"} ${E.date(state, i)}</span><div><strong>${d.kind === "league" ? "Rodada nacional " + (d.round + 1) : E.roundName(d.round)}</strong><p class="muted">${fs.map((f) => esc(f.name) + " · " + matchup(f)).join("<br>") || "Sem partida confirmada para seu clube"}</p></div></div>`;
          })
          .join("")}</div>`,
  Carreira: () =>
    `${profileView()}${careerModeView()}${state.rosterRecovery ? '<div class="notice">O elenco deste clube está incompleto na fonte real. Escolha uma das propostas abaixo para continuar em um clube com atletas confirmados. O salvamento anterior está preservado.</div>' : ""}${state.legacyArchive ? `<details class="notice"><summary>Arquivo da carreira anterior</summary><p>${esc(state.legacyArchive.club)} · ${state.legacyArchive.season} · rodada ${state.legacyArchive.week}</p><div class="table-wrap"><table><tr><th>CLUBE ORIGINAL</th><th>PTS</th><th>J</th><th>SG</th></tr>${state.legacyArchive.table.map((t) => `<tr><td>${esc(t.name)}</td><td>${t.p}</td><td>${t.w + t.d + t.l}</td><td>${t.gf - t.ga}</td></tr>`).join("")}</table></div></details>` : ""}<div class="hero"><span class="badge">SEU CAMINHO NO FUTEBOL</span><h2>${esc(team().name)}</h2><p>Reputação ${state.reputation} · Contrato de treinador até ${state.coaches.find((c) => c.id === "you")?.contract}. Ofertas de outros clubes chegam ao fim da temporada.</p></div><div class="card"><h3>Propostas para você</h3>${state.offers.map((o) => `<div class="row"><div><strong>${esc(name(o.clubId))}</strong><p class="muted">${esc(E.league(state, team(o.clubId).leagueId).country)} · ${o.years} temporadas · Caixa ${money(team(o.clubId).money)}</p></div>${btn("Aceitar proposta", "change-club", o.clubId)}</div>`).join("") || '<p class="muted">Nenhuma proposta disponível no momento.</p>'}<p class="muted">Ao mudar de clube, você assume o elenco e o caixa do destino. O patrimônio pertence ao clube.</p></div><div class="card"><h3>Movimentações de treinadores</h3>${
      state.coachMoves
        .slice(0, 20)
        .map(
          (m) =>
            `<p>${m.season} · ${esc(name(m.clubId))}: ${esc(m.from)} → ${esc(m.to)}</p>`,
        )
        .join("") ||
      '<p class="muted">Clubes avaliam seus treinadores ao fim da temporada.</p>'
    }</div>`,
  Seleções: () => nationalView(),
  Salvamentos: () => saveView(),
  Financeiro: () => financialView(),
  Clube: () =>
    `<div class="grid">${metric("CAIXA", money(team().money), "Fluxo completo na página Financeiro")}${metric("FOLHA SEMANAL", money(E.finance.payroll(team())), "Pagamento a cada sete dias")}${metric("ELENCO REAL", team().players.length, team().youth.length + " jovens confirmados")}</div><div class="columns">${["stadium", "facility"].map((k) => `<div class="card"><h3>${k === "stadium" ? "Estádio" : "Centro de treinamento"} · nível ${team()[k]} / 5</h3><p class="muted">${k === "stadium" ? "Aumenta a receita em casa." : "Melhora as chances de desenvolvimento dos atletas."}</p>${btn("Ampliar · " + money(team()[k] * 1500000), "upgrade", k)}</div>`).join("")}</div><div class="card"><h3>Administração do clube</h3><p>Controle os limites de salários e transferências, acompanhe o extrato e negocie patrocínios.</p><button data-page="Financeiro">Abrir Financeiro →</button></div>`,
  "Dia de jogo": () => {
    const m = state.live,
      d = E.dayInfo(state),
      f = m || E.nextFixture(state);
    if (!d && !m)
      return `<div class="hero"><span class="badge">FIM DA TEMPORADA ${state.season}</span><h2>Um capítulo para a história.</h2><p>Campeão nacional: ${esc(name(E.rank(E.league(state, team().leagueId).table)[0].id))}.</p>${state.cups.map((c) => `<p>${esc(c.name)} · ${esc(name(c.champion))}</p>`).join("")}<button data-page="Carreira">Ver propostas de trabalho</button> ${btn("Iniciar temporada " + (state.season + 1), "next-season", "", "primary")}</div>`;
    if (!f)
      return `<div class="hero"><span class="badge">${esc(E.date(state))}</span><h2>Dia de acompanhar o futebol.</h2><p>Seu clube não tem partida nesta data. Avance para simular os demais jogos.</p>${btn("Avançar calendário →", "advance", "", "primary")}</div><div class="card"><h3>Jogos da data</h3>${
        E.allFixtures(state)
          .slice(0, 16)
          .map((f) => `<p>${esc(f.name)} · ${matchup(f)}</p>`)
          .join("") || '<p class="muted">Data de descanso.</p>'
      }</div>`;
    return `<div class="card"><div class="row"><span class="badge" id="match-minute">${esc(f.name)} · ${m?.minute || 0}’</span><label class="inline">Acompanhar<select id="mode">${options(
      [
        ["text", "Texto e estatísticas"],
        ["2d", "Campo 2D"],
      ],
      m?.mode || matchMode,
    )}</select></label></div><div class="score">${matchup(f, m?.goals)}</div><div id="field"></div><div class="row"><span id="stats" class="muted"></span><div class="match-controls">${
      m?.done
        ? btn("Continuar carreira →", "continue", "", "primary")
        : m
          ? `${btn(paused ? "Retomar" : "Pausar", "pause")} ${btn("Concluir partida", "instant")}<select id="speed" aria-label="Velocidade da simulação">${options(
              [
                ["240", "1×"],
                ["120", "2×"],
                ["40", "6×"],
              ],
              String(speed),
            )}</select>`
          : btn("Iniciar partida", "play", "", "primary")
    }</div></div><div class="log" id="log" aria-live="off"></div>${f.referenceDate ? `<p class="muted">Data histórica de referência deste confronto: ${esc(f.referenceDate.split("-").reverse().join("/"))}. Na carreira, as ligas avançam por rodadas unificadas.</p>` : ""}${m?.plans ? `<details><summary>Escalações, capitães e cobradores desta partida</summary>${m.plans.map((p) => `<h4>${esc(p.name)} · ${esc(p.instructions.formation)}</h4><p>${p.starters.map((x) => esc(x.name)).join(" · ")}</p><p>Capitão: ${esc(p.specialists.captain?.name)} · Pênaltis: ${esc(p.specialists.penalties?.name)} · Faltas: ${esc(p.specialists.freeKicks?.name)} · Escanteios: ${esc(p.specialists.cornersLeft?.name)} / ${esc(p.specialists.cornersRight?.name)}</p>`).join("")}</details>` : ""}<p class="muted">O campo 2D ilustra os eventos da simulação. Você pode alternar a visualização durante o jogo.</p></div>`;
  },
};
const financeLabels = {
  all: "Todas as categorias",
  wages: "Salários",
  transfer: "Transferências",
  signing: "Luvas e contratos",
  sponsors: "Patrocínios",
  broadcast: "TV e receitas comerciais",
  matchday: "Bilheteria",
  prize: "Premiações",
  operations: "Operação do clube",
  facilities: "Estrutura",
  youth: "Base",
  budget: "Orçamentos",
  adjustment: "Ajustes de abertura",
  test: "Aportes do modo teste",
};
function careerModeView() {
  return `<div class="card"><h3>${state.mode === "test" ? "Modo teste" : "Carreira normal"}</h3><p>${state.mode === "test" ? "Você pode adicionar dinheiro no Financeiro. Aportes acumulados: " + money(state.testFundingTotal || 0) + "." : "A carreira usa os recursos e receitas do clube. Para experimentar contratações com aportes manuais, você pode ativar o modo teste."}</p>${state.mode === "test" ? '<button data-page="Financeiro">Abrir ferramentas de teste</button>' : btn("Ativar modo teste nesta carreira", "enable-test-mode")}</div>`;
}
function testFundsView() {
  return `<section class="card test-tools"><span class="badge">MODO TESTE</span><h3>Adicionar dinheiro ao clube</h3><form id="test-funds-form" class="filters"><label>Valor do aporte (R$)<input id="test-funds-amount" type="number" min="1" max="1000000000000" step="1" required value="100000000"></label><label>Destinar para<select id="test-funds-destination">${options(
    [
      ["transfer", "Caixa e transferências"],
      ["wages", "Caixa e teto salarial"],
      ["cash", "Somente caixa"],
    ],
    "transfer",
  )}</select></label><button class="primary">Adicionar dinheiro</button></form><p class="muted">Os aportes ficam registrados no extrato como teste. Total adicionado nesta carreira: ${money(state.testFundingTotal || 0)}. Para salários, cada R$ 52 acrescenta R$ 1 ao teto semanal.</p></section>`;
}
function financialView() {
  const t = team(),
    f = t.finance,
    summary = E.finance.summaries(t, state.season),
    pool = f.transferBudget + Math.max(0, f.wageBudget - summary.payroll) * 52;
  const share = pool ? Math.round((f.transferBudget / pool) * 100) : 100;
  const rows = [...f.ledger]
    .reverse()
    .filter(
      (r) =>
        (ledgerCategory === "all" || r.category === ledgerCategory) &&
        (ledgerDirection === "all" ||
          (ledgerDirection === "income" && r.amount > 0) ||
          (ledgerDirection === "expense" && r.amount < 0)),
    );
  ledgerPage = Math.min(
    ledgerPage,
    Math.max(0, Math.ceil(rows.length / 20) - 1),
  );
  return `<div class="hero"><span class="badge">ADMINISTRAÇÃO · ${esc(t.name)}</span><h2>O clube também se constrói nas contas.</h2><p>Caixa, limite para contratações e teto da folha são controles diferentes. Receitas e despesas são registradas na data em que acontecem.</p></div>
 ${state.mode === "test" ? testFundsView() : ""}
 <div class="grid">${metric("CAIXA DO CLUBE", money(t.money), "Saldo de abertura: " + money(f.openingBalance))}${metric("TRANSFERÊNCIAS", money(f.transferBudget), "Limite disponível para taxas de contratação")}${metric("TETO SALARIAL / SEMANA", money(f.wageBudget), "Folha comprometida: " + money(summary.payroll))}</div>
 <div class="grid">${metric("ENTRADAS NA TEMPORADA", money(summary.income), "Patrocínios, jogos, TV, premiações e vendas")}${metric("SAÍDAS NA TEMPORADA", money(summary.expenses), "Salários, contratos, compras e operação")}${metric("SALDO DO FLUXO", money(summary.net), "Entradas menos saídas; não é lucro contábil")}</div>
 ${budgetEditor()}
 <div class="card"><h3>Patrocínios do clube</h3><p class="muted">Marcas e propostas fictícias da carreira. Parcelas entram a cada 30 dias; bônus são pagos após vitórias. Trocar um contrato ativo custa uma parcela mensal de rescisão.</p><div class="sponsor-contracts">${f.sponsors.map((c) => `<div><strong>${esc(c.name)}</strong><p>${esc(c.slot)} · ${money(c.annual)}/ano · até ${c.expires}</p><span class="pill">${c.expires >= state.season ? "Ativo" : "Expirado"}</span></div>`).join("")}</div><div class="grid">${E.finance
   .offers(t, state)
   .map((o) => {
     const active = f.sponsors.some(
       (c) => c.id === o.id && c.expires >= state.season,
     );
     return `<div class="card"><small>${o.slot === "master" ? "PATROCÍNIO MASTER" : o.slot === "kit" ? "UNIFORME" : "PARCEIRO REGIONAL"}</small><h3 class="spaced">${esc(o.name)}</h3><p><strong>${money(o.annual)}/ano</strong><br>${money(Math.round(o.annual / 12))} por parcela<br>${o.years} temporada(s)${o.winBonus ? "<br>Bônus por vitória: " + money(o.winBonus) : ""}</p>${btn(active ? "Contrato ativo" : "Assinar contrato", "sign-sponsor", o.id, active ? "" : "primary").replace("<button ", `<button ${active ? "disabled" : ""} `)}</div>`;
   })
   .join("")}</div></div>
 <div class="card"><div class="row"><h3>Extrato financeiro</h3><span class="muted">${f.ledger.length} lançamentos desde esta atualização</span></div><div class="filters"><label>Categoria<select id="ledger-category">${options(Object.entries(financeLabels), ledgerCategory)}</select></label><label>Movimento<select id="ledger-direction">${options(
   [
     ["all", "Entradas e saídas"],
     ["income", "Somente entradas"],
     ["expense", "Somente saídas"],
   ],
   ledgerDirection,
 )}</select></label></div><div class="table-wrap"><table><thead><tr><th>DATA</th><th>CATEGORIA</th><th>DESCRIÇÃO</th><th>VALOR</th><th>SALDO APÓS</th></tr></thead><tbody>${rows
   .slice(ledgerPage * 20, ledgerPage * 20 + 20)
   .map(
     (r) =>
       `<tr><td>${esc(E.formatDate({ season: r.season }, r.offset))}</td><td>${financeLabels[r.category] || esc(r.category)}</td><td>${esc(r.description)}</td><td class="${r.amount > 0 ? "income" : r.amount < 0 ? "expense" : ""}">${money(r.amount)}</td><td>${money(r.balance)}</td></tr>`,
   )
   .join(
     "",
   )}</tbody></table></div>${rows.length ? "" : '<p class="muted">Nenhum lançamento neste filtro. Os movimentos aparecerão conforme a carreira avançar.</p>'}<div class="row">${btn("← Anterior", "ledger-prev")}<span>Página ${ledgerPage + 1} / ${Math.max(1, Math.ceil(rows.length / 20))}</span>${btn("Próxima →", "ledger-next")}</div><p class="muted">Folha paga a cada sete dias. Patrocínios, direitos comerciais e custos operacionais são liquidados a cada 30 dias. Valores são projeções de simulação, não balanços oficiais.</p></div>`;
}

function budgetEditor() {
  const t = team(),
    f = t.finance,
    c = E.finance.budgetCapacity(t),
    share = c.allocated
      ? Math.round((f.transferBudget / c.allocated) * 100)
      : 100;
  const changes = (f.budgetHistory || []).slice(-5).reverse();
  return `<section class="card budget-editor"><div class="row"><div><span class="badge">PLANEJAMENTO DO FUTEBOL</span><h3>Definir limites em reais</h3></div><span class="pill">Aplicação imediata ao confirmar</span></div><p>Edite quanto pode gastar em contratações e o teto da folha semanal. O espaço salarial adicional reserva 52 semanas; a folha atual tem uma reserva de segurança de 13 semanas.</p><div class="budget-summary"><div><small>Transferências atuais</small><strong id="current-transfer">${money(f.transferBudget)}</strong></div><div><small>Teto salarial atual / semana</small><strong id="current-wage">${money(f.wageBudget)}</strong></div><div><small>Folha já contratada / semana</small><strong>${money(c.committed)}</strong></div><div><small>Caixa livre para ampliar limites</small><strong>${money(c.free)}</strong></div></div><form id="budget-form"><div class="columns"><label for="budget-transfer">Novo limite de transferências (R$)<input id="budget-transfer" type="number" min="0" step="1" required value="${f.transferBudget}"></label><label for="budget-wage">Novo teto salarial por semana (R$)<input id="budget-wage" type="number" min="${c.committed}" step="1" required value="${Math.max(c.committed, f.wageBudget)}"></label></div><div id="budget-simulation" aria-live="polite"></div><details class="budget-slider"><summary>Redistribuir a verba atual com o controle deslizante</summary><label for="budget-share">Parcela para transferências <output id="budget-preview">${share}%</output></label><input id="budget-share" type="range" min="0" max="100" value="${share}"><p class="muted">← Mais espaço salarial · Mais verba para transferências →</p></details><div class="row"><button class="primary" id="apply-budget">Aplicar distribuição</button><button type="button" data-action="reset-budget">Restaurar valores atuais</button></div><p class="muted">Os cartões acima mostram os valores salvos. A prévia mostra o que será aplicado. Distribuir verba mantém o saldo bancário; os novos limites passam a valer nas negociações.</p></form><details><summary>Destinar um valor adicional do caixa livre</summary><form id="fund-budget-form" class="filters"><label>Valor para transferências (R$)<input id="fund-budget-amount" type="number" min="1" step="1" max="${c.free}" value="${c.free}"></label><button ${c.free < 1 ? "disabled" : ""}>Destinar caixa</button></form></details>${changes.length ? `<details><summary>Últimas alterações de orçamento</summary>${changes.map((h) => `<div class="budget-change"><small>${E.formatDate({ season: h.season }, h.offset)}</small><span>Transferências: ${money(h.before.transfer)} → <strong>${money(h.after.transfer)}</strong></span><span>Teto semanal: ${money(h.before.wage)} → <strong>${money(h.after.wage)}</strong></span></div>`).join("")}</details>` : ""}</section>`;
}
function updateBudgetPreview(source) {
  if (!$("#budget-transfer")) return;
  const t = team(),
    f = t.finance,
    c = E.finance.budgetCapacity(t);
  if (source === "slider") {
    const percent = Number($("#budget-share").value),
      transfer = Math.round((c.allocated * percent) / 100);
    $("#budget-transfer").value = transfer;
    $("#budget-wage").value =
      c.committed + Math.floor((c.allocated - transfer) / 52);
  }
  const transfer = Number($("#budget-transfer").value),
    wage = Number($("#budget-wage").value),
    requested = transfer + Math.max(0, wage - c.committed) * 52;
  const valid =
    Number.isSafeInteger(transfer) &&
    transfer >= 0 &&
    Number.isSafeInteger(wage) &&
    wage >= c.committed &&
    requested <= c.maximum;
  const delta = (value, previous) =>
    (value - previous >= 0 ? "+" : "−") + money(Math.abs(value - previous));
  $("#budget-share").value =
    requested > 0
      ? Math.max(0, Math.min(100, Math.round((transfer / requested) * 100)))
      : 100;
  $("#budget-preview").textContent = $("#budget-share").value + "%";
  $("#budget-simulation").innerHTML =
    `<div class="budget-summary preview"><div><small>Transferências após aplicar</small><strong>${money(transfer)}</strong><span>${delta(transfer, f.transferBudget)}</span></div><div><small>Teto semanal após aplicar</small><strong>${money(wage)}</strong><span>${delta(wage, f.wageBudget)}</span></div><div><small>Espaço para novos salários / semana</small><strong>${money(Math.max(0, wage - c.committed))}</strong></div><div><small>Caixa do clube após distribuir</small><strong>${money(t.money)}</strong><span>Saldo bancário preservado</span></div></div><p class="${valid ? "muted" : "error"}">${wage < c.committed ? "O teto precisa cobrir os salários já contratados." : requested > c.maximum ? "Os valores excedem os recursos disponíveis em " + money(requested - c.maximum) + "." : valid ? (requested > c.allocated ? "Serão reservados " + money(requested - c.allocated) + " do caixa livre." : requested < c.allocated ? "Serão liberados " + money(c.allocated - requested) + " das reservas." : "Redistribuição dentro da verba já aprovada.") : "Informe valores inteiros válidos em reais."}</p>`;
  $("#apply-budget").disabled = !valid;
}

function tacticalTeam() {
  const t =
    tacticalScope === "national" && state.national.job
      ? team(state.national.job)
      : team();
  E.tactics.ensure(t);
  storeTacticalTeam(t);
  return t;
}
function storeTacticalTeam(t) {
  if (t.isNational) {
    const n = state.national;
    n.plans ??= {};
    n.lineups ??= {};
    n.plans[t.id] = t.tactics;
    n.lineups[t.id] = t.lineup;
  }
}
function editTacticalTeam(fn) {
  if (state.live && !state.live.done)
    throw Error("Conclua a partida antes de alterar o plano tático.");
  const t = tacticalTeam();
  fn(t);
  storeTacticalTeam(t);
}
function squadView() {
  const tabs = [
    ["tactics", "Escalação e táticas"],
    ["players", "Jogadores e contratos"],
  ];
  return `<div class="squad-tabs" role="tablist" aria-label="Seções do elenco">${tabs.map(([id, label]) => `<button id="squad-tab-${id}" role="tab" aria-selected="${squadTab === id}" aria-controls="squad-panel-${id}" tabindex="${squadTab === id ? 0 : -1}" data-action="squad-tab" data-id="${id}">${label}</button>`).join("")}</div>${tabs.map(([id]) => `<section id="squad-panel-${id}" role="tabpanel" aria-labelledby="squad-tab-${id}" ${squadTab === id ? "" : "hidden"}>${squadTab === id ? (id === "players" ? squadPlayersView() : squadTacticsView()) : ""}</section>`).join("")}`;
}
function squadPlayersView() {
  return `<div class="hero"><span class="badge">PLANTEL PROFISSIONAL</span><h2>${esc(team().name)} · ${team().players.length} jogadores</h2><p>Consulte posições, condição física, valores e salários. Renove contratos ou negocie saídas do elenco.</p></div><div class="card"><h3>Jogadores e contratos</h3>${rosterReferenceView(team())}<p class="muted">Renovações exigem aumento de 10% e quatro salários semanais de luvas. Os valores abaixo pertencem ao clube.</p>${playersTable(team().players)}</div>`;
}
function squadTacticsView() {
  const T = E.tactics,
    t = tacticalTeam(),
    plan = T.ensure(t),
    slots = T.slots(t),
    eleven = T.positions(t),
    specialists = T.specialists(t),
    target = slots[tacticalSlot],
    chosen = eleven[tacticalSlot],
    r = T.role(t, tacticalSlot);
  const assigned = new Map(eleven.map((p, i) => [p?.id, slots[i].label]));
  const candidates = t.players
    .filter(
      (p) =>
        (squadPosition === "all" || T.positionMatches(p, squadPosition)) &&
        p.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(
            squadQuery
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase(),
          ),
    )
    .sort(
      (a, b) =>
        Number(Boolean(a.injury)) - Number(Boolean(b.injury)) ||
        T.fit(b, target) * b.ovr - T.fit(a, target) * a.ovr,
    );
  const scopes = [
    ["club", "Clube · " + team().name],
    ...(state.national.job
      ? [["national", "Seleção · " + name(state.national.job)]]
      : []),
  ];
  const instructionNames = {
    mentality: "Mentalidade",
    style: "Estilo de jogo",
    pressing: "Pressão",
    tempo: "Ritmo",
    width: "Largura",
    line: "Linha defensiva",
  };
  return `<div class="hero"><span class="badge">VESTIÁRIO E TÁTICAS</span><h2>${esc(t.name)} · ${esc(plan.formation)}</h2><p>Clique em uma posição do campo e escolha quem joga ali. Você também pode arrastar um atleta para o local desejado. Trocar dois titulares preserva os onze jogadores. O número no campo é o overall efetivo naquele local.</p></div><div class="card"><div class="row tactical-toolbar"><label>Equipe<select id="tactical-scope">${options(scopes, tacticalScope)}</select></label><label>Formação<select id="formation">${options(
    Object.keys(T.formations).map((f) => [f, f]),
    plan.formation,
  )}</select></label>${btn("Escalação automática", "auto-lineup")}<span class="muted">Alterações salvas automaticamente</span></div><div class="tactical-workspace"><div class="tactical-board"><div class="attack-direction">↑ DIREÇÃO DO ATAQUE</div><div class="tactics-pitch" aria-label="Campo tático; escolha uma posição">${slots
    .map((s, i) => {
      const p = eleven[i],
        fit = p ? T.fit(p, s) : 0,
        role = T.role(t, i),
        suitability = p ? T.adaptation(p, s) : null;
      return `<button class="tactic-slot ${i === tacticalSlot ? "selected" : ""} ${fit < 0.85 ? "adapted" : ""}" style="left:${Math.min(90, Math.max(10, s.x))}%;top:${s.y}%" data-action="select-tactical-slot" data-id="${i}" data-tactic-slot="${i}" ${p ? `draggable="true" data-drag-player="${esc(p.id)}"` : ""} aria-label="${esc(s.label)}: ${esc(p?.name || "Sem atleta")}${suitability ? " · " + esc(suitability.label) + " · overall " + suitability.effective : ""}"><span class="slot-position">${esc(s.label)}</span><strong>${esc(p?.name || "Vaga aberta")}</strong><small>${p ? `${suitability.effective} · ${p.fitness}%${specialists.captain?.id === p.id ? " · C" : ""}` : "Escolher atleta"}</small><span class="slot-fit">${suitability ? esc(({ "Fora da posição": "Fora", "Posição geral": "Geral", Adaptado: "Adap.", Secundária: "Sec." })[suitability.label] || suitability.label) + (suitability.penalty ? " −" + suitability.penalty + "%" : "") : ""}</span><span class="slot-duty">${esc(role.duty)}</span></button>`;
    })
    .join(
      "",
    )}</div><div class="bench-strip"><strong>Reservas · ${T.bench(t).length} / 9</strong>${T.bench(
    t,
  )
    .map(
      (p) =>
        `<button draggable="true" data-drag-player="${esc(p.id)}" data-action="place-player" data-id="${esc(p.id)}" title="Escalar no local selecionado">${esc(p.name)} <small>${p.pos}</small></button>`,
    )
    .join(
      "",
    )}</div></div><section class="position-picker" aria-label="Escolher jogador para posição"><span class="badge">POSIÇÃO SELECIONADA</span><h3>${esc(target.label)} · ${esc(chosen?.name || "Sem atleta")}</h3><p class="muted">${chosen ? `Posição natural: ${T.adaptation(chosen, target).natural} · ${T.adaptation(chosen, target).label}. Overall ${chosen.ovr} → ${T.adaptation(chosen, target).effective} nesta posição · adaptação ${Math.round(T.fit(chosen, target) * 100)}%` : "Escolha um atleta disponível."}</p><label for="slot-player">Jogador nesta posição<select id="slot-player">${options(
    [
      ["", "Automático"],
      ...t.players
        .filter((p) => !p.injury)
        .sort((a, b) => T.fit(b, target) * b.ovr - T.fit(a, target) * a.ovr)
        .map((p) => [
          p.id,
          p.name +
            " · " +
            (p.naturalPositions?.join("/") || p.pos) +
            " · " +
            p.ovr +
            " → " +
            T.adaptation(p, target).effective +
            " · " +
            T.adaptation(p, target).label +
            (assigned.has(p.id) ? " · " + assigned.get(p.id) : ""),
        ]),
    ],
    chosen?.id || "",
  )}</select></label><div class="columns role-controls"><label>Função<select id="slot-role">${options(
    T.roleOptions(target).map((v) => [v, v]),
    r.role,
  )}</select></label><label>Tarefa<select id="slot-duty">${options(
    T.duties.map((v) => [v, v]),
    r.duty,
  )}</select></label></div><form id="squad-search" class="squad-search"><label>Buscar atleta<input id="squad-query" placeholder="Nome do jogador" value="${esc(squadQuery)}"></label><label>Posição de origem<select id="squad-position">${options([["all", "Todas"], ...["GOL", "LAT", "ZAG", "VOL", "MEI", "ATA"].map((v) => [v, v])], squadPosition)}</select></label><button>Buscar</button></form><div class="candidate-list">${candidates.map((p) => `<div class="candidate ${chosen?.id === p.id ? "chosen" : ""}" draggable="${!p.injury}" data-drag-player="${esc(p.id)}"><div><strong>${esc(p.name)}</strong><small>${T.adaptation(p, target).natural} · overall ${p.ovr} → ${T.adaptation(p, target).effective} · ${T.adaptation(p, target).label} · adaptação ${Math.round(T.fit(p, target) * 100)}% · ${p.injury ? "lesão " + p.injury + " dias" : p.fitness + "%"}${assigned.has(p.id) ? " · titular " + assigned.get(p.id) : ""}</small></div><div>${btn(chosen?.id === p.id ? "Escalado aqui" : "Escalar", "place-player", p.id).replace("<button ", `<button ${p.injury || chosen?.id === p.id ? "disabled" : ""} `)}${!assigned.has(p.id) && !p.injury ? btn(plan.bench.includes(p.id) ? "Retirar prioridade" : "Priorizar banco", "toggle-bench", p.id) : ""}</div></div>`).join("") || "<p>Nenhum atleta neste filtro.</p>"}</div></section></div><p class="muted">Posições naturais e secundárias determinam a adaptação e o overall efetivo neste local. Pontas e laterais perdem rendimento no lado oposto; o overall original não muda. Quando a fonte só informa uma posição geral, o lado fica identificado como não informado. As posições detalhadas são referências históricas e os percentuais de adaptação são parâmetros do jogo. A escalação automática prioriza condição física e adequação ao local. O banco completa automaticamente até nove atletas, respeitando suas prioridades.</p></div><div class="card"><span class="badge">IDENTIDADE DA EQUIPE</span><h3>Instruções táticas</h3><div class="tactic-instructions">${Object.entries(
    T.instructions,
  )
    .map(
      ([key, values]) =>
        `<label>${instructionNames[key]}<select data-instruction="${key}">${options(
          values.map((v) => [v, v]),
          plan[key],
        )}</select></label>`,
    )
    .join(
      "",
    )}</div><p class="muted">Mentalidade, funções e ritmo alteram as oportunidades de gol. Pressão alta e ritmo rápido aumentam o desgaste. Contra-ataques e jogo direto aproveitam espaço contra linhas altas.</p></div><div class="card"><span class="badge">LIDERANÇA E BOLAS PARADAS</span><h3>Responsáveis da equipe</h3><div class="set-piece-grid">${Object.entries(
    T.assignments,
  )
    .map(([key, label]) => {
      const skill = key.includes("corners")
        ? "crossing"
        : key === "freeKicks"
          ? "freeKicks"
          : key === "penalties"
            ? "penalties"
            : "leadership";
      return `<label>${label}<select data-assignment="${key}">${options([["", "Automático entre titulares"], ...[...t.players].sort((a, b) => T.skills(b)[skill] - T.skills(a)[skill]).map((p) => [p.id, p.name + " · " + T.skills(p)[skill] + (assigned.has(p.id) ? " · titular" : " · fora do onze")])], plan.assignments[key] || "")}</select><small>Em campo: ${esc(specialists[key]?.name || "Indisponível")}</small></label>`;
    })
    .join(
      "",
    )}</div><p class="muted">Liderança e atributos de cobrança são estimativas da simulação. Se o escolhido estiver lesionado ou fora do onze, entra um substituto automático; o vice assume quando o capitão não joga.</p></div>`;
}

const newsCategories = {
  all: "Todas as editorias",
  preview: "Pré-jogo",
  results: "Resultados",
  market: "Mercado",
  contracts: "Contratos",
  coaches: "Treinadores",
  competitions: "Competições",
  youth: "Base",
  facilities: "Estrutura",
  training: "Treinamento",
  club: "Clube",
};
function newspaper() {
  const articles = E.journal(state, newsScope, newsCategory),
    ownLeague = E.league(state, team().leagueId);
  const regions = {
    eu: "Europa",
    sa: "América do Sul",
    na: "América do Norte",
    as: "Ásia",
  };
  const scopeLabel =
    newsScope === "club"
      ? team().name
      : newsScope === "league"
        ? ownLeague.name
        : regions[ownLeague.region];
  return `<section class="newspaper"><div class="paper-masthead"><div><span class="badge">O FUTEBOL ACONTECE AQUI</span><h2>LEGACY <em>Jornal</em></h2></div><span>${esc(E.date(state))}<br>Temporada ${state.season}</span></div><div class="paper-edition"><strong>${esc(scopeLabel)}</strong><span>Notícias do universo da sua carreira</span></div><div class="news-toolbar"><div class="scope-filters" role="group" aria-label="Abrangência das notícias">${[
    ["club", "Meu clube"],
    ["league", "Minha liga"],
    ["continent", "Meu continente"],
  ]
    .map(
      ([id, label]) =>
        `<button data-action="news-scope" data-id="${id}" class="${id === newsScope ? "active" : ""}" aria-pressed="${id === newsScope}">${label}</button>`,
    )
    .join(
      "",
    )}</div><label class="inline">Editoria<select id="news-category">${options(Object.entries(newsCategories), newsCategory)}</select></label></div>
    <div class="news-grid">${articles.map((a, i) => `<article class="news-article ${i === 0 ? "news-featured" : ""}" data-article="${esc(a.id)}" data-clubs="${esc(a.clubIds.join(" "))}"><div class="article-meta"><span>${newsCategories[a.category] || "Clube"}</span><time>${esc(E.formatDate({ ...state, season: a.season }, a.offset ?? E.calendar()[a.day]?.offset ?? 0))}</time></div><h3>${esc(a.title)}</h3>${a.body ? `<p>${esc(a.body)}</p>` : ""}<div class="article-clubs">${a.clubIds.map((id) => `<span>${esc(name(id))}</span>`).join("")}</div></article>`).join("") || '<div class="news-empty"><h3>Nenhuma notícia nesta editoria</h3><p class="muted">Escolha outra editoria ou avance a carreira para acompanhar novos acontecimentos.</p></div>'}</div></section>`;
}
function referenceClubName(id) {
  const [code, index] = id.split("-"),
    l = E.LEAGUES.find((l) => l.id === code);
  return l?.historicalClubs?.[Number(index)] || name(id);
}
function referenceMatchup(f) {
  const names = f.pair.map((id) => {
    const [league, index] = id.split("-"),
      l = E.LEAGUES.find((l) => l.id === league);
    return esc(l?.historicalClubs?.[Number(index)] || name(id));
  });
  return names.join(" <strong>×</strong> ");
}
function referenceCalendar() {
  const id =
      referenceLeague ||
      (E.REFERENCES[team().leagueId] ? team().leagueId : "br"),
    data = E.REFERENCES[id],
    l = E.league(state, id),
    matches = data.matches.filter(
      (m) => referenceClub === "all" || m.pair.includes(referenceClub),
    );
  return `<div class="card"><div class="row"><h3>Calendário real de referência</h3>${btn("← Calendário da carreira", "career-calendar")}</div><p class="muted">Datas históricas da base OpenFootball, referência ${data.reference}. Esta consulta é separada das datas simuladas da carreira. Argentina: a fonte disponível cobre apenas a primeira fase do primeiro semestre.</p><div class="filters"><label>Liga<select id="reference-league">${options(
    Object.keys(E.REFERENCES).map((id) => [id, E.league(state, id).name]),
    id,
  )}</select></label><label>Clube<select id="reference-club">${options([["all", "Todos os clubes"], ...l.ids.map((id) => [id, referenceClubName(id)])], referenceClub)}</select></label></div><p><a href="${data.source}" target="_blank" rel="noopener noreferrer">Fonte dos confrontos e datas · OpenFootball (CC0)</a></p><div class="table-wrap"><table><thead><tr><th>DATA DA BASE</th><th>RODADA</th><th>CONFRONTO</th></tr></thead><tbody>${[
    ...matches,
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (m) =>
        `<tr><td>${esc(m.date.split("-").reverse().join("/"))}</td><td>${esc(m.round)}</td><td>${referenceMatchup(m)}</td></tr>`,
    )
    .join("")}</tbody></table></div></div>`;
}
function draw() {
  const m = state.live;
  if (!m || !$("#field")) return;
  $("#match-minute").textContent = m.name + " · " + m.minute + "’";
  $(".score").innerHTML = matchup(m, m.goals);
  $("#stats").textContent =
    "Finalizações: " +
    m.shots.join(" × ") +
    (m.penalties ? " · Pênaltis: " + m.penalties.join(" × ") : "");
  $("#log").innerHTML = m.events.map((e) => `<p>${esc(e)}</p>`).join("");
  if (m.mode !== "2d") {
    $("#field").innerHTML = "";
    return;
  }
  if (!$("#pitch"))
    $("#field").innerHTML =
      `<div class="pitch" id="pitch"><div class="half"></div>${Array.from({ length: 22 }, (_, i) => `<span class="dot ${i >= 11 ? "away" : ""}" id="dot-${i}">${(i % 11) + 1}</span>`).join("")}<span class="dot ball" id="ball"></span></div>`;
  for (let i = 0; i < 22; i++) {
    const j = i % 11,
      side = i < 11 ? 0 : 1;
    const slot =
      m.plans?.[side]?.slots[j] || E.tactics.slots(team(m.pair[side]))[j];
    const x =
      (side ? 97 - (100 - slot.y) * 0.43 : 3 + (100 - slot.y) * 0.43) +
      Math.sin(m.minute * 0.5 + j) * 2;
    const y = slot.x + Math.cos(m.minute * 0.4 + j) * 2;
    const player = m.plans?.[side]?.starters[j];
    $("#dot-" + i).title = player?.name || String(j + 1);
    $("#dot-" + i).style.left = x + "%";
    $("#dot-" + i).style.top = y + "%";
  }
  $("#ball").style.left = 50 + Math.sin(m.minute) * 29 + "%";
  $("#ball").style.top = 50 + Math.cos(m.minute * 0.7) * 30 + "%";
}
function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}
function tick() {
  const m = state.live;
  if (!m || m.done) {
    stopTimer();
    return;
  }
  E.minute(state, m);
  if (m.minute >= 90) {
    stopTimer();
    act(() => {
      E.advance(state);
      paused = false;
    });
  } else {
    if (m.minute % 15 === 0) persist();
    if (page === "Dia de jogo") draw();
  }
}
function runTimer() {
  stopTimer();
  if (state.live && !state.live.done && !paused)
    timer = setInterval(tick, speed);
}
const negotiationLabels = {
  "club-pending": "Clube analisando",
  "club-counter": "Contraproposta do clube",
  "contract-ready": "Negociar contrato",
  "player-pending": "Jogador analisando",
  "player-counter": "Contraproposta do jogador",
  "medical-pending": "Exames e assinatura",
  blocked: "Assinatura pendente",
  completed: "Contratado",
  rejected: "Recusada",
  cancelled: "Cancelada",
  expired: "Expirada",
};
function negotiationOverview() {
  const active = (state.negotiations || []).filter(E.negotiationActive);
  if (!active.length) return "";
  const responses = active.filter((n) =>
    ["club-counter", "contract-ready", "player-counter", "blocked"].includes(
      n.stage,
    ),
  ).length;
  return `<div class="card"><div class="row"><div><h3>Negociações em andamento · ${active.length}</h3><p>${responses ? responses + " aguardando sua decisão." : "Os clubes e jogadores estão analisando suas propostas."}</p></div><button data-page="Transferências">Acompanhar negociações</button></div></div>`;
}
function negotiationsView() {
  const list = state.negotiations || [],
    active = list.filter(E.negotiationActive),
    closed = list.filter((n) => !E.negotiationActive(n));
  const format = (value) =>
    value
      ? new Date(value + "T00:00:00Z").toLocaleDateString("pt-BR", {
          timeZone: "UTC",
        })
      : "";
  const card = (n) =>
    `<article class="negotiation-card" data-negotiation="${esc(n.id)}"><div class="row"><h4>${esc(n.playerName)}</h4><span class="pill">${negotiationLabels[n.stage]}</span></div><p class="muted">${esc(n.sellerId ? name(n.sellerId) : "Sem clube")} → ${esc(name(n.buyerId))}</p><ol class="negotiation-steps"><li class="${n.stage.startsWith("club-") ? "current" : ""}">1. Clube</li><li class="${["contract-ready", "player-pending", "player-counter"].includes(n.stage) ? "current" : ""}">2. Jogador</li><li class="${["medical-pending", "blocked", "completed"].includes(n.stage) ? "current" : ""}">3. Assinatura</li></ol><p>${esc(n.message)}</p><p>Transferência: <strong>${money(n.fee)}</strong>${n.salary ? ` · ${money(n.salary)}/semana · ${n.years} temporadas · luvas ${money(n.bonus)}` : ""}</p>${n.dueOn ? `<p class="muted">Resposta prevista: <strong>${format(n.dueOn)}</strong>. Avance os dias em Visão geral.</p>` : n.expiresOn ? `<p class="muted">Prazo para responder: ${format(n.expiresOn)}.</p>` : ""}<div class="row">${n.stage === "club-counter" ? btn("Revisar proposta ao clube", "counter-club", n.id, "primary") : ""}${["contract-ready", "player-counter"].includes(n.stage) ? btn(n.stage === "contract-ready" ? "Negociar contrato" : "Revisar contrato", "offer-contract", n.id, "primary") : ""}${n.stage === "blocked" ? btn("Reavaliar recursos", "retry-negotiation", n.id, "primary") : ""}${E.negotiationActive(n) ? btn("Encerrar negociação", "cancel-negotiation", n.id) : ""}</div><details><summary>Histórico da negociação</summary>${n.history.map((h) => `<p><small>${format(h.date)}</small> · ${esc(h.message)}</p>`).join("")}</details></article>`;
  return `<section class="card" id="negotiations"><div class="row"><h3>Central de negociações</h3><span class="pill">${active.length} em andamento</span></div><p>Primeiro o clube, depois o jogador e o empresário. Cada resposta leva dois dias da carreira; após o acordo, exames e documentação levam mais um dia. A simulação para quando chega uma resposta.</p><p class="muted">O dinheiro só sai na assinatura. As propostas não reservam verba: mantenha caixa, limite de transferências e espaço salarial até a conclusão. O papel no elenco influencia as exigências do jogador. Não há contratação automática ao enviar a primeira oferta.</p>${active.length ? `<div class="negotiation-grid">${active.map(card).join("")}</div>` : '<p class="muted">Procure um jogador no mercado e envie sua primeira proposta.</p>'}${closed.length ? `<details><summary>Negociações encerradas (${closed.length})</summary>${closed.slice(0, 8).map(card).join("")}</details>` : ""}</section>`;
}
function openNegotiation(kind, id) {
  if (state.live && !state.live.done)
    throw Error("Conclua a partida antes de negociar.");
  const n =
    kind === "new" ? null : (state.negotiations || []).find((n) => n.id === id);
  const playerId = n?.playerId || id;
  const p = [
    ...state.teams.flatMap((t) => t.players),
    ...state.freeAgents,
  ].find((p) => p.id === playerId);
  if (!p) throw Error("Jogador indisponível.");
  const seller = state.teams.find((t) => t.players.some((x) => x.id === p.id));
  const contract = kind === "player";
  const salary = n?.askSalary || Math.ceil(p.salary * (seller ? 1.15 : 1.05));
  const years = n?.askYears || 2;
  let html = `<h2>${contract ? "Contrato com" : "Proposta por"} ${esc(p.name)}</h2><p>${esc(seller?.name || "Sem clube")} · ${p.pos} · Overall ${p.ovr} · ${playerAge(p)}${p.ageUnknown ? "" : " anos"}</p>`;
  if (contract)
    html += `<p>O clube já concordou com ${money(n.fee)}. Agora negocie com o jogador e o empresário.</p><label>Salário semanal (R$)<input name="salary" type="number" min="1500" max="30000000" step="1" required value="${salary}"></label><label>Luvas (R$)<input name="bonus" type="number" min="0" max="1000000000000" step="1" required value="${n.askBonus || salary * 4}"></label><label>Duração em temporadas<select name="years">${options(
      [1, 2, 3, 4, 5].map((v) => [v, v]),
      years,
    )}</select></label><label>Papel proposto no elenco<select name="role">${options(
      [
        ["important", "Jogador importante"],
        ["rotation", "Rotação do elenco"],
        ["prospect", "Promessa para o futuro"],
      ],
      n.role,
    )}</select></label><p class="muted">O empresário responderá em dois dias. Você poderá receber uma contraproposta; exames e assinatura acontecem em outra etapa.</p>`;
  else
    html += seller
      ? `<label>Valor da transferência (R$)<input name="fee" type="number" min="0" max="10000000000000" step="1" required value="${n?.askFee || E.minFee(state, p)}"></label><p class="muted">O clube responderá em dois dias. O salário, as luvas e o contrato serão negociados com o jogador após o acordo entre clubes.</p>`
      : "<p>O atleta está livre. Não existe taxa de transferência; você seguirá para a negociação do contrato.</p>";
  $("#deal-form").innerHTML =
    html +
    '<p id="deal-error" class="error" role="alert"></p><div class="row"><button type="button" data-action="close-dialog">Cancelar</button><button class="primary">Enviar proposta</button></div>';
  $("#deal").showModal();
  $("#deal-form").onsubmit = (event) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    try {
      if (kind === "new")
        E.negotiateClub(state, p.id, seller ? Number(f.get("fee")) : 0);
      else if (kind === "club")
        E.counterClub(state, n.id, Number(f.get("fee")));
      else
        E.negotiatePlayer(
          state,
          n.id,
          Number(f.get("salary")),
          Number(f.get("years")),
          Number(f.get("bonus")),
          f.get("role"),
        );
      $("#deal").close();
      persist();
      render();
      notify(
        "Proposta enviada. Acompanhe a resposta na Central de negociações e avance os dias em Visão geral.",
      );
    } catch (error) {
      $("#deal-error").textContent = error.message;
    }
  };
}
function openDeal(kind, id) {
  if (kind === "buy") return openNegotiation("new", id);
  if (state.live && !state.live.done)
    throw Error("Conclua a partida antes de negociar.");
  let p, seller;
  for (const t of state.teams) {
    p = t.players.find((p) => p.id === id);
    if (p) {
      seller = t;
      break;
    }
  }
  if (!p) p = state.freeAgents.find((p) => p.id === id);
  if (!p) throw Error("Jogador indisponível.");
  let html;
  if (kind === "sell") {
    const offer = E.saleOffer(state, id);
    if (!offer) throw Error("Nenhum clube tem orçamento para este jogador.");
    html = `<h2>Proposta por ${esc(p.name)}</h2><p>${esc(name(offer.buyerId))} oferece <strong>${money(offer.fee)}</strong>.</p><p class="muted">O clube precisa manter ao menos 16 atletas. Vendas dependem da janela aberta.</p><input type="hidden" name="buyer" value="${offer.buyerId}"><input type="hidden" name="fee" value="${offer.fee}">`;
  } else {
    const salary =
      kind === "renew" || seller ? Math.ceil(p.salary * 1.1) : p.salary;
    html = `<h2>${kind === "buy" ? "Contratar" : "Renovar"} ${esc(p.name)}</h2><p>${esc(seller?.name || "Sem clube")} · ${p.pos} · Geral ${p.ovr}</p>${kind === "buy" ? `<label>Valor da transferência (R$)<input name="fee" type="number" min="0" step="1" required value="${seller ? E.minFee(state, p) : 0}"></label>` : ""}<label>Salário semanal (R$)<input name="salary" type="number" min="1500" max="30000000" step="1" required value="${salary}"></label><label>Duração em temporadas<select name="years">${[1, 2, 3, 4, 5].map((n) => `<option ${n === 2 ? "selected" : ""}>${n}</option>`).join("")}</select></label><p class="muted">Luvas: quatro salários semanais, além do valor da transferência.</p>`;
  }
  $("#deal-form").innerHTML =
    html +
    `<p id="deal-error" class="error" role="alert"></p><div class="row"><button type="button" data-action="close-dialog">Cancelar</button><button class="primary">${kind === "sell" ? "Aceitar venda" : "Enviar proposta"}</button></div>`;
  $("#deal").showModal();
  $("#deal-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      if (kind === "renew")
        E.renew(state, id, Number(f.get("years")), Number(f.get("salary")));
      if (kind === "sell")
        E.sell(state, id, f.get("buyer"), Number(f.get("fee")));
      $("#deal").close();
      persist();
      render();
      notify("Negociação concluída.");
    } catch (e) {
      $("#deal-error").textContent = e.message;
    }
  };
}
document.addEventListener("keydown", (event) => {
  const tab = event.target.closest('[role="tab"][data-action="squad-tab"]');
  if (!tab || !["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key))
    return;
  event.preventDefault();
  squadTab =
    event.key === "Home"
      ? "tactics"
      : event.key === "End"
        ? "players"
        : squadTab === "tactics"
          ? "players"
          : "tactics";
  render();
  $("#squad-tab-" + squadTab).focus();
});
document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-page]");
  if (nav) {
    page = nav.dataset.page;
    if (
      page === "Dia de jogo" &&
      E.nextFixture(state) &&
      state.live?.done &&
      state.live.offset !== state.today
    )
      state.live = null;
    render();
    return;
  }
  const b = event.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action,
    id = b.dataset.id;
  if (a === "squad-tab") {
    if (!["tactics", "players"].includes(id)) return;
    squadTab = id;
    render();
    $("#squad-tab-" + id).focus();
    return;
  }
  if (a === "toggle-theme") {
    toggleTheme();
    return;
  }
  if (a === "import-save") {
    $("#import-file").click();
    return;
  }
  if (a === "export-save") {
    exportCareer();
    return;
  }
  if (a === "save-now") {
    if (persist()) notify("Carreira salva neste navegador.");
    return;
  }
  if (a === "delete-save") {
    openDelete();
    return;
  }
  if (a === "cancel-save-dialog") {
    $("#save-dialog").close();
    pendingImport = null;
    return;
  }
  if (a === "confirm-import") {
    importCareer();
    return;
  }
  if (a === "confirm-delete") {
    deleteCareer();
    return;
  }
  if (a === "news-scope") {
    newsScope = id;
    render();
    return;
  }
  if (a === "close-dialog") {
    $("#deal").close();
    return;
  }
  act(() => {
    if (state.live && !state.live.done && !["pause", "instant"].includes(a))
      throw Error("Conclua a partida antes de mudar a gestão do clube.");
    switch (a) {
      case "reference-calendar":
        calendarView = "reference";
        break;
      case "career-calendar":
        calendarView = "career";
        break;
      case "begin":
        E.start(state, $("#start-club").value, readProfile("start"), setupMode);
        break;
      case "national-next":
        nationalPage++;
        break;
      case "national-prev":
        nationalPage = Math.max(0, nationalPage - 1);
        break;
      case "assume-national":
        E.assumeNational(state, $("#national-choice").value);
        nationalQuery = "";
        nationalPage = 0;
        break;
      case "resign-national":
        state.national.job = null;
        state.live = null;
        break;
      case "auto-call": {
        const n = E.team(state, state.national.job);
        state.national.squads[n.id] = E.national.best(state, n.country);
        break;
      }
      case "call-player":
        E.national.call(state, id);
        break;
      case "buy":
      case "renew":
      case "sell":
        openDeal(a, id);
        break;
      case "sign-sponsor": {
        const c = E.signSponsor(state, id);
        notify("Contrato com " + c.name + " assinado.");
        break;
      }
      case "ledger-prev":
        ledgerPage = Math.max(0, ledgerPage - 1);
        break;
      case "ledger-next":
        ledgerPage++;
        break;
      case "promote":
        E.promote(state, id);
        break;
      case "upgrade":
        E.upgrade(state, id);
        break;
      case "enable-test-mode":
        if (
          confirm(
            "Ativar modo teste nesta carreira? Ela ficará identificada como teste no save. Exporte uma cópia antes se quiser manter a carreira normal.",
          )
        )
          E.enableTestMode(state);
        break;
      case "reset-budget":
        render();
        break;
      case "select-tactical-slot":
        tacticalSlot = Number(id);
        break;
      case "place-player":
        editTacticalTeam((t) => E.tactics.select(t, tacticalSlot, id));
        break;
      case "toggle-bench":
        editTacticalTeam((t) => E.tactics.toggleBench(t, id));
        break;
      case "auto-lineup":
        editTacticalTeam((t) => {
          t.lineup = [];
          t.tactics.bench = [];
        });
        break;
      case "change-club":
        if (
          confirm(
            "Assumir " +
              name(id) +
              "? Você passará a administrar o caixa e o elenco desse clube.",
          )
        ) {
          E.changeClub(state, id);
          competition = "";
          page = "Visão geral";
        }
        break;
      case "next-season":
        E.nextSeason(state);
        page = "Visão geral";
        break;
      case "advance":
        E.advance(state);
        break;
      case "play":
        E.makeMatch(state, matchMode);
        paused = false;
        runTimer();
        break;
      case "pause":
        paused = !paused;
        runTimer();
        break;
      case "instant":
        stopTimer();
        while (state.live.minute < 90) E.minute(state, state.live);
        E.advance(state);
        paused = false;
        break;
      case "continue":
        state.live = null;
        page = "Visão geral";
        break;
      case "counter-club":
        openNegotiation("club", id);
        break;
      case "offer-contract":
        openNegotiation("player", id);
        break;
      case "cancel-negotiation":
        E.cancelNegotiation(state, id);
        break;
      case "retry-negotiation":
        E.retryNegotiation(state, id);
        break;
      case "market-clear":
        marketLeague = "all";
        marketPosition = "all";
        marketQuery = "";
        marketExtra = {
          nationality: "all",
          overallMin: "",
          overallMax: "",
          ageMin: "",
          ageMax: "",
          priceMax: "",
          sort: "reference",
        };
        marketPage = 0;
        break;
      case "market-prev":
        marketPage = Math.max(0, marketPage - 1);
        break;
      case "market-next":
        marketPage++;
        break;
    }
  });
});
document.addEventListener("dragstart", (event) => {
  const source = event.target.closest("[data-drag-player]");
  if (!source || source.getAttribute("draggable") !== "true") return;
  event.dataTransfer.setData("text/plain", source.dataset.dragPlayer);
  event.dataTransfer.effectAllowed = "move";
});
document.addEventListener("dragover", (event) => {
  if (event.target.closest("[data-tactic-slot]")) event.preventDefault();
});
document.addEventListener("drop", (event) => {
  const target = event.target.closest("[data-tactic-slot]");
  if (!target) return;
  event.preventDefault();
  const id = event.dataTransfer.getData("text/plain"),
    index = Number(target.dataset.tacticSlot);
  act(() =>
    editTacticalTeam((t) => {
      E.tactics.select(t, index, id);
      tacticalSlot = index;
    }),
  );
});
document.addEventListener("input", (event) => {
  if (event.target.id.startsWith("start-coach-"))
    setupProfile = readProfile("start");
  if (event.target.id === "budget-share") updateBudgetPreview("slider");
  if (["budget-transfer", "budget-wage"].includes(event.target.id))
    updateBudgetPreview();
});
document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.id.startsWith("start-coach-")) {
    setupProfile = readProfile("start");
    return;
  }
  if (el.id === "national-filter") {
    nationalFilter = el.value;
    nationalPage = 0;
    render();
    return;
  }
  if (el.id === "start-game-mode") {
    setupMode = el.value;
    render();
    return;
  }
  if (el.id === "start-league") {
    setupLeague = el.value;
    setupClub = (
      state.teams.find(
        (t) => t.leagueId === setupLeague && t.players.length >= 11,
      ) || state.teams.find((t) => t.leagueId === setupLeague)
    ).id;
    render();
    return;
  }
  if (el.id === "start-club") {
    setupClub = el.value;
    render();
    return;
  }
  if (el.id === "news-category") {
    newsCategory = el.value;
    render();
    return;
  }
  if (el.id === "ledger-category") {
    ledgerCategory = el.value;
    ledgerPage = 0;
    render();
    return;
  }
  if (el.id === "ledger-direction") {
    ledgerDirection = el.value;
    ledgerPage = 0;
    render();
    return;
  }
  if (el.id === "mode") {
    matchMode = el.value;
    if (state.live) {
      state.live.mode = el.value;
      persist();
      draw();
    }
    return;
  }
  if (el.id === "speed") {
    speed = Number(el.value);
    runTimer();
    return;
  }
  if (el.id === "reference-league") {
    referenceLeague = el.value;
    referenceClub = "all";
    render();
    return;
  }
  if (el.id === "reference-club") {
    referenceClub = el.value;
    render();
    return;
  }
  if (el.id === "competition") {
    competition = el.value;
    render();
    return;
  }
  if (
    [
      "market-league",
      "market-position",
      "market-nationality",
      "market-sort",
    ].includes(el.id)
  ) {
    if (readMarketFilters()) render();
    return;
  }
  if (el.id === "tactical-scope") {
    tacticalScope = el.value;
    tacticalSlot = 0;
    squadQuery = "";
    render();
    return;
  }
  if (el.id === "squad-position") {
    squadPosition = el.value;
    render();
    return;
  }
  if (el.id === "formation") {
    act(() => editTacticalTeam((t) => E.tactics.formation(t, el.value)));
    return;
  }
  if (el.id === "slot-player") {
    act(() =>
      editTacticalTeam((t) => E.tactics.select(t, tacticalSlot, el.value)),
    );
    return;
  }
  if (["slot-role", "slot-duty"].includes(el.id)) {
    const role = $("#slot-role").value,
      duty = $("#slot-duty").value;
    act(() =>
      editTacticalTeam((t) => E.tactics.setRole(t, tacticalSlot, role, duty)),
    );
    return;
  }
  if (el.dataset.instruction) {
    act(() =>
      editTacticalTeam((t) => {
        E.tactics.update(t, el.dataset.instruction, el.value);
        if (el.dataset.instruction === "mentality" && !t.isNational)
          state.tactic = el.value;
      }),
    );
    return;
  }
  if (el.dataset.assignment) {
    act(() =>
      editTacticalTeam((t) =>
        E.tactics.setAssignment(t, el.dataset.assignment, el.value),
      ),
    );
    return;
  }
  if (["tactic", "training"].includes(el.id))
    act(() => {
      if (state.live && !state.live.done)
        throw Error("Conclua a partida antes de mudar os planos.");
      state[el.id] = el.value;
      if (el.id === "tactic") E.tactics.update(team(), "mentality", el.value);
    });
});
document.addEventListener("submit", (event) => {
  if (event.target.id === "test-funds-form") {
    event.preventDefault();
    act(() => {
      const amount = E.addTestFunds(
        state,
        Number($("#test-funds-amount").value),
        $("#test-funds-destination").value,
      );
      notify(money(amount) + " adicionados. Aporte registrado no modo teste.");
    });
    return;
  }
  if (event.target.id === "squad-search") {
    event.preventDefault();
    squadQuery = $("#squad-query").value.trim();
    render();
    return;
  }
  if (event.target.id === "profile-form") {
    event.preventDefault();
    act(() => {
      E.setProfile(state, readProfile("edit"));
      notify("Perfil do treinador atualizado.");
    });
    return;
  }
  if (event.target.id === "national-search") {
    event.preventDefault();
    nationalQuery = $("#national-query").value.trim();
    nationalPage = 0;
    render();
    return;
  }
  if (event.target.id === "simulation-form") {
    event.preventDefault();
    simulateAmount = Number($("#simulate-amount").value);
    simulateUnit = $("#simulate-unit").value;
    act(() => {
      state.advancePreference = { amount: simulateAmount, unit: simulateUnit };
      const result = E.simulate(state, simulateAmount, simulateUnit);
      notify(
        result.stoppedForMatch
          ? `${result.advanced} dia(s) avançados. Seu clube ou seleção joga hoje; abra Dia de jogo.`
          : result.stoppedForNegotiation
            ? `${result.advanced} dia(s) avançados. Chegou uma resposta: confira a Central de negociações em Transferências.`
            : result.finished
              ? "Temporada concluída."
              : `${result.advanced} dia(s) avançados.`,
      );
    });
    return;
  }
  if (event.target.id === "fund-budget-form") {
    event.preventDefault();
    act(() => {
      E.finance.fundBudget(
        team(),
        state,
        Number($("#fund-budget-amount").value),
      );
      notify("Caixa destinado ao orçamento. O saldo bancário não mudou.");
    });
    return;
  }
  if (event.target.id === "budget-form") {
    event.preventDefault();
    act(() => {
      E.finance.setBudgets(
        team(),
        state,
        Number($("#budget-transfer").value),
        Number($("#budget-wage").value),
      );
      notify(
        "Novos limites aplicados: transferências " +
          money(team().finance.transferBudget) +
          " e teto semanal " +
          money(team().finance.wageBudget) +
          ".",
      );
    });
    return;
  }
  if (event.target.id === "search-form") {
    event.preventDefault();
    if (!readMarketFilters()) return;
    marketPage = 0;
    render();
  }
});
$("#save").onclick = () => {
  if (persist()) notify("Carreira salva neste navegador.");
};
$("#export").onclick = exportCareer;
window.addEventListener("beforeunload", () => {
  if (!loadError) persist();
});
let nationalQuery = "",
  nationalFilter = "all",
  nationalPage = 0,
  pendingImport = null;
function countryLabel(country) {
  return (
    E.national.countries.find(([code]) => code === country)?.[1] || country
  );
}
function profileFields(profile, prefix) {
  return `<div class="coach-fields"><label for="${prefix}-coach-name">Nome do treinador<input id="${prefix}-coach-name" maxlength="60" minlength="2" required autocomplete="name" value="${esc(profile.name)}" placeholder="Seu nome"></label><div class="columns"><label for="${prefix}-coach-age">Idade<input id="${prefix}-coach-age" type="number" min="18" max="85" step="1" required value="${esc(profile.age)}"></label><label for="${prefix}-coach-nationality">Nacionalidade<select id="${prefix}-coach-nationality">${options(E.national.countries, profile.nationality)}</select></label></div></div>`;
}
function readProfile(prefix) {
  return {
    name: $("#" + prefix + "-coach-name").value,
    age: Number($("#" + prefix + "-coach-age").value),
    nationality: $("#" + prefix + "-coach-nationality").value,
  };
}
function profileView() {
  const p = state.profile;
  return `<div class="card"><span class="badge">PERFIL DO TREINADOR</span><h3>${esc(p.name)}</h3><p>${state.season - p.birthYear} anos · ${esc(countryLabel(p.nationality))}${state.national.job ? " · Seleção: " + esc(name(state.national.job)) : ""}</p><details><summary>Editar nome, idade e nacionalidade</summary><form id="profile-form">${profileFields({ ...p, age: state.season - p.birthYear }, "edit")}<button class="primary">Atualizar perfil</button></form></details><p class="muted">A idade avança a cada temporada. Você pode acumular o comando de um clube e uma seleção.</p><button data-page="Seleções">Comandar uma seleção →</button> <button data-page="Salvamentos">Gerenciar salvamento</button></div>`;
}
function nationalView() {
  const n = state.national,
    available = E.national.available(state),
    job = n.job && team(n.job),
    selected = new Set(job?.players.map((p) => p.id) || []);
  const choices = E.national.definitions
    .map(
      (d) =>
        `<option value="${esc(d.id)}" ${d.id === n.job ? "selected" : ""} ${!available.some((a) => a.id === d.id) ? "disabled" : ""}>${esc(d.name)}${!available.some((a) => a.id === d.id) ? " · elenco insuficiente" : ""}</option>`,
    )
    .join("");
  let html = `<div class="hero"><span class="badge">FUTEBOL DE SELEÇÕES</span><h2>${job ? esc(job.name) : "Leve seu trabalho à seleção"}</h2><p>${job ? esc(state.profile.name) + " · " + job.players.length + " convocados" : "Assuma uma seleção e convoque atletas reais de clubes do mundo inteiro."}</p></div><div class="card"><h3>Trabalho internacional</h3><p>O cargo é acumulado com o clube. Há até seis amistosos por temporada, entre os jogos de clubes; algumas seleções têm folgas. A simulação para nos jogos da sua seleção e permite acompanhar em texto ou 2D.</p><p class="muted">Elegibilidade simplificada pela cidadania disponível na fonte; não verifica vínculos oficiais FIFA. Esta etapa inclui amistosos, sem Copa do Mundo ou eliminatórias.</p><label for="national-choice">Seleção<select id="national-choice">${choices}</select></label>${btn(job ? "Assumir seleção escolhida" : "Assumir seleção", "assume-national", "", "primary")} ${job ? btn("Deixar seleção", "resign-national") : ""}</div>`;
  if (!job) return html;
  const query = nationalQuery
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const pool = E.national
    .pool(state, job.country)
    .filter(
      (p) =>
        (nationalFilter === "all" ||
          (nationalFilter === "called"
            ? selected.has(p.id)
            : p.pos === nationalFilter)) &&
        p.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(query),
    )
    .sort(
      (a, b) =>
        Number(selected.has(b.id)) - Number(selected.has(a.id)) ||
        b.ovr - a.ovr,
    );
  nationalPage = Math.min(
    nationalPage,
    Math.max(0, Math.ceil(pool.length / 25) - 1),
  );
  html += `<div class="card"><div class="row"><div><h3>Convocação · ${job.players.length} / 23</h3><p class="muted">Mantenha ao menos onze atletas e um goleiro. Não há compra ou pagamento pelo clube ao convocar.</p></div>${btn("Convocar melhores disponíveis", "auto-call")}</div><p>${E.lineup(
    job,
  )
    .map((p) => esc(p.name) + " (" + p.pos + ")")
    .join(
      " · ",
    )}</p><form id="national-search" class="row"><label>Buscar atleta<input id="national-query" value="${esc(nationalQuery)}" placeholder="Nome do jogador"></label><label>Filtro<select id="national-filter">${options([["all", "Todos elegíveis"], ["called", "Convocados"], ...["GOL", "LAT", "ZAG", "VOL", "MEI", "ATA"].map((p) => [p, p])], nationalFilter)}</select></label><button>Buscar</button></form><p class="muted">${pool.length} encontrados · página ${nationalPage + 1} de ${Math.max(1, Math.ceil(pool.length / 25))}.</p><div class="table-wrap"><table><thead><tr><th>ATLETA</th><th>POS.</th><th>GERAL</th><th>CLUBE</th><th>CONDIÇÃO</th><th>CONVOCAÇÃO</th></tr></thead><tbody>${pool
    .slice(nationalPage * 25, nationalPage * 25 + 25)
    .map(
      (p) =>
        `<tr class="${selected.has(p.id) ? "mine" : ""}"><td>${esc(p.name)}<small class="sub">${playerAge(p)}${p.ageUnknown ? "" : " anos"}</small></td><td>${p.pos}</td><td>${p.ovr}</td><td>${esc(state.teams.find((t) => [...t.players, ...t.youth].some((x) => x.id === p.id))?.name || "Sem clube")}</td><td>${p.injury ? "Lesão · " + p.injury + " dias" : p.fitness + "%"}</td><td>${btn(selected.has(p.id) ? "Dispensar" : "Convocar", "call-player", p.id)}</td></tr>`,
    )
    .join("")}</tbody></table></div></div>`;
  html += `<div class="row">${nationalPage > 0 ? btn("← Anteriores", "national-prev") : ""}${(nationalPage + 1) * 25 < pool.length ? btn("Próximos →", "national-next") : ""}</div>`;
  const fixtures = n.fixtures.filter((f) => f.pair.includes(n.job));
  html += `<div class="card"><h3>Agenda da seleção · ${state.season}</h3>${fixtures
    .map((f) => {
      const result = n.results.find(
        (r) =>
          r.season === state.season &&
          r.offset === f.offset &&
          r.pair.includes(n.job),
      );
      return `<div class="calendar-row"><span>${E.formatDate(state, f.offset)}</span><div><strong>${matchup(f, result?.goals)}</strong><p class="muted">Amistoso internacional${f.offset === state.today ? " · hoje" : f.offset < state.today ? " · encerrado" : ""}</p></div></div>`;
    })
    .join("")}</div><div class="card"><h3>Histórico internacional</h3>${
    n.results
      .filter((r) => r.pair.includes(n.job))
      .slice(-12)
      .reverse()
      .map((r) => `<p>${r.season} · ${matchup(r, r.goals)}</p>`)
      .join("") ||
    '<p class="muted">Sua seleção ainda não disputou um amistoso.</p>'
  }</div>`;
  return html;
}
function saveView() {
  return `<div class="hero"><span class="badge">SUA CARREIRA, SEU ARQUIVO</span><h2>Salvamentos</h2><p>${esc(state.profile.name)} · ${esc(team().name)} · ${esc(E.date(state))}</p></div><div class="card"><h3>Continuar de onde parou</h3><p>As ações são salvas automaticamente neste navegador. Para guardar fora dele ou jogar em outro dispositivo, baixe o arquivo do save e importe-o depois.</p><div class="row">${btn("Salvar neste navegador", "save-now", "", "primary")}${btn("Baixar arquivo do save", "export-save")}${btn("Importar arquivo", "import-save")}</div><p class="muted">A importação mostra uma confirmação antes de substituir a carreira. Arquivos inválidos não alteram seu progresso.</p></div><div class="card"><h3>Excluir carreira</h3><p>Apaga a carreira e as cópias de recuperação deste navegador. Os arquivos que você já baixou continuam disponíveis.</p>${btn("Excluir carreira", "delete-save", "", "danger")}</div>`;
}
function exportCareer() {
  try {
    const blob = new Blob([LegacySaves.serialize(state)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download =
      "club-legacy-" + state.season + "-" + (state.today || 0) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Arquivo do save preparado para download.");
  } catch (e) {
    notify(e.message, true);
  }
}
function pauseForSaveDialog() {
  if (state.live && !state.live.done) {
    stopTimer();
    paused = true;
    render();
  }
}
function showSaveDialog(html) {
  $("#save-dialog-content").innerHTML = html;
  $("#save-dialog").showModal();
}
function openDelete() {
  pauseForSaveDialog();
  showSaveDialog(
    `<h2>Excluir esta carreira?</h2><p>Seu progresso${state.clubId ? " em " + esc(team().name) : ""} e as cópias de recuperação locais serão apagados. A ação não pode ser desfeita.</p><p>Baixe o save antes se quiser continuar esta carreira depois.</p><div class="row">${state.clubId ? btn("Baixar antes de excluir", "export-save") : ""}${btn("Cancelar", "cancel-save-dialog")}${btn("Excluir definitivamente", "confirm-delete", "", "danger")}</div>`,
  );
}
function deleteCareer() {
  try {
    // Invalida todas as chaves que poderiam restaurar a carreira no próximo carregamento.
    for (const key of [
      KEY,
      "club-legacy-v1",
      "club-legacy-v1-backup",
      "club-legacy-v2-backup",
      "club-legacy-v3",
      "club-legacy-v3-backup",
      "club-legacy-import-backup",
    ])
      localStorage.removeItem(key);
  } catch {
    notify(
      "O navegador impediu a exclusão dos dados. A carreira continua aberta.",
      true,
    );
    return;
  }
  stopTimer();
  state = E.prepareCareer(E.fresh());
  loadError = false;
  pendingImport = null;
  paused = false;
  page = "Visão geral";
  setupProfile = { name: "", age: 35, nationality: "Brazil" };
  setupLeague = "br";
  setupClub = "br-0";
  setupMode = "normal";
  competition = "";
  $("#save-dialog").close();
  render();
  notify("Carreira excluída. Você pode começar outra ou importar um arquivo.");
}
function importCareer() {
  if (!pendingImport) return;
  try {
    const old = localStorage.getItem(KEY),
      encoded = encodeSave(pendingImport);
    if (old) localStorage.setItem("club-legacy-import-backup", old);
    localStorage.setItem(KEY, encoded);
  } catch {
    notify(
      "Não houve espaço para importar e preservar uma cópia do save atual. Exporte sua carreira antes de liberar espaço.",
      true,
    );
    return;
  }
  stopTimer();
  state = pendingImport;
  pendingImport = null;
  loadError = false;
  paused = Boolean(state.live && !state.live.done);
  simulateAmount = state.advancePreference?.amount || 1;
  simulateUnit = state.advancePreference?.unit || "days";
  competition = "";
  marketPage = 0;
  ledgerPage = 0;
  page = state.rosterRecovery ? "Carreira" : "Visão geral";
  $("#save-dialog").close();
  render();
  notify(
    paused
      ? "Carreira importada. A partida está pausada em Dia de jogo."
      : "Carreira importada e salva neste navegador.",
  );
}
$("#import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    if (file.size > LegacySaves.MAX_BYTES)
      throw Error("O arquivo excede o limite de 30 MB.");
    const imported = LegacySaves.parse(await file.text());
    pauseForSaveDialog();
    pendingImport = imported;
    showSaveDialog(
      `<h2>Importar carreira?</h2><p><strong>${esc(imported.profile.name)}</strong> · ${esc(imported.teams.find((t) => t.id === imported.clubId)?.name || "Carreira ainda não iniciada")} · ${esc(E.date(imported))}</p><p>${state.clubId ? "Sua carreira atual será substituída. Baixe uma cópia se quiser mantê-la." : "O arquivo será carregado neste navegador."}</p><div class="row">${state.clubId ? btn("Baixar carreira atual", "export-save") : ""}${btn("Cancelar", "cancel-save-dialog")}${btn("Confirmar importação", "confirm-import", "", "primary")}</div>`,
    );
  } catch (e) {
    notify(e.message, true);
  }
});

render();
if (loadError)
  notify(
    "Não foi possível carregar sua carreira. Os dados existentes foram preservados. Nenhum novo progresso será salvo sobre eles.",
    true,
  );
if (state.live && !state.live.done) {
  paused = true;
  render();
  notify("Partida recuperada. Entre em Dia de jogo e clique em Retomar.");
}
