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
let managerScope = "club",
  appearanceKey = "",
  navigationReady = false,
  sidebarIdentityKey = "";
function appearanceTeam() {
  if (!state.clubId) return team(setupClub);
  const job = state.national?.job;
  if (!job) managerScope = "club";
  const match =
    state.live?.offset === state.today ? state.live : E.nextFixture(state);
  const national =
    job &&
    (page === "Seleções" ||
      (page === "Elenco" && tacticalScope === "national") ||
      (page === "Dia de jogo" && match?.kind === "national") ||
      (managerScope === "national" &&
        ["Calendário", "Carreira", "Troféus", "Salvamentos"].includes(page)));
  return national ? team(job) : team();
}
function applyAppearance() {
  const club = appearanceTeam(),
    colors = A.clubColors(club),
    key = `${theme}|${club?.id}|${club?.name}|${colors.primary}|${colors.secondary}`;
  if (key === appearanceKey) return;
  appearanceKey = key;
  document.documentElement.dataset.theme = theme;
  document.body.dataset.club = state.clubId || setupClub;
  document.body.dataset.identity = club?.id || "";
  document.body.dataset.scope = club?.isNational ? "national" : "club";
  const vars = A.themeTokens(colors, theme);
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
let advancing = false,
  cancelAdvance = false;
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
  matchMode = state.live?.mode || "2d",
  timer = null,
  speed = state.matchPreferences?.speed || 900,
  paused = false;
const pages = [
  "Visão geral",
  "Jornal",
  "Elenco",
  "Treinamento",
  "Transferências",
  "Olheiros",
  "Categorias de base",
  "Competições",
  "Troféus",
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
function badge(t, size = "medium") {
  const src = LegacyBadges.asset(t),
    colors = A.clubColors(t);
  return `<span class="team-badge badge-${size}" data-badge="${esc(t?.name || "A definir")}" data-loaded="${Boolean(src)}" style="--badge-primary:${colors.primary};--badge-secondary:${colors.secondary}"><svg class="badge-fallback" viewBox="0 0 40 48" aria-hidden="true"><path d="M3 3h34v23c0 10-17 19-17 19S3 36 3 26Z" fill="var(--badge-primary)" stroke="var(--badge-secondary)" stroke-width="3"/><path d="m11 19 9-6 9 6-4 12H15Z" fill="var(--badge-secondary)"/></svg>${src ? `<img src="${esc(src)}" alt="${t?.isNational || t?.id?.startsWith("nt-") ? "Bandeira" : "Escudo"} de ${esc(t.name)}" width="64" height="64" decoding="async" draggable="false">` : ""}</span>`;
}
function teamLabel(id, size = "small") {
  const t = team(id);
  return `<span class="team-label">${badge(t, size)}<span>${esc(t?.name || "A definir")}</span></span>`;
}
document.addEventListener(
  "error",
  (event) => {
    const image = event.target;
    if (image instanceof HTMLImageElement && image.closest(".team-badge")) {
      image.closest(".team-badge").dataset.loaded = "false";
      image.remove();
    }
  },
  true,
);
const navigationGroups = [
  ["DIA A DIA", ["Visão geral", "Jornal", "Calendário"]],
  [
    "FUTEBOL",
    [
      "Elenco",
      "Treinamento",
      "Transferências",
      "Olheiros",
      "Categorias de base",
    ],
  ],
  ["COMPETIÇÕES", ["Competições", "Troféus", "Seleções"]],
  ["GESTÃO", ["Carreira", "Clube", "Financeiro", "Salvamentos"]],
];
const navigationPaths = {
  "Visão geral":
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  Jornal:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h4v4H7Zm8 0h2M15 12h2M7 16h10"/>',
  Calendário:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-14 4h3m4 0h3"/>',
  Elenco:
    '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m3-17a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 4v3"/>',
  Treinamento: '<path d="m4 20 8-17 8 17H4Zm-1 0h18M8 13h8"/>',
  Transferências: '<path d="M3 7h17m-5-5 5 5-5 5M21 17H4m5-5-5 5 5 5"/>',
  Olheiros:
    '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6m-14-11h6m-3-3v6"/>',
  "Categorias de base":
    '<path d="M12 21V10m0 4C3 14 3 5 3 5c9 0 9 9 9 9Zm0-3c0-8 9-8 9-8s0 8-9 8Z"/>',
  Competições:
    '<path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm0 2H3v3a5 5 0 0 0 5 5m8-8h5v3a5 5 0 0 1-5 5m-4 1v6m-4 1h8"/>',
  Troféus: '<path d="m12 3 3 6 6 1-4.5 4.5L18 21l-6-3-6 3 1.5-6.5L3 10l6-1Z"/>',
  Seleções:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a20 20 0 0 1 0 18 20 20 0 0 1 0-18Z"/>',
  Carreira:
    '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12a25 25 0 0 0 18 0m-9 0v4"/>',
  Clube: '<path d="M4 21V10l8-7 8 7v11H4Zm5 0v-7h6v7"/>',
  Financeiro:
    '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-6 5h3m-11 3h4"/>',
  Salvamentos: '<path d="M4 3h13l4 4v14H3V3h1Zm3 0v6h10V3M7 21v-8h10v8"/>',
};
function renderNavigation() {
  const nav = $("#nav");
  if (!navigationReady || !nav.children.length) {
    nav.innerHTML = navigationGroups
      .map(
        ([label, items]) =>
          `<div class="nav-group"><small class="nav-group-label">${label}</small>${items.map((p) => `<button data-page="${p}"><svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${navigationPaths[p]}</svg><span class="nav-label">${p}</span></button>`).join("")}</div>`,
      )
      .join("");
    navigationReady = true;
  }
  nav.querySelectorAll("button[data-page]").forEach((button) => {
    const active = button.dataset.page === page;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const t = appearanceTeam(),
    job = state.national?.job && team(state.national.job),
    key = `${t.id}|${t.name}|${job?.id}|${team().name}`;
  if (key === sidebarIdentityKey && $("#sidebar-club")) return;
  sidebarIdentityKey = key;
  let identity = $("#sidebar-club");
  if (!identity) {
    identity = document.createElement("section");
    identity.id = "sidebar-club";
    nav.before(identity);
  }
  identity.className = "sidebar-identity";
  identity.innerHTML = `<div class="sidebar-club">${badge(t, "identity")}<div><small>${t.isNational ? "SELEÇÃO PRINCIPAL" : "SEU CLUBE"}</small><strong>${esc(t.name)}</strong><span>${t.isNational ? "Carreira internacional" : esc(E.league(state, t.leagueId).country)}</span></div></div>${job ? `<div class="workspace-switch" role="group" aria-label="Equipe em gestão"><button data-action="workspace" data-id="club" aria-pressed="${!t.isNational}">${badge(team(), "tiny")}<span>Clube</span></button><button data-action="workspace" data-id="national" aria-pressed="${Boolean(t.isNational)}">${badge(job, "tiny")}<span>Seleção</span></button></div>` : ""}`;
}
function notify(message, error = false) {
  const n = $("#notification");
  n.textContent = message;
  n.className = error ? "notice error" : "notice";
  n.hidden = false;
}
const autosaver = LegacyAutosave.create({
  getState: () => state,
  write: (encoded) => {
    if (!loadError && state.clubId) localStorage.setItem(KEY, encoded);
  },
  onStatus: (value) => {
    if ($("#save-status")) $("#save-status").textContent = value;
  },
  onError: () =>
    notify(
      "Não foi possível salvar. Exporte a carreira e verifique o espaço do navegador.",
      true,
    ),
});
function persist() {
  if (loadError) {
    notify(
      "O salvamento anterior está protegido. Exporte uma cópia antes de substituir os dados.",
      true,
    );
    return false;
  }
  return autosaver.flush();
}
function scheduleSave() {
  if (!loadError && state.clubId) autosaver.request();
}
function act(fn, save = true) {
  try {
    $("#notification").hidden = true;
    if (advancing)
      throw Error("Aguarde o avanço do calendário ou use Parar avanço.");
    fn();
    if (save) scheduleSave();
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
  const match = E.currentMatch(state),
    showMatch = match.available;
  $("#match-day").hidden = !showMatch;
  if (page === "Dia de jogo" && !showMatch && !state.live?.done)
    page = "Visão geral";
  $("#time-controls").hidden = page !== "Visão geral" || match.active;
  $("#time-controls").innerHTML = page === "Visão geral" ? timeControls() : "";
  renderNavigation();
  $("#title").textContent = page;
  $("#content").innerHTML = views[page]();
  $("#context").textContent =
    `${appearanceTeam().name} · ${E.date(state)}${state.mode === "test" ? " · MODO TESTE" : ""}`;
  if (page === "Financeiro") updateBudgetPreview();
  if (page === "Dia de jogo" && state.live) draw();
  showCelebration();
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
  )}</select><label for="start-club">Seu primeiro clube</label><select id="start-club">${clubOptions}</select><div class="club-preview">${badge(chosen, "large")}<div><strong>${esc(chosen.name)}</strong><span>${esc(l.name)}</span><small>Caixa inicial estimado · ${money(chosen.money)}</small><small>${chosen.players.length} profissionais reais confirmados</small></div></div>${rosterReferenceView(chosen)}${chosen.players.length < 11 ? '<p class="notice">A fonte ainda não tem onze atletas confirmados para este clube. Escolha outro clube ou liga.</p>' : ""}${startButton}<p class="entry-save-note">Sua carreira será salva neste navegador. Exporte um arquivo para guardar uma cópia.</p><button data-action="import-save">Importar carreira salva</button>${loadError ? '<button class="danger" data-action="delete-save">Excluir dados ilegíveis</button>' : ""}</section></div><div class="entry-bottom"><span>SEU CLUBE. SUA HISTÓRIA.</span><span>Dias e semanas · Texto ou 2D · Sem instalação</span></div>${dataNotice()}`;
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
    return `<div class="time-panel"><div><small>TEMPORADA ${state.season} ENCERRADA</small><strong>Planeje o próximo ano</strong></div><button data-page="Carreira">Propostas de trabalho</button>${btn("Avançar 1 dia de planejamento", "planning-day")}${btn("Iniciar temporada " + (state.season + 1), "next-season", "", "primary")}</div>`;
  return `<div class="time-panel"><div><small>CALENDÁRIO DA CARREIRA</small><strong>${esc(E.date(state))}</strong><p>${todayMatch ? "Hoje: " + matchup(todayMatch) : upcoming ? "Próximo jogo: " + E.formatDate(state, upcoming.offset) + " · " + matchup(upcoming) : "Sem partida confirmada."}</p></div><form id="simulation-form"><label>Avançar<input id="simulate-amount" type="number" min="1" max="52" value="${simulateAmount}" required></label><label>Período<select id="simulate-unit">${options(
    [
      ["days", "Dias"],
      ["weeks", "Semanas"],
    ],
    simulateUnit,
  )}</select></label><button class="primary" ${advancing ? "disabled" : ""}>Simular período</button></form>${advancing ? '<div class="advance-status" id="simulation-progress" role="status">Avançando um dia de cada vez…</div><button data-action="stop-advance">Parar avanço</button>' : ""}${todayMatch ? '<button data-page="Dia de jogo">Jogar hoje →</button>' : ""}</div>`;
}
const metric = (title, value, subtitle) =>
  `<div class="card"><small>${title}</small><div class="metric">${value}</div><span class="muted">${subtitle}</span></div>`;
function standings(rows) {
  return `<div class="table-wrap"><table><thead><tr><th>#</th><th>CLUBE</th><th>PTS</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr></thead><tbody>${E.rank(
    rows,
  )
    .map(
      (t, i) =>
        `<tr class="${t.id === state.clubId ? "mine" : ""}"><td>${i + 1}</td><td>${teamLabel(t.id)}</td><td><strong>${t.p}</strong></td><td>${t.w + t.d + t.l}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf - t.ga}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
function playersTable(ps, context = "squad") {
  return `<div class="table-wrap"><table><thead><tr><th>JOGADOR</th><th>POS.</th><th>IDADE</th><th>GERAL</th><th>VALOR</th><th title="Preparo físico: varia com minutos, intensidade e recuperação">CONDIÇÃO ⓘ</th><th>SALÁRIO EST./SEM.</th><th>CONTRATO</th><th>AÇÕES</th></tr></thead><tbody>${ps.map((p) => `<tr><td>${p.shirtNumber ? `<span class="shirt-number" title="Número do uniforme na carreira">${p.shirtNumber}</span>` : ""}<strong>${esc(p.name)}</strong><span class="sub">${esc(playerReference(p))}<span class="sub">${esc((p.nationalities?.length ? p.nationalities : [p.nationality]).map(countryLabel).filter(Boolean).join(" / ") || "Nacionalidade indisponível")}</span>${context === "market" ? " · " + esc(p.sellerName) : ""}</span></td><td>${esc(p.naturalPositions?.length ? p.naturalPositions.join(" / ") : p.pos)}${p.secondaryPositions?.length ? `<small class="sub">Também: ${esc(p.secondaryPositions.join(" / "))}</small>` : ""}${p.positionEstimated ? " · est." : ""}</td><td>${playerAge(p)}</td><td><span class="rating" title="${esc(p.ratingSource || "Estimativa do jogo")}">${p.ovr}</span></td><td>${money(p.price)}</td><td>${p.injury ? `Lesão · ${p.injury} dias` : `<span class="condition-meter ${p.fitness < 75 ? "tired" : p.fitness < 90 ? "wear" : "ready"}"><strong>${p.fitness}%</strong><i style="width:${p.fitness}%"></i><small>${p.fitness >= 90 ? "Pronto" : p.fitness >= 75 ? "Desgastado" : "Cansado"}</small></span>`}</td><td>${money(p.salary)}</td><td>${p.contract}${p.contractEstimated ? " · est." : ""}<small class="sub">${esc(E.SQUAD_ROLES[p.squadRole] || "Papel a negociar")}</small></td><td>${context === "squad" ? btn("Renovar", "renew", p.id) + btn("Vender", "sell", p.id) + btn("Camisa " + p.shirtNumber, "edit-shirt", p.id) : context === "youth" ? btn("Promover · R$ 100 mil", "promote", p.id) : btn("Negociar", "buy", p.id)}</td></tr>`).join("")}</tbody></table></div>${ps.length ? "" : '<p class="muted">Nenhum jogador encontrado.</p>'}`;
}
function matchup(f, goals) {
  return `<span class="matchup">${teamLabel(f.pair[0])}<strong>${goals ? goals.join(" × ") : "×"}</strong>${teamLabel(f.pair[1])}</span>`;
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
    return `<div class="hero"><span class="badge">TEMPORADA ${state.season} · ${esc(E.date(state))}</span><h2 class="identity-title">${badge(t, "large")}<span>${esc(t.name)}</span></h2><p>${next ? esc(next.name) + " · " + matchup(next) : d ? "Data sem partida do seu clube. Acompanhe os outros resultados." : "A temporada terminou. Confira os títulos e as propostas para sua carreira."}</p>${next || E.currentMatch(state).active ? '<button class="primary" data-page="Dia de jogo">Central da partida →</button>' : '<button data-page="Calendário">Ver calendário →</button>'}</div><div class="grid">${metric("CAIXA DO CLUBE", money(t.money), "Folha semanal estimada: " + money(t.players.reduce((a, p) => a + p.salary, 0)))}${metric("POSIÇÃO NA LIGA", pos + "º", esc(E.league(state, t.leagueId).name))}${metric("FORÇA DO TIME", Math.round(E.strength(t)), "Reputação do treinador: " + state.reputation)}</div><div class="columns"><div class="card"><div class="row"><h3>Notícias do clube e do mundo</h3><button data-page="Jornal">Abrir jornal →</button></div>${state.news
      .slice(0, 8)
      .map((n) => `<p>${esc(n)}</p>`)
      .join(
        "",
      )}</div><div class="card"><h3>Identidade de jogo</h3><label>Estratégia<select id="tactic">${options(
      ["Equilibrado", "Ofensivo", "Defensivo"].map((x) => [x, x]),
      state.tactic,
    )}</select></label><p class="muted">Ofensivo aumenta o ritmo e o risco para ambos os lados. Defensivo diminui as oportunidades.</p><h3>Último resultado</h3><p>${state.last ? matchup(state.last, state.last.goals) : "Sua história está começando."}</p></div></div>${upcomingStrip()}${negotiationOverview()}${invitationSummary()}${dataNotice()}`;
  },
  Elenco: () => squadView(),
  Treinamento: () => trainingView(),
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
    return `${windowBanner()}${negotiationsView()}<div class="card"><div class="row"><h3>Mercado mundial</h3><span class="pill">Janela ${E.windowOpen(state) ? "aberta" : "fechada"}</span></div><p class="muted">Negocie o valor da transferência, salário e duração. Salário, luvas, duração e importância no elenco são negociáveis. As datas de registro e a contagem da janela aparecem acima.</p>${marketFiltersView()}${playersTable(all.slice(marketPage * 20, marketPage * 20 + 20), "market")}<div class="row">${btn("← Anterior", "market-prev")}<span>${all.length} atletas · página ${marketPage + 1} / ${Math.max(1, Math.ceil(all.length / 20))}</span>${btn("Próxima →", "market-next")}</div></div><div class="card"><h3>Últimas transferências</h3>${
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
        : `<h3>${esc(c.name)}</h3><p class="muted">${c.entrants.length} clubes · ${c.region === "sa" ? "8 grupos de 4, seis jogos por clube. Os dois melhores de cada grupo avançam." : "Fase de liga com " + c.stageGames + " jogos por clube. Top 8 direto às oitavas; 9º a 24º disputam playoffs."} Mata-mata em jogo único.</p>${c.champion ? `<div class="hero"><span class="badge">CAMPEÃO</span><h2 class="identity-title">${teamLabel(c.champion, "large")}</h2></div>` : ""}${c.region === "sa" ? c.groups.map((g, i) => `<h3>Grupo ${String.fromCharCode(65 + i)}</h3>${standings(c.table.filter((t) => g.includes(t.id)))}`).join("") : standings(c.table)}${c.rounds
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
    calendarView === "reference" ? referenceCalendar() : careerCalendarView(),
  Olheiros: () => scoutingView(),
  Troféus: () => trophyRoom(),
  Carreira: () =>
    `${profileView()}${careerModeView()}${state.rosterRecovery ? '<div class="notice">O elenco deste clube está incompleto na fonte real. Escolha uma das propostas abaixo para continuar em um clube com atletas confirmados. O salvamento anterior está preservado.</div>' : ""}${state.legacyArchive ? `<details class="notice"><summary>Arquivo da carreira anterior</summary><p>${esc(state.legacyArchive.club)} · ${state.legacyArchive.season} · rodada ${state.legacyArchive.week}</p><div class="table-wrap"><table><tr><th>CLUBE ORIGINAL</th><th>PTS</th><th>J</th><th>SG</th></tr>${state.legacyArchive.table.map((t) => `<tr><td>${esc(t.name)}</td><td>${t.p}</td><td>${t.w + t.d + t.l}</td><td>${t.gf - t.ga}</td></tr>`).join("")}</table></div></details>` : ""}<div class="hero"><span class="badge">SEU CAMINHO NO FUTEBOL</span><h2 class="identity-title">${badge(team(), "large")}<span>${esc(team().name)}</span></h2><p>Reputação ${state.reputation} · Contrato de treinador até ${state.coaches.find((c) => c.id === "you")?.contract}. Ofertas de outros clubes chegam ao fim da temporada.</p></div><div class="card"><h3>Propostas para você</h3>${state.offers.map((o) => `<div class="row"><div><strong>${teamLabel(o.clubId, "medium")}</strong><p class="muted">${esc(E.league(state, team(o.clubId).leagueId).country)} · ${o.years} temporadas · Caixa ${money(team(o.clubId).money)}</p></div>${btn("Aceitar proposta", "change-club", o.clubId)}</div>`).join("") || '<p class="muted">Nenhuma proposta disponível no momento.</p>'}<p class="muted">Ao mudar de clube, você assume o elenco e o caixa do destino. O patrimônio pertence ao clube.</p></div><div class="card"><h3>Movimentações de treinadores</h3>${
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
  "Dia de jogo": () => matchView(),
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
  scouting: "Olheiros e observação",
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
  if (tacticalScope === "national" && state.national.job) {
    const t = team(state.national.job);
    return `<div class="hero"><span class="badge">GRUPO CONVOCADO</span><h2 class="identity-title">${badge(t, "large")}<span>${esc(t.name)} · ${t.players.length} atletas</span></h2><p>Acompanhe os jogadores chamados para defender a seleção.</p><button data-page="Seleções">Gerenciar convocação →</button></div><div class="card"><h3>Convocados</h3><div class="table-wrap"><table><thead><tr><th>JOGADOR</th><th>POSIÇÃO</th><th>IDADE</th><th>GERAL</th><th>CONDIÇÃO</th></tr></thead><tbody>${t.players.map((p) => `<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.naturalPositions?.join(" / ") || p.pos)}</td><td>${playerAge(p)}</td><td><span class="rating">${p.ovr}</span></td><td>${p.injury ? "Lesionado" : p.fitness + "%"}</td></tr>`).join("")}</tbody></table></div></div>`;
  }
  return `<div class="hero"><span class="badge">PLANTEL PROFISSIONAL</span><h2>${esc(team().name)} · ${team().players.length} jogadores</h2><p>Consulte posições, preparo físico, valores e salários. Condição é a energia para jogar: 90–100% indica boa recuperação, 75–89% indica desgaste e abaixo de 75% pede atenção ao descanso. Ela varia com minutos, resistência, idade e intensidade.</p></div><div class="card"><h3>Jogadores e contratos</h3>${rosterReferenceView(team())}<p class="muted">Renovações têm resposta do empresário, contrapropostas e assinatura. Negocie salário, luvas, duração e importância; o contrato vigente só muda após o acordo.</p>${playersTable(team().players)}</div>`;
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
  return `<div class="hero"><span class="badge">VESTIÁRIO E TÁTICAS</span><h2 class="identity-title">${badge(t, "large")}<span>${esc(t.name)} · ${esc(plan.formation)}</span></h2><p>Clique em uma posição do campo e escolha quem joga ali. Você também pode arrastar um atleta para o local desejado. Trocar dois titulares preserva os onze jogadores. O número no campo é o overall efetivo naquele local.</p></div><div class="card"><div class="row tactical-toolbar"><label>Equipe<select id="tactical-scope">${options(scopes, tacticalScope)}</select></label><label>Formação<select id="formation">${options(
    Object.keys(T.formations).map((f) => [f, f]),
    plan.formation,
  )}</select></label>${btn("Escalação automática", "auto-lineup")}<span class="muted">Alterações salvas automaticamente</span></div><div class="tactical-workspace"><div class="tactical-board"><div class="attack-direction">↑ DIREÇÃO DO ATAQUE</div><div class="tactics-pitch" aria-label="Campo tático; escolha uma posição">${slots
    .map((s, i) => {
      const p = eleven[i],
        fit = p ? T.fit(p, s) : 0,
        role = T.role(t, i),
        suitability = p ? T.adaptation(p, s) : null;
      return `<button class="tactic-slot ${i === tacticalSlot ? "selected" : ""} ${fit < 0.85 ? "adapted" : ""}" style="left:${Math.min(90, Math.max(10, s.x))}%;top:${s.y}%" data-action="select-tactical-slot" data-id="${i}" data-tactic-slot="${i}" ${p ? `draggable="true" data-drag-player="${esc(p.id)}"` : ""} aria-label="${esc(s.label)}: ${esc(p?.name || "Sem atleta")}${suitability ? " · " + esc(suitability.label) + " · overall " + suitability.effective : ""}"><span class="slot-position">${esc(s.label)}</span><strong>${esc(p?.name || "Vaga aberta")}</strong><small>${p ? `${suitability.effective} · ${p.fitness}%${specialists.captain?.id === p.id ? " · C" : ""}` : "Escolher atleta"}</small><span class="slot-fit">${suitability ? esc({ "Fora da posição": "Fora", "Posição geral": "Geral", Adaptado: "Adap.", Secundária: "Sec." }[suitability.label] || suitability.label) + (suitability.penalty ? " −" + suitability.penalty + "%" : "") : ""}</span><span class="slot-duty">${esc(role.duty)}</span></button>`;
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
    <div class="news-grid">${articles.map((a, i) => `<article class="news-article ${i === 0 ? "news-featured" : ""}" data-article="${esc(a.id)}" data-clubs="${esc(a.clubIds.join(" "))}"><div class="article-meta"><span>${newsCategories[a.category] || "Clube"}</span><time>${esc(E.formatDate({ ...state, season: a.season }, a.offset ?? E.calendar()[a.day]?.offset ?? 0))}</time></div><h3>${esc(a.title)}</h3>${a.body ? `<p>${esc(a.body)}</p>` : ""}<div class="article-clubs">${a.clubIds.map((id) => teamLabel(id, "tiny")).join("")}</div></article>`).join("") || '<div class="news-empty"><h3>Nenhuma notícia nesta editoria</h3><p class="muted">Escolha outra editoria ou avance a carreira para acompanhar novos acontecimentos.</p></div>'}</div></section>`;
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
let activeReplay = null;
let animatingPlay = false,
  visualGeneration = 0,
  liveScoreHold = null;
function matchView() {
  const m = state.live,
    f = E.nextFixture(state) || m;
  if (!f)
    return '<div class="card"><h3>Sem partida nesta data.</h3><button data-page="Visão geral">Voltar à carreira</button></div>';
  const playing = m && !m.done,
    half = playing && m.minute === 45 && !m.secondHalfStarted;
  const controls = m?.done
    ? btn("Continuar carreira →", "continue", "", "primary")
    : playing
      ? `${half ? btn("Iniciar segundo tempo", "second-half", "", "primary") : btn(paused ? "Retomar" : "Pausar", "pause")}${btn("Concluir partida", "instant")}<label>Ritmo<select id="speed">${options(
          [
            [400, "Rápido"],
            [900, "Normal"],
            [1600, "Calmo"],
            [120, "Muito rápido"],
          ],
          speed,
        )}</select></label>`
      : btn("Iniciar partida", "play", "", "primary");
  const side = m?.pair.indexOf(
      m.kind === "national" ? state.national.job : state.clubId,
    ),
    plan = m?.plans?.[side],
    t = side >= 0 ? team(m.pair[side]) : null,
    used = new Set(
      m?.substitutions?.filter((x) => x.side === side).map((x) => x.outId) ||
        [],
    ),
    starters = new Set(plan?.starters.map((p) => p.id) || []);
  const bench =
    t?.players.filter(
      (p) => !p.injury && !starters.has(p.id) && !used.has(p.id),
    ) || [];
  return `<section class="match-centre"><header class="match-heading"><span class="badge">${esc(f.name)}</span><div id="match-minute">${m ? m.minute + "’" : "PRÉ-JOGO"} · ${half ? "INTERVALO" : m?.done ? "ENCERRADO" : m?.secondHalfStarted || m?.minute > 45 ? "SEGUNDO TEMPO" : "PRIMEIRO TEMPO"}</div><div class="score">${matchup(f, m?.goals || [0, 0])}</div><div class="match-progress"><i style="width:${m?.minute || 0}%"></i></div></header><div class="match-controls">${controls}<label>Visualização<select id="mode">${options(
    [
      ["2d", "Campo 2D"],
      ["text", "Relato e estatísticas"],
    ],
    matchMode,
  )}</select></label></div><div class="match-workspace"><div><div id="event-announcement" class="goal-announcement" aria-live="assertive"></div><div class="play-caption" id="play-caption" aria-live="polite">${half ? "Intervalo: faça os ajustes e inicie o segundo tempo." : m?.done ? "Fim de jogo. Confira os melhores momentos." : "Acompanhe a bola e a construção das jogadas."}</div><div id="field"></div><p class="muted">${half ? "O relógio está parado no intervalo." : playing && paused ? "Partida pausada." : "O lance desacelera nas finalizações; o placar atualiza quando a bola chega ao gol."}</p><div class="match-stats" id="stats"></div>${m?.goalReplays?.length ? `<div class="card"><h3>Gols e replays</h3><div class="row">${m.goalReplays.map((p, i) => btn(`${p.minute}’ · ${esc(p.playerName)}`, "replay-goal", String(i))).join("")}</div></div>` : ""}</div><aside><section class="card"><h3>Relato da partida</h3><div class="log" id="log" aria-live="off"></div></section></aside></div>${
    plan && playing
      ? `<section class="card"><h3>Banco do treinador</h3><p>${(m.substitutions || []).filter((x) => x.side === side).length} de 5 substituições. Pause para escolher a troca.</p><form id="substitution-form" class="substitution-form"><label>Sai<select name="out">${options(
          plan.starters.map((p) => [
            p.id,
            p.name + " · " + E.matchFitness(p, m, plan.fatigue) + "%",
          ]),
          plan.starters[0]?.id,
        )}</select></label><label>Entra<select name="in">${options(
          bench.map((p) => [
            p.id,
            p.name + " · " + p.ovr + " · " + p.fitness + "%",
          ]),
          bench[0]?.id,
        )}</select></label><button ${(!paused && !half) || !bench.length ? "disabled" : ""}>Fazer substituição</button></form></section>`
      : ""
  }${m?.plans ? `<details class="card"><summary>Escalações e condição física</summary>${m.plans.map((p) => `<h3>${esc(p.name)}</h3><div class="live-player-list">${p.starters.map((x) => `<span>${esc(x.name)}<small>${E.matchFitness(x, m, p.fatigue)}% · ${x.pos}</small></span>`).join("")}</div>`).join("")}</details>` : ""}<p class="muted">O campo ilustra os lances gerados pelo motor da partida. Condição é preparo físico: diminui com minutos e intensidade, e se recupera com descanso.</p></section>`;
}
function draw() {
  const m = state.live;
  if (!m) return;
  if (!m.plans) m.plans = E.matchPlans(state, m);
  const hold = liveScoreHold?.match === m ? liveScoreHold.goals : m.goals;
  if ($("#match-minute"))
    $("#match-minute").textContent =
      `${m.minute}’ · ${m.done ? "ENCERRADO" : m.minute === 45 && !m.secondHalfStarted ? "INTERVALO" : m.secondHalfStarted || m.minute > 45 ? "SEGUNDO TEMPO" : "PRIMEIRO TEMPO"}`;
  if ($(".score")) $(".score").innerHTML = matchup(m, hold);
  const possession = m.possession || [0, 0],
    sum = Math.max(1, possession[0] + possession[1]);
  if ($("#stats"))
    $("#stats").innerHTML =
      `<div><small>Finalizações</small><strong>${m.shots.join(" × ")}</strong></div><div><small>Posse de bola</small><strong>${Math.round((possession[0] / sum) * 100)}% × ${Math.round((possession[1] / sum) * 100)}%</strong></div>${m.penalties ? `<div><small>Pênaltis</small><strong>${m.penalties.join(" × ")}</strong></div>` : ""}`;
  if ($("#log")) {
    const events = m.events.filter(
      (e) =>
        !(
          liveScoreHold?.match === m &&
          e.startsWith(m.minute + "'") &&
          e.includes("GOL")
        ),
    );
    const key = events.join("|");
    if ($("#log").dataset.events !== key) {
      $("#log").innerHTML = events
        .map(
          (e) =>
            `<p class="${e.includes("GOL") ? "goal-commentary" : ""}">${esc(e)}</p>`,
        )
        .join("");
      $("#log").dataset.events = key;
    }
  }
  if ($(".match-progress i"))
    $(".match-progress i").style.width = (m.minute / 90) * 100 + "%";
  if (!$("#field")) return;
  if (m.mode !== "2d") {
    $("#field").innerHTML = "";
    return;
  }
  const newPitch = !$("#pitch");
  if (newPitch)
    $("#field").innerHTML =
      `<div class="pitch match-pitch" id="pitch"><div class="half"></div><div class="goal-net left"></div><div class="goal-net right"></div><svg class="play-trail" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline id="ball-trail" points=""/></svg>${Array.from({ length: 22 }, (_, i) => `<span class="dot ${i >= 11 ? "away" : ""}" id="dot-${i}">${(i % 11) + 1}</span>`).join("")}<span class="dot ball" id="ball" aria-label="Bola"></span></div>`;
  const shownPlay = activeReplay || m.lastPlay;
  const view = E.matchVisual(m, shownPlay);
  const kits = m.pair.map((id) => A.clubColors(team(id)));
  if (A.contrast(kits[0].primary, kits[1].primary) < 1.8)
    kits[1] = {
      primary:
        A.contrast(kits[0].primary, kits[1].secondary) >= 1.8
          ? kits[1].secondary
          : A.readable(kits[0].primary),
    };
  for (let i = 0; i < 22; i++)
    $("#dot-" + i).hidden = !view.positions.some(
      (p) => p.side * 11 + p.index === i,
    );
  view.positions.forEach((p) => {
    const dot = $("#dot-" + (p.side * 11 + p.index));
    dot.style.left = p.x + "%";
    dot.style.top = p.y + "%";
    dot.title = p.name;
    dot.textContent =
      p.shirtNumber ||
      m.plans[p.side].starters[p.index]?.shirtNumber ||
      p.index + 1;
    dot.dataset.name = p.name;
    dot.style.background = kits[p.side].primary;
    dot.style.color = A.readable(kits[p.side].primary);
    dot.classList.toggle("on-ball", p.id === shownPlay?.playerId);
  });
  if (!animatingPlay || newPitch) {
    const point = m.ballPosition || view.ball;
    $("#ball").style.left = point.x + "%";
    $("#ball").style.top = point.y + "%";
  }
}
const visualWait = (ms, token) =>
  new Promise((resolve) =>
    setTimeout(() => resolve(token === visualGeneration), ms),
  );
async function animatePlay(m, play, replay = false) {
  if (replay) activeReplay = play;
  const token = visualGeneration;
  animatingPlay = true;
  if (play.type === "goal" && !replay)
    liveScoreHold = {
      match: m,
      goals: m.goals.map((n, i) => (i === play.side ? n - 1 : n)),
    };
  draw();
  const step =
    play.type === "build-up"
      ? Math.max(180, Math.min(1200, speed * 0.8))
      : Math.max(600, Math.min(1400, speed));
  const path = play.path;
  const trail = $("#ball-trail");
  if (trail)
    trail.setAttribute("points", path.map((p) => p.x + "," + p.y).join(" "));
  for (let i = 0; i < path.length; i++) {
    if (token !== visualGeneration || state.live !== m) {
      animatingPlay = false;
      liveScoreHold = null;
      return;
    }
    const point = path[i],
      ball = $("#ball");
    m.ballPosition = { x: point.x, y: point.y };
    if ($("#play-caption"))
      $("#play-caption").textContent =
        i === path.length - 1
          ? play.type === "build-up"
            ? `${play.playerName} recebe e mantém a jogada.`
            : `${play.playerName} finaliza em ${play.detail}…`
          : `${point.name || play.playerName} ${i ? "recebe e prepara o passe." : "inicia a construção da jogada."}`;
    if (ball) {
      ball.style.transitionDuration =
        (i === path.length - 1 && play.type !== "build-up"
          ? Math.max(900, step)
          : step) + "ms";
      ball.style.left = point.x + "%";
      ball.style.top = point.y + "%";
    }
    const valid = await visualWait(
      i === path.length - 1 && play.type !== "build-up"
        ? Math.max(1000, step)
        : step,
      token,
    );
    if (!valid) {
      animatingPlay = false;
      liveScoreHold = null;
      return;
    }
  }
  liveScoreHold = null;
  draw();
  if (play.type === "goal") {
    const banner = $("#event-announcement");
    if (banner) {
      banner.className = "goal-announcement visible";
      banner.textContent = `GOOOL! ${play.playerName} · ${name(m.pair[play.side])} · ${play.minute}’`;
    }
    if ($("#play-caption"))
      $("#play-caption").textContent =
        `Gol de ${play.playerName}! A bola saiu do seu pé e entrou no gol.`;
    await visualWait(1600, token);
  } else if (play.type === "shot" && $("#play-caption"))
    $("#play-caption").textContent =
      `${play.playerName} tentou a finalização. O placar segue ${m.goals.join(" a ")}.`;
  animatingPlay = false;
}
function stopTimer() {
  if (timer) clearTimeout(timer);
  timer = null;
}
async function tick() {
  const m = state.live;
  if (!m || m.done || paused || animatingPlay) return;
  if (m.minute >= 90) {
    act(() => {
      E.advance(state);
      paused = false;
    });
    return;
  }
  const token = visualGeneration;
  if ($("#event-announcement"))
    $("#event-announcement").classList.remove("visible");
  activeReplay = null;
  E.minute(state, m);
  autosaver.markDirty();
  await animatePlay(m, m.lastPlay);
  if (token !== visualGeneration || state.live !== m) return;
  if (m.minute >= 90) {
    act(() => {
      E.advance(state);
      paused = false;
    });
    return;
  }
  if (m.minute === 45 && !m.secondHalfStarted) {
    paused = true;
    stopTimer();
    scheduleSave();
    render();
    notify("Intervalo. Faça os ajustes e clique em Iniciar segundo tempo.");
    return;
  }
  if (m.minute % 15 === 0) scheduleSave();
  if (page === "Dia de jogo" && paused) render();
  runTimer();
}
function runTimer() {
  stopTimer();
  if (state.live && !state.live.done && !paused && !animatingPlay)
    timer = setTimeout(tick, Math.max(50, speed * 0.25));
}

const negotiationLabels = {
  "club-pending": "Clube analisando",
  "club-counter": "Contraproposta do clube",
  "contract-ready": "Negociar contrato",
  "player-pending": "Jogador analisando",
  "player-counter": "Contraproposta do jogador",
  "medical-pending": "Exames e assinatura",
  "signature-pending": "Assinatura da renovação",
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
    `<article class="negotiation-card" data-negotiation="${esc(n.id)}"><div class="row"><h4>${esc(n.playerName)}</h4><span class="pill">${negotiationLabels[n.stage]}</span></div><p class="muted">${n.kind === "renewal" ? "Renovação com seu clube" : esc(n.sellerId ? name(n.sellerId) : "Sem clube") + " → " + esc(name(n.buyerId))}</p><ol class="negotiation-steps"><li class="${n.stage.startsWith("club-") ? "current" : ""}">1. Clube</li><li class="${["contract-ready", "player-pending", "player-counter"].includes(n.stage) ? "current" : ""}">2. Jogador</li><li class="${["medical-pending", "signature-pending", "blocked", "completed"].includes(n.stage) ? "current" : ""}">3. Assinatura</li></ol><p>${esc(n.message)}</p><p>Transferência: <strong>${money(n.fee)}</strong>${n.salary ? ` · ${money(n.salary)}/semana · ${n.years} temporadas · luvas ${money(n.bonus)}` : ""}</p>${n.dueOn ? `<p class="muted">Resposta prevista: <strong>${format(n.dueOn)}</strong>. Avance os dias em Visão geral.</p>` : n.expiresOn ? `<p class="muted">Prazo para responder: ${format(n.expiresOn)}.</p>` : ""}<div class="row">${n.stage === "club-counter" ? btn("Revisar proposta ao clube", "counter-club", n.id, "primary") : ""}${["contract-ready", "player-counter"].includes(n.stage) ? btn(n.stage === "contract-ready" ? "Negociar contrato" : "Revisar contrato", "offer-contract", n.id, "primary") : ""}${n.stage === "blocked" ? btn("Reavaliar recursos", "retry-negotiation", n.id, "primary") : ""}${E.negotiationActive(n) ? btn("Encerrar negociação", "cancel-negotiation", n.id) : ""}</div><details><summary>Histórico da negociação</summary>${n.history.map((h) => `<p><small>${format(h.date)}</small> · ${esc(h.message)}</p>`).join("")}</details></article>`;
  return `<section class="card" id="negotiations"><div class="row"><h3>Central de negociações</h3><span class="pill">${active.length} em andamento</span></div><p>Primeiro o clube, depois o jogador e o empresário. Cada resposta leva dois dias da carreira; após o acordo, exames e documentação levam mais um dia. A simulação para quando chega uma resposta.</p><p class="muted">O dinheiro só sai na assinatura. As propostas não reservam verba: mantenha caixa, limite de transferências e espaço salarial até a conclusão. O papel no elenco influencia as exigências do jogador. Não há contratação automática ao enviar a primeira oferta.</p>${active.length ? `<div class="negotiation-grid">${active.map(card).join("")}</div>` : '<p class="muted">Procure um jogador no mercado e envie sua primeira proposta.</p>'}${closed.length ? `<details><summary>Negociações encerradas (${closed.length})</summary>${closed.slice(0, 8).map(card).join("")}</details>` : ""}</section>`;
}
function parseOfferMoney(value) {
  let text = String(value ?? "").replace(/R\$|\s/g, "");
  if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
  return Number(text);
}
function openNegotiation(kind, id) {
  if (state.live && !state.live.done)
    throw Error("Conclua a partida antes de negociar.");
  const n = ["new", "renew"].includes(kind)
      ? null
      : state.negotiations.find((n) => n.id === id),
    p = [...state.teams.flatMap((t) => t.players), ...state.freeAgents].find(
      (p) => p.id === (n?.playerId || id),
    );
  if (!p) throw Error("Jogador indisponível.");
  const seller = state.teams.find((t) => t.players.some((x) => x.id === p.id)),
    a = E.scouting.advice(state, p, seller),
    renewal = kind === "renew" || n?.kind === "renewal",
    contract = kind === "player" || kind === "renew",
    ask = n?.askFee || a.askingFee;
  const input = (label, name, value, max = 10000000000000) =>
    `<label>${label}<div class="currency-input"><span>R$</span><input name="${name}" data-offer-money type="text" inputmode="decimal" required value="${Number(value).toLocaleString("pt-BR")}" aria-describedby="offer-estimate"></div></label>`;
  let fields = contract
    ? `${input("Salário por semana", "salary", n?.askSalary || (renewal ? Math.ceil(p.salary * 1.15) : a.salary))}${input("Luvas na assinatura", "bonus", n?.askBonus || (renewal ? Math.ceil(p.salary * 1.15) * 4 : a.bonus))}<div class="columns"><label>Temporadas<select name="years">${options(
        [1, 2, 3, 4, 5].map((v) => [v, v]),
        n?.askYears || (p.age >= 32 ? 2 : p.age < 24 ? 4 : 3),
      )}</select></label><label>Papel no elenco<select name="role">${options(Object.entries(E.SQUAD_ROLES), n?.role || p.squadRole || "rotation")}</select></label></div>`
    : seller
      ? `${input("Oferta ao clube", "fee", kind === "club" ? n.askFee : a.recommendedFee)}<div class="offer-presets"><button type="button" data-offer-preset="minimum">Abertura prudente</button><button type="button" data-offer-preset="recommended">Sugestão do olheiro</button><button type="button" data-offer-preset="ask">Pedido estimado</button></div>`
      : "<p>Atleta livre: não existe taxa de transferência. Inicie a conversa e siga para o contrato.</p>";
  $("#deal-form").innerHTML =
    `<header class="offer-heading"><div><span class="badge">${renewal ? "RENOVAÇÃO DO CONTRATO" : contract ? "CONVERSA COM O EMPRESÁRIO" : "MESA DE NEGOCIAÇÃO"}</span><h2>${esc(p.name)}</h2><p>${esc(seller?.name || "Sem clube")} · ${esc(p.naturalPositions?.join("/") || p.pos)} · ${playerAge(p)}${p.ageUnknown ? "" : " anos"}</p></div><span class="scout-rating">${p.ovr}<small>overall</small></span></header><ol class="offer-steps"><li class="${contract ? "" : "active"}">1. Clube</li><li class="${contract ? "active" : ""}">2. Jogador</li><li>3. Assinatura</li></ol><div class="offer-layout"><section>${fields}<p class="muted">${contract ? "O salário e as luvas fazem parte do custo do acordo. O empresário responderá em dois dias." : "O clube pode ceder, contrapropor ou recusar. A resposta chega em dois dias da carreira."}</p></section><aside class="offer-advice"><span class="badge">CONSELHO DO OLHEIRO</span><h3>${esc(a.level)}</h3><dl><dt>${renewal ? "Contrato atual" : contract ? "Taxa acordada" : "Pedido estimado"}</dt><dd>${renewal ? "Até " + p.contract : money(contract ? n?.fee || 0 : ask)}</dd>${contract ? `<dt>Salário de referência / semana</dt><dd>${money(n?.askSalary || (renewal ? Math.ceil(p.salary * 1.15) : a.salary))}</dd>` : `<dt>Abertura prudente a partir de</dt><dd>${money(Math.ceil(ask * 0.85))}</dd><dt>Limite atual para a taxa</dt><dd>${money(a.feeRoom)}</dd>`}</dl><p>${esc(contract ? "Considere duração, papel no elenco e o custo anual, além das luvas." : a.openingAdvice)}</p>${a.concerns
      .slice(0, 2)
      .map((c) => `<p class="offer-risk">${esc(c)}</p>`)
      .join(
        "",
      )}</aside></div><section id="offer-estimate" class="offer-estimate" aria-live="polite"></section><p id="offer-risk" class="offer-risk" aria-live="polite"></p><p id="deal-error" class="error" role="alert"></p><footer class="row"><button type="button" data-action="close-dialog">Cancelar</button><button class="primary">Enviar proposta</button></footer>`;
  function preview() {
    const f = new FormData($("#deal-form")),
      fee = contract ? n?.fee || 0 : seller ? parseOfferMoney(f.get("fee")) : 0,
      salary = contract ? parseOfferMoney(f.get("salary")) : a.salary,
      bonus = contract ? parseOfferMoney(f.get("bonus")) : a.bonus,
      valid = [fee, salary, bonus].every((v) => Number.isFinite(v) && v >= 0);
    $("#offer-estimate").innerHTML = valid
      ? `<div><small>${renewal ? "Salário atual / semana" : "Taxa de transferência"}</small><strong>${money(renewal ? p.salary : fee)}</strong></div><div><small>Luvas ${contract ? "" : "estimadas"}</small><strong>${money(bonus)}</strong></div><div><small>Saída na assinatura</small><strong>${money(fee + bonus)}</strong></div><div><small>Salários em um ano</small><strong>${money(salary * 52)}</strong></div>`
      : "<p>Revise os valores para calcular o pacote.</p>";
    $("#offer-risk").textContent = !valid
      ? "Informe valores válidos em reais."
      : !contract && seller && fee < ask * 0.65
        ? "Oferta muito baixa: a diretoria pode se irritar ou encerrar a conversa."
        : !contract && seller && fee < ask * 0.85
          ? "Oferta agressiva: existe maior risco de recusa."
          : fee > team().finance.transferBudget ||
              fee + bonus > team().money ||
              salary >
                team().finance.wageBudget -
                  E.finance.payroll(team()) +
                  (renewal ? p.salary : 0)
            ? "O pacote ultrapassa uma das verbas atuais. Confira o Financeiro."
            : "Faixa de negociação compatível com as verbas. O aceite ainda depende do clube e do jogador.";
  }
  $("#deal-form").oninput = preview;
  $("#deal-form").onclick = (event) => {
    const b = event.target.closest("[data-offer-preset]");
    if (!b) return;
    const values = {
      minimum: Math.ceil(ask * 0.85),
      recommended: Math.ceil(ask * 0.96),
      ask,
    };
    $("#deal-form [name=fee]").value =
      values[b.dataset.offerPreset].toLocaleString("pt-BR");
    preview();
  };
  $("#deal-form").onsubmit = (event) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    try {
      if (kind === "renew")
        E.proposeRenewal(
          state,
          p.id,
          parseOfferMoney(f.get("salary")),
          Number(f.get("years")),
          parseOfferMoney(f.get("bonus")),
          f.get("role"),
        );
      else if (kind === "new")
        E.negotiateClub(
          state,
          p.id,
          seller ? parseOfferMoney(f.get("fee")) : 0,
        );
      else if (kind === "club")
        E.counterClub(state, n.id, parseOfferMoney(f.get("fee")));
      else
        E.negotiatePlayer(
          state,
          n.id,
          parseOfferMoney(f.get("salary")),
          Number(f.get("years")),
          parseOfferMoney(f.get("bonus")),
          f.get("role"),
        );
      $("#deal").close();
      scheduleSave();
      render();
      notify(
        "Proposta enviada. Avance os dias e acompanhe a resposta na Central de negociações.",
      );
    } catch (error) {
      $("#deal-error").textContent = error.message;
    }
  };
  preview();
  $("#deal").showModal();
}
function openShirtDialog(id) {
  const players = [...team().players, ...team().youth],
    p = players.find((p) => p.id === id);
  if (!p) throw Error("Jogador indisponível.");
  $("#deal-form").innerHTML =
    `<header class="offer-heading"><div><span class="badge">IDENTIDADE DO ELENCO</span><h2>${esc(p.name)}</h2><p>Número do uniforme na carreira</p></div><span class="shirt-preview">${p.shirtNumber || "—"}</span></header><label>Novo número<input name="shirt" type="number" min="1" max="99" step="1" value="${p.shirtNumber || 1}" required></label><p class="muted">Um número só pode pertencer a um atleta do profissional ou da base.</p><p id="deal-error" class="error" role="alert"></p><div class="row"><button type="button" data-action="close-dialog">Cancelar</button><button class="primary">Confirmar número</button></div>`;
  $("#deal-form").oninput = null;
  $("#deal-form").onclick = null;
  $("#deal-form").onsubmit = (e) => {
    e.preventDefault();
    try {
      E.setShirtNumber(
        state,
        id,
        Number(new FormData(e.currentTarget).get("shirt")),
      );
      $("#deal").close();
      scheduleSave();
      render();
      notify("Número do uniforme atualizado.");
    } catch (error) {
      $("#deal-error").textContent = error.message;
    }
  };
  $("#deal").showModal();
}
function openDeal(kind, id) {
  if (kind === "renew") return openNegotiation("renew", id);
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
  $("#deal-form").oninput = null;
  $("#deal-form").onclick = null;
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
      scheduleSave();
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
    if (
      page === "Dia de jogo" &&
      nav.dataset.page !== page &&
      state.live &&
      !state.live.done
    ) {
      paused = true;
      stopTimer();
    }
    page = nav.dataset.page;
    if (
      [
        "Visão geral",
        "Jornal",
        "Treinamento",
        "Transferências",
        "Olheiros",
        "Categorias de base",
        "Competições",
        "Clube",
        "Financeiro",
      ].includes(page)
    )
      managerScope = "club";
    if (page === "Seleções" && state.national.job) managerScope = "national";
    if (page === "Elenco")
      tacticalScope = state.national.job ? managerScope : "club";
    if (page === "Calendário")
      calendarScope =
        managerScope === "national" && state.national.job
          ? "national"
          : "career";
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
  if (a === "workspace") {
    if (id === "national" && state.national.job) {
      managerScope = "national";
      tacticalScope = "national";
      page = "Seleções";
    } else if (id === "club") {
      managerScope = "club";
      tacticalScope = "club";
      page = "Visão geral";
    } else return;
    if (state.live && !state.live.done) {
      paused = true;
      stopTimer();
    }
    render();
    return;
  }
  if (
    a === "calendar-month" ||
    a === "calendar-select" ||
    a === "calendar-mode" ||
    a === "calendar-today" ||
    a === "scout-scope"
  ) {
    if (a === "calendar-month") {
      calendarMonth = Math.max(
        0,
        Math.min(11, (calendarMonth ?? 1) + Number(id)),
      );
      calendarSelected = Math.round(
        (Date.UTC(state.season, calendarMonth, 1) -
          Date.UTC(state.season, 1, 1)) /
          86400000,
      );
    }
    if (a === "calendar-select") calendarSelected = Number(id);
    if (a === "calendar-mode") calendarMode = id;
    if (a === "calendar-today") {
      calendarMonth = new Date(
        Date.UTC(state.season, 1, 1 + state.today),
      ).getUTCMonth();
      calendarSelected = state.today;
    }
    if (a === "scout-scope") scoutScope = id;
    render();
    return;
  }
  if (a === "close-celebration") {
    const trophy = state.trophies.find((t) => t.id === id);
    if (trophy) trophy.celebrated = true;
    $("#trophy-dialog").close();
    scheduleSave();
    render();
    return;
  }
  if (a === "stop-advance") {
    cancelAdvance = true;
    return;
  }
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
    if (
      state.live &&
      !state.live.done &&
      !["pause", "instant", "second-half", "replay-goal"].includes(a)
    )
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
        E.assumeNational(state, id);
        managerScope = "national";
        tacticalScope = "national";
        nationalQuery = "";
        nationalPage = 0;
        break;
      case "decline-national":
        E.national.decline(state, id);
        break;
      case "resign-national":
        if (state.live && !state.live.done)
          throw Error("Conclua a partida antes de deixar a seleção.");
        state.national.job = null;
        managerScope = "club";
        tacticalScope = "club";
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
      case "planning-day":
        E.advancePlanning(state);
        notify(
          "Planejamento avançou um dia. Negociações, olheiros e recuperação foram atualizados.",
        );
        break;
      case "next-season":
        calendarMonth = null;
        calendarSelected = null;
        E.nextSeason(state);
        page = "Visão geral";
        break;
      case "advance":
        E.advance(state);
        break;
      case "second-half":
        E.startSecondHalf(state);
        paused = false;
        render();
        runTimer();
        break;
      case "replay-goal": {
        if (animatingPlay)
          throw Error("Aguarde a jogada atual antes do replay.");
        const play = state.live?.goalReplays?.[Number(id)];
        if (!play) throw Error("Replay indisponível.");
        paused = true;
        stopTimer();
        animatePlay(state.live, play, true);
        break;
      }
      case "play":
        activeReplay = null;
        E.makeMatch(state, matchMode);
        paused = false;
        runTimer();
        break;
      case "pause":
        if (state.live.minute === 45 && !state.live.secondHalfStarted)
          throw Error("Use Iniciar segundo tempo para sair do intervalo.");
        paused = !paused;
        runTimer();
        break;
      case "instant":
        activeReplay = null;
        visualGeneration++;
        animatingPlay = false;
        liveScoreHold = null;
        stopTimer();
        state.live.secondHalfStarted = true;
        while (state.live.minute < 90) E.minute(state, state.live);
        E.advance(state);
        paused = false;
        break;
      case "continue":
        activeReplay = null;
        state.live = null;
        page = "Visão geral";
        break;
      case "edit-shirt":
        openShirtDialog(id);
        break;
      case "recover-tired":
        for (const p of [...team().players, ...team().youth])
          if (p.fitness < 85 || (p.fatigue || 0) > 40)
            E.setRecoveryPlan(state, p.id, "rest2");
        notify("Descanso programado para os jogadores desgastados.");
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
  }, !["select-tactical-slot", "market-prev", "market-next", "market-clear", "national-prev", "national-next", "news-scope", "reference-calendar", "career-calendar", "close-dialog", "pause", "reset-budget", "buy", "sell", "renew", "edit-shirt"].includes(a));
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
  if (el.id === "calendar-scope") {
    calendarScope = el.value;
    managerScope =
      calendarScope === "national" && state.national.job ? "national" : "club";
    render();
    return;
  }
  if (el.dataset.recoveryPlayer) {
    act(() => E.setRecoveryPlan(state, el.dataset.recoveryPlayer, el.value));
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
      scheduleSave();
      draw();
    }
    return;
  }
  if (el.id === "speed") {
    speed = Number(el.value);
    state.matchPreferences = { speed };
    scheduleSave();
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
    managerScope = tacticalScope;
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
  if (event.target.id === "substitution-form") {
    event.preventDefault();
    const f = new FormData(event.target);
    act(() => {
      if (!paused) throw Error("Pause a partida antes da substituição.");
      E.substitute(state, f.get("out"), f.get("in"));
      notify("Substituição realizada.");
    });
    return;
  }
  if (event.target.id === "scouting-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    act(() => {
      E.scouting.start(state, {
        scope: scoutScope,
        position: form.get("position"),
        maxFee: Number(form.get("maxFee")),
        maxAge: Number(form.get("maxAge") || 21),
      });
      notify("Olheiro enviado. Avance os dias para receber o relatório.");
    });
    return;
  }
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
    if (advancing) return;
    simulateAmount = Number($("#simulate-amount").value);
    simulateUnit = $("#simulate-unit").value;
    advancePeriod(simulateAmount, simulateUnit);
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
  if (!loadError && autosaver.dirty) persist();
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
function trainingView() {
  const t = team(),
    players = [...t.players, ...t.youth],
    next = E.upcomingFixture(state),
    average = Math.round(
      players.reduce((sum, p) => sum + p.fitness, 0) /
        Math.max(1, players.length),
    ),
    fatigue = Math.round(
      players.reduce((sum, p) => sum + (p.fatigue || 0), 0) /
        Math.max(1, players.length),
    );
  return `<div class="hero"><span class="badge">CIÊNCIA DO ESPORTE · CT NÍVEL ${t.facility}</span><h2>Treinar, competir, recuperar.</h2><p>Energia é o preparo físico disponível agora. Desgaste é a carga acumulada: demora mais para desaparecer e aumenta o risco de lesão. Minutos, resistência, idade e intensidade afetam cada jogador de forma diferente.</p><label>Plano geral de treino<select id="training">${options(
    ["Técnica", "Intensivo", "Recuperação"].map((v) => [v, v]),
    state.training,
  )}</select></label></div><div class="grid">${metric("ENERGIA MÉDIA", average + "%", "Recuperação e minutos jogados")}${metric("DESGASTE MÉDIO", fatigue + "%", "Quanto menor, melhor para suportar a sequência")}${metric("PRÓXIMO JOGO", next ? next.offset - state.today + " dia(s)" : "A confirmar", next ? E.formatDate(state, next.offset) : "Sem compromisso confirmado")}</div><section class="card"><div class="row"><div><h3>Plano individual de recuperação</h3><p class="muted">Descanso dispensa o treino, sem remover o jogador da escalação. Se ele jogar, o desgaste da partida continua valendo.</p></div>${btn("Descansar os desgastados por 2 dias", "recover-tired", "", "primary")}</div><div class="table-wrap"><table class="physical-table"><thead><tr><th>JOGADOR</th><th>ENERGIA</th><th>DESGASTE</th><th>RESISTÊNCIA</th><th>AMANHÃ, SEM JOGO</th><th>PLANO INDIVIDUAL</th><th>PREVISÃO COM DESCANSO</th></tr></thead><tbody>${players
    .map((p) => {
      const prediction = E.physical.preview(p, state.training, t.facility),
        days = E.physical.restEstimate(p, t.facility),
        selected = p.restDays ? "rest" + p.restDays : p.trainingPlan || "auto";
      return `<tr><td><strong>${esc(p.name)}</strong><small class="sub">${p.pos}${t.youth.includes(p) ? " · base" : ""}${p.injury ? " · lesão: " + p.injury + " dia(s)" : ""}</small></td><td><strong class="${p.fitness < 75 ? "physical-warning" : ""}">${p.fitness}%</strong></td><td><span class="${(p.fatigue || 0) > 55 ? "physical-warning" : ""}">${p.fatigue || 0}%</span></td><td>${p.stamina || 70}</td><td><strong>${prediction.energyGain >= 0 ? "+" : ""}${prediction.energyGain} energia</strong><small class="sub">${prediction.fatigueChange >= 0 ? "+" : ""}${prediction.fatigueChange} desgaste</small></td><td><select data-recovery-player="${esc(p.id)}" aria-label="Plano de ${esc(p.name)}">${options([["auto", "Automático / equipe"], ["normal", "Carga normal"], ["light", "Treino leve"], ...(!p.injury ? [["intense", "Treino intenso"]] : []), ...Array.from({ length: 7 }, (_, i) => ["rest" + (i + 1), "Descanso · " + (i + 1) + " dia(s)"])], selected)}</select></td><td>${days === 0 ? "Recuperado" : days > 7 ? "Mais de 7 dias" : days + " dia(s)"}<small class="sub">Sem novos jogos${p.injury ? "; lesão exige alta médica" : ""}</small></td></tr>`;
    })
    .join(
      "",
    )}</tbody></table></div><p class="muted">A previsão é uma estimativa da simulação para dias sem partida. O plano automático reduz a carga quando a energia está baixa ou o desgaste está alto. As lesões impedem o treino intenso.</p></section><section class="card"><h3>Departamento médico</h3>${
    players
      .filter((p) => p.injury)
      .map(
        (p) =>
          `<p>${esc(p.name)} · ${p.injury} dia(s) restantes · treino ajustado para recuperação.</p>`,
      )
      .join("") || '<p class="muted">Nenhum atleta lesionado.</p>'
  }</section>`;
}
function windowBanner() {
  const w = E.transferWindowInfo(state);
  return `<section class="window-banner ${w.open ? "open" : "closed"}"><div><span class="badge">MERCADO DE TRANSFERÊNCIAS</span><h3>${w.label}</h3><p>${w.open ? `${w.days === null ? "Planejamento da próxima temporada" : w.days + " dia(s) até o fechamento"}` : w.days === null ? "Próxima janela na temporada seguinte" : w.days + " dia(s) para abrir"}</p></div><div>${w.ranges.map(([a, b]) => `<span>${E.formatDate(state, a)} → ${E.formatDate(state, b)}</span>`).join("")}<small>Datas simuladas da carreira; regras unificadas entre ligas.</small></div></section>`;
}
let scoutScope = "market";
function scoutingView() {
  const data = E.scouting.ensure(state),
    missions = data.missions.filter(
      (m) => m.clubId === state.clubId && m.scope === scoutScope,
    ),
    reports = data.reports.filter(
      (r) => r.clubId === state.clubId && r.scope === scoutScope,
    ),
    report = reports[0];
  const lookup = new Map(
    [
      ...state.teams.flatMap((t) => [...t.players, ...t.youth]),
      ...state.freeAgents,
    ].map((p) => [p.id, p]),
  );
  const cards = (report?.players || [])
    .map((item) => {
      const p = lookup.get(item.playerId);
      if (!p) return "";
      const seller = state.teams.find((t) =>
        [...t.players, ...t.youth].some((x) => x.id === p.id),
      );
      if (seller?.id === state.clubId && !item.academy) return "";
      const advice = E.scouting.advice(state, p, item.academy ? null : seller);
      return `<article class="scout-player"><div class="row"><div><span class="badge">${item.academy ? "SUA ACADEMIA" : esc(advice.level)}</span><h3>${esc(p.name)}</h3><p>${esc(p.naturalPositions?.join("/") || p.pos)} · ${playerAge(p)}${p.ageUnknown ? "" : " anos"} · ${esc(seller?.name || "Sem clube")}</p></div><span class="scout-rating">${p.ovr}<small>pot. ${p.potential}</small></span></div><div class="offer-metrics"><div><small>${item.academy ? "Promoção" : "Pedido estimado"}</small><strong>${money(item.academy ? 100000 : advice.askingFee)}</strong></div><div><small>Salário recomendado</small><strong>${money(advice.salary)}/sem.</strong></div><div><small>Orçamento atual</small><strong>${item.academy || advice.affordable ? "Compatível" : "Precisa de ajuste"}</strong></div></div><p>${esc(advice.concerns[0] || "Combina qualidade, potencial e custo para o clube.")}</p>${item.academy ? btn("Promover · R$ 100 mil", "promote", p.id) : btn("Abrir negociação", "buy", p.id, "primary")}</article>`;
    })
    .join("");
  return `<div class="hero"><span class="badge">DEPARTAMENTO DE RECRUTAMENTO</span><h2>Olhos no próximo reforço.</h2><p>Os olheiros observam jogadores reais, comparam com seu elenco e procuram opções que respeitem caixa, transferências e salários.</p></div><div class="row scout-tabs">${btn("Mercado", "scout-scope", "market", scoutScope === "market" ? "primary" : "")}${btn("Base e jovens", "scout-scope", "youth", scoutScope === "youth" ? "primary" : "")}</div><div class="columns"><section class="card"><span class="badge">${scoutScope === "market" ? "CHEFE DE RECRUTAMENTO" : "COORDENAÇÃO DE CAPTAÇÃO"}</span><h3>Enviar olheiro</h3><p>${scoutScope === "market" ? "Observação de reforços em três dias. Custo: R$ 10 mil." : "Observação da sua base e de jovens até 21 anos em cinco dias. Custo: R$ 5 mil."}</p><form id="scouting-form"><label>Posição procurada<select name="position">${options([["all", "Qualquer posição"], ...Object.entries(T.positionNames).map(([key, label]) => [key, key + " · " + label])], "all")}</select></label><label>Limite de transferência (R$)<input name="maxFee" type="number" min="0" max="10000000000000" step="1" value="${team().finance.transferBudget}" required></label>${scoutScope === "youth" ? '<label>Idade máxima<input name="maxAge" type="number" min="15" max="23" value="21" required></label>' : ""}<button class="primary" ${missions.some((m) => m.status === "pending") ? "disabled" : ""}>Iniciar observação</button></form><p class="muted">Avance os dias na Visão geral. As recomendações consideram as verbas disponíveis na conclusão, sem garantir aceite do clube ou do jogador.</p></section><section class="card"><h3>Missões do departamento</h3>${
    missions
      .slice(0, 5)
      .map(
        (m) =>
          `<div class="mission-row"><strong>${m.status === "pending" ? "Em observação" : m.status === "completed" ? "Relatório entregue" : "Encerrada"}</strong><span>${m.position === "all" ? "Todos os setores" : esc(m.position)} · ${E.formatDate({ season: m.season }, m.due)}</span></div>`,
      )
      .join("") ||
    '<p class="muted">O departamento está pronto para receber uma missão.</p>'
  }</section></div><section class="card"><div class="row"><h3>${scoutScope === "youth" ? "Relatório de jovens" : "Reforços recomendados"}</h3><span class="pill">${report ? E.formatDate({ season: report.season }, report.offset) : "Aguardando observação"}</span></div>${cards ? `<div class="scout-grid">${cards}</div>` : report ? "<p>Nenhum jogador observado coube nos critérios e nas verbas. Amplie a busca ou ajuste o orçamento.</p>" : '<p class="muted">O relatório trará opções, custos e alertas para ajudar a decidir.</p>'}</section>`;
}
let calendarMonth = null,
  calendarSelected = null,
  calendarMode = "month",
  calendarScope = "career";
function careerCalendarView() {
  const today = new Date(Date.UTC(state.season, 1, 1 + state.today));
  calendarMonth ??= today.getUTCMonth();
  calendarSelected ??= state.today;
  const fixtures = E.careerCalendar(state, calendarScope),
    monthStart = new Date(Date.UTC(state.season, calendarMonth, 1)),
    days = new Date(Date.UTC(state.season, calendarMonth + 1, 0)).getUTCDate(),
    first = (monthStart.getUTCDay() + 6) % 7;
  const offsetOf = (day) =>
    Math.round(
      (Date.UTC(state.season, calendarMonth, day) -
        Date.UTC(state.season, 1, 1)) /
        86400000,
    );
  const labelMonth = monthStart.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const events = [];
  for (const n of state.negotiations || [])
    if (n.dueOn && E.negotiationActive(n))
      events.push({
        offset: Math.round(
          (Date.parse(n.dueOn) - Date.UTC(state.season, 1, 1)) / 86400000,
        ),
        label: "Resposta · " + n.playerName,
      });
  for (const m of state.scouting?.missions || [])
    if (m.status === "pending" && m.season === state.season)
      events.push({ offset: m.due, label: "Relatório do olheiro" });
  E.transferWindowInfo(state).ranges.forEach(([a, b]) =>
    events.push(
      { offset: a, label: "Abertura da janela" },
      { offset: b + 1, label: "Fechamento da janela" },
    ),
  );
  const detail = fixtures.filter((f) => f.offset === calendarSelected),
    dayEvents = events.filter((e) => e.offset === calendarSelected);
  const row = (f) =>
    `<article class="fixture-card"><span class="badge">${esc(f.name)} · ${f.offset < state.today ? "Disputado" : f.offset === state.today ? "Hoje" : "Confirmado"}</span><h3>${matchup(f, f.goals)}</h3><p>${E.formatDate(state, f.offset)} · ${f.kind === "national" ? "Seleção" : f.pair[0] === state.clubId ? "Casa" : "Fora"}${f.penalties ? " · Pênaltis " + f.penalties.join("–") : ""}</p>${f.offset === state.today && E.nextFixture(state) ? '<button data-page="Dia de jogo" class="primary">Abrir partida</button>' : ""}${f.offset < state.today && !f.goals ? "<small>Placar não disponível no arquivo desta carreira.</small>" : ""}</article>`;
  const cells =
    Array.from(
      { length: first },
      () => '<div class="calendar-empty" aria-hidden="true"></div>',
    ).join("") +
    Array.from({ length: days }, (_, i) => {
      const day = i + 1,
        offset = offsetOf(day),
        matches = fixtures.filter((f) => f.offset === offset),
        notes = events.filter((e) => e.offset === offset);
      return `<button class="calendar-day ${offset === state.today ? "today" : ""} ${offset === calendarSelected ? "selected" : ""} ${matches.length ? "has-match" : ""}" data-action="calendar-select" data-id="${offset}" ${offset === state.today ? 'aria-current="date"' : ""} aria-label="${esc(E.formatDate(state, offset))}${matches.length ? " · " + matches.length + " jogo(s)" : ""}${notes.length ? " · " + notes.map((n) => esc(n.label)).join(", ") : ""}"><span>${day}</span>${matches.map((f) => `<small class="match-chip ${f.kind === "national" ? "international" : ""}">${f.goals ? f.goals.join("–") : f.kind === "national" ? "SEL" : f.competition === team().leagueId ? "LIGA" : "COPA"}<span>${esc(name(f.pair.find((id) => id !== state.clubId && id !== state.national.job)))}</span></small>`).join("")}${notes.length ? '<i class="calendar-note-dot" aria-hidden="true"></i>' : ""}</button>`;
    }).join("");
  const monthFixtures = fixtures.filter(
    (f) =>
      new Date(Date.UTC(state.season, 1, 1 + f.offset)).getUTCMonth() ===
      calendarMonth,
  );
  return `<div class="hero"><span class="badge">AGENDA DO TREINADOR</span><h2>Planeje cada compromisso.</h2><p>Jogos, respostas de negociação, observações e janelas no mesmo calendário.</p></div><section class="card"><div class="row calendar-toolbar"><div class="row">${btn("← Mês anterior", "calendar-month", "-1")}<h3>${esc(labelMonth)}</h3>${btn("Próximo mês →", "calendar-month", "1")}${btn("Hoje", "calendar-today")}</div><div class="row">${btn("Mês", "calendar-mode", "month", calendarMode === "month" ? "primary" : "")}${btn("Agenda", "calendar-mode", "agenda", calendarMode === "agenda" ? "primary" : "")}<label>Compromissos<select id="calendar-scope">${options(
    [
      ["career", "Clube e seleção"],
      ["club", "Somente clube"],
      ["national", "Somente seleção"],
    ],
    calendarScope,
  )}</select></label></div></div><div class="calendar-workspace"><div>${calendarMode === "month" ? `<div class="calendar-weekdays">${["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((d) => `<span>${d}</span>`).join("")}</div><div class="calendar-grid">${cells}</div><p class="muted calendar-legend">● Liga · Copa · Seleção · ponto dourado: prazo ou janela</p>` : monthFixtures.map(row).join("") || "<p>Nenhum jogo confirmado neste mês. Use as setas para consultar os demais meses.</p>"}</div><aside class="calendar-details"><span class="badge">${E.formatDate(state, calendarSelected)}</span>${detail.map(row).join("") || '<h3>Sem jogo confirmado</h3><p class="muted">Um dia para preparar o elenco, recuperar os atletas e acompanhar o mercado.</p>'}${dayEvents.map((e) => `<p class="calendar-deadline">${esc(e.label)}</p>`).join("")}<p class="muted">O avanço dos dias fica na Visão geral.</p><button data-page="Visão geral">Ir para Visão geral</button></aside></div></section>${windowBanner()}<div class="row"><button data-action="reference-calendar">Consultar datas reais da base</button></div>`;
}
function upcomingStrip() {
  return `<section class="card"><div class="row"><h3>Próximos compromissos</h3><button data-page="Calendário">Abrir agenda</button></div><div class="upcoming-strip">${
    E.careerCalendar(state)
      .filter((f) => f.offset >= state.today)
      .slice(0, 4)
      .map(
        (f) =>
          `<div><small>${E.formatDate(state, f.offset)}</small><strong>${matchup(f)}</strong><span>${esc(f.name)}</span></div>`,
      )
      .join("") ||
    '<p class="muted">Novas datas serão confirmadas na próxima temporada.</p>'
  }</div></section>`;
}
const trophySvg = () =>
  '<svg class="trophy-svg" viewBox="0 0 160 180" role="img" aria-label="Troféu"><defs><linearGradient id="cup-gold" x1="0" x2="1"><stop stop-color="#a76b17"/><stop offset=".45" stop-color="#fff0a2"/><stop offset="1" stop-color="#d99a29"/></linearGradient></defs><path d="M44 24H18v32c0 26 20 42 43 42M116 24h26v32c0 26-20 42-43 42" fill="none" stroke="#dba542" stroke-width="10"/><path d="M38 12h84v43c0 30-18 50-36 53v28h24v18H50v-18h24v-28c-18-3-36-23-36-53Z" fill="url(#cup-gold)"/><path d="m80 33 7 14 15 2-11 11 3 16-14-8-14 8 3-16-11-11 15-2Z" fill="#79500d"/><rect x="37" y="154" width="86" height="17" rx="5" fill="#1a2b43"/></svg>';
function trophyRoom() {
  const trophies = (state.trophies || []).filter(
    (t) => t.clubId === state.clubId || t.coachId === "you",
  );
  return `<div class="hero"><span class="badge">SALA DE TROFÉUS</span><h2>As conquistas ficam para a história.</h2><p>Títulos confirmados do seu clube e das equipes que você levou ao topo.</p></div><div class="trophy-grid">${trophies.map((t) => `<article class="card trophy-card">${trophySvg()}<span class="badge">${t.season}</span><h3>${esc(t.name)}</h3><p>${teamLabel(t.clubId)}</p><small>${t.coachId === "you" ? "Conquistado durante sua gestão" : "Histórico do clube"}</small></article>`).join("") || `<div class="card trophy-empty">${trophySvg()}<h3>O primeiro capítulo ainda será escrito.</h3><p>Os títulos de liga e das competições continentais aparecem aqui após a confirmação do campeão.</p></div>`}</div>`;
}
function showCelebration() {
  const title = (state.trophies || []).find(
    (t) => t.coachId === "you" && !t.celebrated,
  );
  if (!title || document.querySelector("dialog[open]")) return;
  const dialog = $("#trophy-dialog");
  if (!dialog) return;
  dialog.innerHTML = `<div class="champion-celebration">${Array.from({ length: 24 }, (_, i) => `<i class="confetti" style="--i:${i};--left:${(i * 37) % 100}%"></i>`).join("")}<span class="badge">CAMPEÃO · ${title.season}</span>${trophySvg()}<h2>${esc(name(title.clubId))} no topo!</h2><h3>${esc(title.name)}</h3><p>Uma conquista para o clube. Um novo marco na sua carreira.</p>${btn("Guardar na sala de troféus", "close-celebration", title.id, "primary")}</div>`;
  dialog.showModal();
}

async function advancePeriod(amount, unit) {
  if (!Number.isInteger(amount) || amount < 1 || amount > 52) {
    notify("Escolha um período entre 1 e 52.", true);
    return;
  }
  advancing = true;
  cancelAdvance = false;
  state.advancePreference = { amount, unit };
  render();
  let count = 0,
    last = {};
  try {
    const total = Math.min(365, amount * (unit === "weeks" ? 7 : 1));
    for (let i = 0; i < total && !cancelAdvance; i++) {
      last = E.simulate(state, 1, "days");
      count += last.advanced;
      if ($("#simulation-progress"))
        $("#simulation-progress").textContent =
          `${count} dia(s) processados · ${E.date(state)}`;
      if (
        last.stoppedForMatch ||
        last.finished ||
        last.stoppedForNegotiation ||
        last.stoppedForInvitation ||
        last.stoppedForReport ||
        !last.advanced
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    notify(
      last.stoppedForMatch
        ? `${count} dia(s) avançados. Seu clube ou seleção joga hoje.`
        : last.stoppedForNegotiation
          ? "Chegou uma resposta de negociação. Confira Transferências."
          : last.stoppedForInvitation
            ? "Uma federação enviou um convite. Confira Seleções."
            : last.stoppedForReport
              ? "O relatório do olheiro chegou. Confira Olheiros."
              : last.finished
                ? "Temporada concluída."
                : `${count} dia(s) avançados${cancelAdvance ? ". Avanço interrompido" : ""}.`,
    );
  } catch (error) {
    notify(error.message, true);
  } finally {
    advancing = false;
    scheduleSave();
    render();
  }
}
function invitationSummary() {
  const offers = state.national.invites.filter(
    (o) =>
      o.status === "pending" &&
      o.season === state.season &&
      o.expires >= state.today,
  );
  return offers.length
    ? `<div class="card"><span class="badge">SUA CARREIRA</span><h3>Uma federação quer conversar.</h3><p>${esc(offers[0].name)} enviou um convite para você.</p><button data-page="Seleções">Ler convite</button></div>`
    : "";
}
function profileView() {
  const p = state.profile;
  return `<div class="card"><span class="badge">PERFIL DO TREINADOR</span><h3>${esc(p.name)}</h3><p>${state.season - p.birthYear} anos · ${esc(countryLabel(p.nationality))}${state.national.job ? " · Seleção: " + esc(name(state.national.job)) : ""}</p><details><summary>Editar nome, idade e nacionalidade</summary><form id="profile-form">${profileFields({ ...p, age: state.season - p.birthYear }, "edit")}<button class="primary">Atualizar perfil</button></form></details><p class="muted">A idade avança a cada temporada. Você pode acumular o comando de um clube e uma seleção.</p><button data-page="Seleções">Ver convites de seleções →</button> <button data-page="Salvamentos">Gerenciar salvamento</button></div>`;
}
function nationalView() {
  const n = state.national,
    job = n.job && team(n.job),
    selected = new Set(job?.players.map((p) => p.id) || []);
  const offers = n.invites.filter(
    (o) =>
      o.status === "pending" &&
      o.season === state.season &&
      o.expires >= state.today,
  );
  let html = `<div class="hero"><span class="badge">CARREIRA INTERNACIONAL</span><h2 class="identity-title">${job ? badge(job, "large") + "<span>" + esc(job.name) + "</span>" : "Uma federação precisa acreditar no seu trabalho."}</h2><p>${job ? esc(state.profile.name) + " · " + job.players.length + " convocados" : "Os convites chegam conforme sua reputação, os resultados e as exigências de cada seleção."}</p></div><section class="card"><h3>Convites das federações</h3>${offers.map((o) => `<article class="national-invite"><span class="badge">CONVITE OFICIAL · SIMULAÇÃO</span><h3>${teamLabel(o.selectionId, "medium")}</h3><p>${esc(o.reason)}</p><p class="muted">Responda até ${E.formatDate(state, o.expires)}. O cargo pode ser acumulado com seu clube.</p><div class="row">${btn("Aceitar convite", "assume-national", o.selectionId, "primary")}${btn("Recusar convite", "decline-national", o.id)}</div></article>`).join("") || "<p>Continue seu trabalho no clube. As federações avaliam resultados e reputação periodicamente; seleções mais fortes exigem uma carreira de maior destaque.</p>"}<p class="muted">Você recebe uma oferta antes de poder assumir. Amistosos e elegibilidade são simplificados; esta etapa não inclui Copa do Mundo ou eliminatórias.</p>${job ? btn("Deixar seleção", "resign-national") : ""}</section>`;
  if (!job) return html;
  const owners = new Map();
  for (const club of state.teams)
    for (const p of [...club.players, ...club.youth]) owners.set(p.id, club.id);
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
        `<tr class="${selected.has(p.id) ? "mine" : ""}"><td>${esc(p.name)}<small class="sub">${playerAge(p)}${p.ageUnknown ? "" : " anos"}</small></td><td>${p.pos}</td><td>${p.ovr}</td><td>${owners.has(p.id) ? teamLabel(owners.get(p.id), "tiny") : "Sem clube"}</td><td>${p.injury ? "Lesão · " + p.injury + " dias" : p.fitness + "%"}</td><td>${btn(selected.has(p.id) ? "Dispensar" : "Convocar", "call-player", p.id)}</td></tr>`,
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
  autosaver.cancel();
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
  autosaver.cancel();
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

$("#trophy-dialog").addEventListener("cancel", (event) => {
  event.preventDefault();
  const trophy = state.trophies?.find(
    (t) => t.coachId === "you" && !t.celebrated,
  );
  if (trophy) trophy.celebrated = true;
  $("#trophy-dialog").close();
  scheduleSave();
});
