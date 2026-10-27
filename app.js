"use strict";
const A = LegacyAppearance;
const NAV = LegacyNavigation;
const sectionMemory = new Map();
const workspaceScroll = new Map();
const liveFrames = new WeakMap();
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
const money = LegacyMoney.full;
const moneyValue = (value, unit = "") =>
  `<span class="money-value" title="${esc(money(value))}"><strong>${esc(LegacyMoney.compact(value))}</strong><small>${esc(money(value))}${unit ? " · " + esc(unit) : ""}</small></span>`;
function decorateMoneyInputs(scope = document) {
  for (const input of scope.querySelectorAll(
    '#budget-transfer,#budget-wage,#test-funds-amount,#fund-budget-amount,#market-price-max,[name="maxFee"],[name="maxSalary"],[name="salary"],[name="fee"],[name="bonus"]',
  )) {
    if (input.dataset.moneyInput || input.hasAttribute("data-offer-money"))
      continue;
    input.dataset.moneyInput = "true";
    input.type = "text";
    input.inputMode = "decimal";
    input.classList.add("money-edit");
    const amount = LegacyMoney.parse(input.value);
    if (Number.isSafeInteger(amount)) input.value = LegacyMoney.number(amount);
    const hint = document.createElement("small");
    hint.className = "money-live";
    hint.setAttribute("aria-live", "polite");
    input.after(hint);
    hint.textContent = Number.isFinite(amount)
      ? money(amount)
      : "Valor em reais";
  }
}
document.addEventListener("input", (event) => {
  if (event.target.closest("#scouting-form")) {
    const form = event.target.closest("form"),
      depth = form.elements.depth.value,
      cost =
        (scoutScope === "youth" ? 5000 : 10000) *
        (depth === "quick" ? 0.6 : depth === "deep" ? 2 : 1),
      days =
        depth === "quick"
          ? 2
          : depth === "deep"
            ? 7
            : scoutScope === "youth"
              ? 5
              : 3;
    $("#mission-estimate").textContent =
      money(cost) + " · resposta em " + days + " dias";
  }
  if (event.target.dataset.moneyInput) {
    const input = event.target,
      value = LegacyMoney.parse(input.value),
      hint = input.nextElementSibling;
    input.setCustomValidity(
      input.value.trim() &&
        (!Number.isSafeInteger(value) ||
          value < Number(input.getAttribute("min") || 0) ||
          value > Number(input.getAttribute("max") || 1e13))
        ? "Informe um valor inteiro dentro dos limites, em reais."
        : "",
    );
    if (hint?.classList.contains("money-live"))
      hint.textContent = Number.isSafeInteger(value)
        ? money(value)
        : "Informe um valor inteiro em reais";
  }
});
document.addEventListener("focusout", (event) => {
  if (event.target.dataset.moneyInput) {
    const value = LegacyMoney.parse(event.target.value);
    if (Number.isSafeInteger(value))
      event.target.value = LegacyMoney.number(value);
  }
});
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
  setupCalendar = "regional",
  setupProfile = { name: "", age: 35, nationality: "Brazil" },
  newsScope = "club",
  newsCategory = "all",
  newsOutlet = "all",
  newsJournalist = "all",
  newsQuery = "";
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
let rosterQuery = "",
  rosterPosition = "all",
  rosterStatus = "all",
  rosterSort = "overall",
  rosterView = "table";
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
  matchMode = state.live?.mode || state.matchPreferences?.mode || "2d",
  timer = null,
  speed = state.matchPreferences?.speed || 900,
  paused = false;
const pages = [
  "Visão geral",
  "Jornal",
  "Elenco",
  "Treinamento",
  "Disciplina",
  "Transferências",
  "Olheiros",
  "Categorias de base",
  "Competições",
  "Troféus",
  "Prêmios",
  "Histórico",
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
  return `<span class="team-badge badge-${size}" data-badge="${esc(t?.name || "A definir")}" data-loaded="${Boolean(src)}" style="--badge-primary:${colors.primary};--badge-secondary:${colors.secondary}"><svg class="badge-fallback" viewBox="0 0 40 48" aria-hidden="true"><path d="M3 3h34v23c0 10-17 19-17 19S3 36 3 26Z" fill="var(--badge-primary)" stroke="var(--badge-secondary)" stroke-width="3"/><path d="m11 19 9-6 9 6-4 12H15Z" fill="var(--badge-secondary)"/></svg>${src ? `<img src="${esc(src)}" alt="${t?.isNational || t?.id?.startsWith("nt-") ? "Bandeira" : "Emblema original"} de ${esc(t.name)}" width="64" height="64" decoding="async" draggable="false">` : ""}</span>`;
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
const navigationGroups = ["DIA A DIA", "FUTEBOL", "GESTÃO"].map((label) => [
  label,
  NAV.groups.filter((g) => g.category === label).map((g) => g.page),
]);
const navigationPaths = {
  Disciplina:
    '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6m-6 4h6m-6 4h3"/>',
  Prêmios:
    '<path d="M8 3h8v5a4 4 0 0 1-8 0V3Zm0 1H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v6m-4 3h8m-6-3h4v3h-4Z"/>',
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
          `<div class="nav-group"><small class="nav-group-label">${label}</small>${items.map((p) => `<button data-page="${p}" data-workspace="${NAV.groupFor(p).id}" aria-label="${p}" title="${NAV.groupFor(p).description}"><svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${navigationPaths[p]}</svg><span class="nav-label">${p}</span></button>`).join("")}</div>`,
      )
      .join("");
    navigationReady = true;
  }
  nav.querySelectorAll("button[data-page]").forEach((button) => {
    const active = button.dataset.page === NAV.groupFor(page)?.page;
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
    if (!loadError && state.clubId) {
      localStorage.setItem(KEY, encoded);
      try {
        localStorage.setItem(
          "dinastia-save-meta",
          JSON.stringify({ savedAt: new Date().toISOString() }),
        );
      } catch {}
    }
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
const pageDescriptions = {
  Histórico:
    "Campeões das competições e vencedores dos prêmios ao longo da carreira.",
  Disciplina: "Cartões, pendurados e suspensões por competição.",
  Prêmios:
    "Notas, estatísticas e os protagonistas de cada partida e temporada.",
  "Visão geral":
    "O próximo passo da sua carreira, os compromissos e a situação do clube.",
  Jornal: "As histórias do seu clube, da liga e do continente.",
  Calendário: "Compromissos, preparação, amistosos e prazos da temporada.",
  Elenco: "Escalação, funções, capitania e contratos em um só lugar.",
  Treinamento: "Carga física e desenvolvimento, com espaço para cada decisão.",
  Transferências: "Encontre reforços, compare custos e acompanhe negociações.",
  Olheiros: "Transforme observação em decisões para o elenco e a base.",
  "Categorias de base":
    "Prepare os atletas reais da base para o próximo passo.",
  Competições: "Classificações e caminho dos clubes nos campeonatos.",
  Troféus: "As conquistas que fazem parte da sua história.",
  Carreira: "Seu treinador, propostas de trabalho e próximos desafios.",
  Clube: "Estrutura e planejamento para sustentar o futebol.",
  Financeiro:
    "Caixa, salários, transferências e o histórico de cada movimento.",
  Seleções: "Convites, convocação e compromissos internacionais.",
  Salvamentos: "Guarde, exporte ou gerencie sua carreira.",
  "Dia de jogo": "Do apito inicial ao último lance, no seu ritmo.",
};
function openQuickMenu() {
  if (!state.clubId) return;
  const dialog = $("#quick-menu");
  dialog.innerHTML = `<div class="dialog-heading"><div><span class="badge">CENTRAL DO TREINADOR</span><h2>Para onde vamos?</h2></div><button data-action="close-quick-menu" aria-label="Fechar menu">×</button></div><label class="menu-search">Buscar uma página<input id="quick-menu-search" type="search" placeholder="Elenco, calendário, financeiro…" autocomplete="off"></label><div id="quick-menu-results"></div><small>Ctrl/⌘ + K para abrir · Esc para fechar</small>`;
  function results() {
    const term = $("#quick-menu-search")
      .value.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const found = NAV.search(term);
    $("#quick-menu-results").innerHTML = found.length
      ? ["DIA A DIA", "FUTEBOL", "GESTÃO"]
          .map((category) => {
            const items = found.filter((x) => x.group.category === category);
            return items.length
              ? `<section><h3>${category}</h3>${items.map(({ group: g, section: x }) => `<button data-page="${x.page}" ${x.squadTab ? `data-squad-tab="${x.squadTab}"` : ""} ${!term ? `data-workspace="${g.id}"` : ""} class="${NAV.sectionFor(page, squadTab)?.key === x.key ? "current" : ""}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${navigationPaths[g.page]}</svg><span><strong>${esc(term ? g.label + " → " + x.label : g.label)}</strong><small>${esc(term ? pageDescriptions[x.page] : g.description)}</small></span><span aria-hidden="true">→</span></button>`).join("")}</section>`
              : "";
          })
          .join("")
      : '<p class="muted">Nenhuma seção encontrada. Tente jogador, treino, prêmio ou financeiro.</p>';
  }
  $("#quick-menu-search").oninput = results;
  $("#quick-menu-search").onkeydown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      dialog.close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      $("#quick-menu-results button")?.focus();
    }
  };
  results();
  dialog.showModal();
  $("#quick-menu-search").focus();
}
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && state.clubId) {
    e.preventDefault();
    if (!document.querySelector("dialog[open]")) openQuickMenu();
  }
});

function render() {
  const hasCareer = Boolean(state.clubId);
  if (hasCareer) E.refreshAvailability(state);
  $("#sidebar").hidden = !hasCareer;
  $("#mobile-nav").hidden = !hasCareer;
  document.body.classList.remove("pitch-expanded");
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
  renderMobileNavigation();
  const group = NAV.groupFor(page),
    section = NAV.sectionFor(page, squadTab);
  if (group && section) sectionMemory.set(group.id, section.key);
  $("#title").textContent = group?.label || page;
  $("#page-description").textContent = pageDescriptions[page] || "";
  const previousTabs = $("#content .workspace-tabs");
  if (previousTabs)
    workspaceScroll.set(
      $("#content").dataset.workspace,
      previousTabs.scrollLeft,
    );
  $("#content").dataset.workspace = group?.id || "match";
  $("#content").dataset.view = page;
  document.title = page + " · " + team().name + " · DINASTIA FC";
  match3D?.dispose();
  match3D = null;
  $("#content").innerHTML = workspaceView(group, section);
  if ($("#content .workspace-tabs"))
    $("#content .workspace-tabs").scrollLeft =
      workspaceScroll.get(group.id) || 0;
  alignWorkspaceTabs();
  decorateMoneyInputs();
  $("#context").textContent =
    `${appearanceTeam().name} · ${E.seasonLabel(state)} · ${E.date(state)}${state.mode === "test" ? " · MODO TESTE" : ""}`;
  if (page === "Financeiro") updateBudgetPreview();
  if (page === "Dia de jogo" && state.live) draw();
  showCelebration();
  if (page === "Treinamento") decorateMoneyInputs();
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
  return `<div class="entry-top"><a class="wordmark" href="#" aria-label="Dinastia FC">DINASTIA<span>FC</span></a><button data-action="toggle-theme" aria-label="${theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}">${theme === "dark" ? "☀ Modo claro" : "☾ Modo escuro"}</button></div><div class="entry-layout"><div class="entry-copy"><span class="badge">SUA HISTÓRIA COMEÇA AQUI</span><h1>Um clube. <br>Mil decisões. <br><em>O seu legado.</em></h1><p>Assuma o comando de um clube real, negocie com atletas reais e controle cada entrada e saída do caixa.</p><div class="entry-facts"><span><strong>${available}</strong> clubes com elenco disponível</span><span><strong>21</strong> ligas no mundo</span><span><strong>4</strong> copas continentais</span></div></div><section class="career-card" aria-label="Escolha seu clube"><div class="entry-step"><span>01 / INÍCIO DA JORNADA</span><span>Treinador & gestor</span></div><h2>Começar carreira</h2><p class="muted">Somente jogadores reais. Valores e caixa são referências e projeções.</p>${profileFields(setupProfile, "start")}<label for="start-game-mode">Modo de carreira</label><select id="start-game-mode">${options(
    [
      ["normal", "Carreira normal"],
      ["test", "Modo teste · adicionar dinheiro"],
    ],
    setupMode,
  )}</select><label for="start-calendar">Início da carreira</label><select id="start-calendar">${options(
    [
      ["regional", "Pré-temporada · Europa 2026/27 / Américas 2026"],
      ["classic", "Calendário clássico · jogos imediatos"],
    ],
    setupCalendar,
  )}</select><p class="muted">${setupMode === "test" ? "Você poderá adicionar dinheiro ao caixa e aos orçamentos no Financeiro." : "Administre as receitas, despesas e verbas do clube ao longo da carreira."}</p><label for="start-league">País e liga</label><select id="start-league">${options(
    state.leagues.map((l) => [l.id, l.country + " · " + l.name]),
    setupLeague,
  )}</select><label for="start-club">Seu primeiro clube</label><select id="start-club">${clubOptions}</select><div class="club-preview">${badge(chosen, "large")}<div><strong>${esc(chosen.name)}</strong><span>${esc(l.name)}</span><small>Caixa inicial estimado · ${money(chosen.money)}</small><small>${chosen.players.length} profissionais reais confirmados</small></div></div>${rosterReferenceView(chosen)}${chosen.players.length < 11 ? '<p class="notice">A fonte ainda não tem onze atletas confirmados para este clube. Escolha outro clube ou liga.</p>' : ""}${startButton}<p class="entry-save-note">Sua carreira será salva neste navegador. Exporte um arquivo para guardar uma cópia.</p><button data-action="import-save">Importar carreira salva</button>${loadError ? '<button class="danger" data-action="delete-save">Excluir dados ilegíveis</button>' : ""}</section></div><div class="entry-bottom"><span>SEU CLUBE. SUA HISTÓRIA.</span><span>Dias e semanas · Texto, 2D ou 3D · Sem instalação</span></div>${dataNotice()}`;
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
        .filter(([code]) => !["GOL", "ZAG", "VOL", "MEI", "ATA"].includes(code))
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
    priceMax: $("#market-price-max").value.trim()
      ? LegacyMoney.parse($("#market-price-max").value)
      : "",
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
    return `<div class="time-panel"><div><small>TEMPORADA ${E.seasonLabel(state)} ENCERRADA</small><strong>Planeje o próximo ano</strong></div><button data-page="Carreira">Propostas de trabalho</button>${btn("Avançar 1 dia de planejamento", "planning-day")}${btn("Iniciar temporada " + E.seasonLabel({ ...state, season: state.season + 1 }), "next-season", "", "primary")}</div>`;
  return `<div class="time-panel"><div><small>CALENDÁRIO DA CARREIRA</small><strong>${esc(E.date(state))}</strong><p>${todayMatch ? "Hoje: " + matchup(todayMatch) : upcoming ? "Próximo jogo: " + E.formatDate(state, upcoming.offset) + " · " + matchup(upcoming) : "Sem partida confirmada."}</p></div><form id="simulation-form"><label>Avançar<input id="simulate-amount" type="number" min="1" max="52" value="${simulateAmount}" required></label><label>Período<select id="simulate-unit">${options(
    [
      ["days", "Dias"],
      ["weeks", "Semanas"],
    ],
    simulateUnit,
  )}</select></label><button class="primary" ${advancing ? "disabled" : ""}>Simular período</button></form>${advancing ? '<div class="advance-status" id="simulation-progress" role="status">Avançando um dia de cada vez…</div><button data-action="stop-advance">Parar avanço</button>' : ""}${todayMatch ? '<button data-page="Dia de jogo">Jogar hoje →</button>' : ""}</div>`;
}
const metric = (title, value, subtitle) =>
  `<div class="card metric-card"><small>${title}</small><div class="metric">${/^-?R\$/.test(String(value)) ? moneyValue(LegacyMoney.parse(value)) : value}</div><span class="muted">${subtitle}</span></div>`;
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
  return `<div class="table-wrap"><table><thead><tr><th>JOGADOR</th><th>POS.</th><th>IDADE</th><th>GERAL</th><th>VALOR</th><th title="Preparo físico: varia com minutos, intensidade e recuperação">CONDIÇÃO ⓘ</th><th>SALÁRIO EST./SEM.</th><th>CONTRATO</th><th>AÇÕES</th></tr></thead><tbody>${ps.map((p) => `<tr><td>${p.shirtNumber ? `<span class="shirt-number" title="Número do uniforme na carreira">${p.shirtNumber}</span>` : ""}<strong>${esc(p.name)}</strong>${context === "squad" ? disciplineStatus(p) : ""}${seasonStatLine(p)}<span class="sub">${esc(playerReference(p))}<span class="sub">${esc((p.nationalities?.length ? p.nationalities : [p.nationality]).map(countryLabel).filter(Boolean).join(" / ") || "Nacionalidade indisponível")}</span>${context === "market" ? " · " + esc(p.sellerName) : ""}</span></td><td>${esc(p.naturalPositions?.length ? p.naturalPositions.join(" / ") : p.pos)}${p.secondaryPositions?.length ? `<small class="sub">Também: ${esc(p.secondaryPositions.join(" / "))}</small>` : ""}${p.positionEstimated ? " · est." : ""}</td><td>${playerAge(p)}</td><td><span class="rating" title="${esc(p.ratingSource || "Estimativa do jogo")}">${p.ovr}</span></td><td>${moneyValue(p.price)}</td><td>${p.injury ? `Lesão · ${p.injury} dias` : `<span class="condition-meter ${p.fitness < 75 ? "tired" : p.fitness < 90 ? "wear" : "ready"}"><strong>${p.fitness}%</strong><i style="width:${p.fitness}%"></i><small>${p.fitness >= 90 ? "Pronto" : p.fitness >= 75 ? "Desgastado" : "Cansado"}</small></span>`}</td><td>${moneyValue(p.salary, "por semana")}</td><td>${p.contract}${p.contractEstimated ? " · est." : ""}<small class="sub">${esc(E.SQUAD_ROLES[p.squadRole] || "Papel a negociar")}</small></td><td>${context === "squad" ? btn("Renovar", "renew", p.id) + btn("Vender", "sell", p.id) + btn("Camisa " + p.shirtNumber, "edit-shirt", p.id) : context === "youth" ? btn("Promover · R$ 100 mil", "promote", p.id) : btn("Negociar", "buy", p.id)}</td></tr>`).join("")}</tbody></table></div>${ps.length ? "" : '<p class="muted">Nenhum jogador encontrado.</p>'}`;
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
    return `<div class="hero"><span class="badge">TEMPORADA ${E.seasonLabel(state)} · ${esc(E.date(state))}</span><h2 class="identity-title">${badge(t, "large")}<span>${esc(t.name)}</span></h2><p>${next ? esc(next.name) + " · " + matchup(next) : d ? "Data sem partida do seu clube. Acompanhe os outros resultados." : "A temporada terminou. Confira os títulos e as propostas para sua carreira."}</p>${next || E.currentMatch(state).active ? '<button class="primary" data-page="Dia de jogo">Central da partida →</button>' : '<button data-page="Calendário">Ver calendário →</button>'}</div>${state.calendarProfile && state.today < state.calendarProfile.preseasonDays ? `<section class="preseason-banner"><div><span class="badge">PRÉ-TEMPORADA</span><h3>${state.calendarProfile.preseasonDays - state.today} dias para preparar a estreia</h3><p>Treine, negocie e organize jogos de preparação no calendário.</p></div><button data-page="Calendário">Organizar a pré-temporada →</button></section>` : ""}<div class="grid">${metric("CAIXA DO CLUBE", money(t.money), "Folha semanal estimada: " + money(t.players.reduce((a, p) => a + p.salary, 0)))}${metric("POSIÇÃO NA LIGA", pos + "º", esc(E.league(state, t.leagueId).name))}${metric("FORÇA DO TIME", Math.round(E.strength(t)), "Reputação do treinador: " + state.reputation)}</div><div class="columns"><div class="card"><div class="row"><h3>Notícias do clube e do mundo</h3><button data-page="Jornal">Abrir jornal →</button></div>${state.news
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
        ? `<h3>${esc(l.name)} · ${E.seasonLabel(state, l.region)}</h3><p class="muted">${l.ids.length} clubes · ${l.single ? "Turno único" : "Turno e returno"} · ${l.fixtures.length} rodadas. Pontos, saldo e gols marcados.</p>${standings(l.table)}<div class="row">${btn("Desempenho e prêmio do campeonato →", "awards-competition", l.id)}</div>`
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
  Prêmios: () => awardsView(),
  Histórico: () => honoursView(),
  Disciplina: () => disciplineView(),
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
       `<tr><td>${esc(E.formatDate({ ...state, season: r.season }, r.offset))}</td><td>${financeLabels[r.category] || esc(r.category)}</td><td>${esc(r.description)}</td><td class="${r.amount > 0 ? "income" : r.amount < 0 ? "expense" : ""}">${money(r.amount)}</td><td>${money(r.balance)}</td></tr>`,
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
  return `<section class="card budget-editor"><div class="row"><div><span class="badge">PLANEJAMENTO DO FUTEBOL</span><h3>Definir limites em reais</h3></div><span class="pill">Aplicação imediata ao confirmar</span></div><p>Edite quanto pode gastar em contratações e o teto da folha semanal. O espaço salarial adicional reserva 52 semanas; a folha atual tem uma reserva de segurança de 13 semanas.</p><div class="budget-summary"><div><small>Transferências atuais</small><strong id="current-transfer">${money(f.transferBudget)}</strong></div><div><small>Teto salarial atual / semana</small><strong id="current-wage">${money(f.wageBudget)}</strong></div><div><small>Folha já contratada / semana</small><strong>${money(c.committed)}</strong></div><div><small>Caixa livre para ampliar limites</small><strong>${money(c.free)}</strong></div></div><form id="budget-form"><div class="columns"><label for="budget-transfer">Novo limite de transferências (R$)<input id="budget-transfer" type="number" min="0" step="1" required value="${f.transferBudget}"></label><label for="budget-wage">Novo teto salarial por semana (R$)<input id="budget-wage" type="number" min="${c.committed}" step="1" required value="${Math.max(c.committed, f.wageBudget)}"></label></div><div id="budget-simulation" aria-live="polite"></div><details class="budget-slider"><summary>Redistribuir a verba atual com o controle deslizante</summary><label for="budget-share">Parcela para transferências <output id="budget-preview">${share}%</output></label><input id="budget-share" type="range" min="0" max="100" value="${share}"><p class="muted">← Mais espaço salarial · Mais verba para transferências →</p></details><div class="row"><button class="primary" id="apply-budget">Aplicar distribuição</button><button type="button" data-action="reset-budget">Restaurar valores atuais</button></div><p class="muted">Os cartões acima mostram os valores salvos. A prévia mostra o que será aplicado. Distribuir verba mantém o saldo bancário; os novos limites passam a valer nas negociações.</p></form><details><summary>Destinar um valor adicional do caixa livre</summary><form id="fund-budget-form" class="filters"><label>Valor para transferências (R$)<input id="fund-budget-amount" type="number" min="1" step="1" max="${c.free}" value="${c.free}"></label><button ${c.free < 1 ? "disabled" : ""}>Destinar caixa</button></form></details>${changes.length ? `<details><summary>Últimas alterações de orçamento</summary>${changes.map((h) => `<div class="budget-change"><small>${E.formatDate({ ...state, season: h.season }, h.offset)}</small><span>Transferências: ${money(h.before.transfer)} → <strong>${money(h.after.transfer)}</strong></span><span>Teto semanal: ${money(h.before.wage)} → <strong>${money(h.after.wage)}</strong></span></div>`).join("")}</details>` : ""}</section>`;
}
function updateBudgetPreview(source) {
  if (!$("#budget-transfer")) return;
  const t = team(),
    f = t.finance,
    c = E.finance.budgetCapacity(t);
  if (source === "slider") {
    const percent = Number($("#budget-share").value),
      transfer = Math.round((c.allocated * percent) / 100);
    $("#budget-transfer").value = LegacyMoney.number(transfer);
    $("#budget-wage").value = LegacyMoney.number(
      c.committed + Math.floor((c.allocated - transfer) / 52),
    );
  }
  const transfer = LegacyMoney.parse($("#budget-transfer").value),
    wage = LegacyMoney.parse($("#budget-wage").value),
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
  for (const id of ["#budget-transfer", "#budget-wage"]) {
    const input = $(id),
      hint = input.nextElementSibling;
    if (hint?.classList.contains("money-live"))
      hint.textContent = money(LegacyMoney.parse(input.value));
    const value = LegacyMoney.parse(input.value);
    input.setCustomValidity(
      Number.isSafeInteger(value) &&
        value >= Number(input.getAttribute("min") || 0)
        ? ""
        : "Informe um valor inteiro válido em reais.",
    );
  }
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
  return squadTab === "players" ? squadPlayersView() : squadTacticsView();
}
function workspaceView(group, selected) {
  const body = views[page]();
  if (!group || group.sections.length === 1) return body;
  return `<div class="workspace-heading"><span class="workspace-caption">${esc(group.description)}</span><span class="workspace-position">${group.sections.indexOf(selected) + 1} / ${group.sections.length}</span></div><div class="workspace-tabs" role="tablist" aria-label="Seções de ${group.label}">${group.sections.map((x) => `<button id="${NAV.tabId(group, x)}" role="tab" aria-selected="${x === selected}" aria-controls="${NAV.panelId(group, x)}" tabindex="${x === selected ? 0 : -1}" data-section="${x.key}" data-page="${x.page}" ${x.squadTab ? `data-squad-tab="${x.squadTab}" data-action="squad-tab" data-id="${x.squadTab}"` : ""}>${x.label}</button>`).join("")}</div>${group.sections.map((x) => `<section class="workspace-panel" id="${NAV.panelId(group, x)}" role="tabpanel" aria-labelledby="${NAV.tabId(group, x)}" ${x === selected ? "" : "hidden"}>${x === selected ? body : ""}</section>`).join("")}`;
}
function squadPlayersView() {
  if (tacticalScope === "national" && state.national.job) {
    const t = team(state.national.job);
    return `<div class="hero"><span class="badge">GRUPO CONVOCADO</span><h2 class="identity-title">${badge(t, "large")}<span>${esc(t.name)} · ${t.players.length} atletas</span></h2><p>Acompanhe os jogadores chamados para defender a seleção.</p><button data-page="Seleções">Gerenciar convocação →</button></div><div class="card"><h3>Convocados</h3><div class="table-wrap"><table><thead><tr><th>JOGADOR</th><th>POSIÇÃO</th><th>IDADE</th><th>GERAL</th><th>CONDIÇÃO</th></tr></thead><tbody>${t.players.map((p) => `<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.naturalPositions?.join(" / ") || p.pos)}</td><td>${playerAge(p)}</td><td><span class="rating">${p.ovr}</span></td><td>${p.injury ? "Lesionado" : p.fitness + "%"}</td></tr>`).join("")}</tbody></table></div></div>`;
  }
  const t = team(),
    lineup = new Set(T.positions(t).map((p) => p?.id));
  const normalize = (x) =>
    x
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const players = t.players.filter(
    (p) =>
      normalize(p.name).includes(normalize(rosterQuery)) &&
      (rosterPosition === "all" || T.positionMatches(p, rosterPosition)) &&
      (rosterStatus === "all" ||
        (rosterStatus === "starting" && lineup.has(p.id)) ||
        (rosterStatus === "injured" && p.injury) ||
        (rosterStatus === "suspended" &&
          E.discipline.suspension(p, t.selectionCompetition)) ||
        (rosterStatus === "tired" &&
          (p.fitness < 85 || (p.fatigue || 0) > 50)) ||
        (rosterStatus === "expiring" && p.contract <= state.season + 1)),
  );
  const sorting = {
    overall: (a, b) => b.ovr - a.ovr,
    name: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
    age: (a, b) => a.age - b.age,
    salary: (a, b) => b.salary - a.salary,
    value: (a, b) => b.price - a.price,
  };
  players.sort(sorting[rosterSort] || sorting.overall);
  const cards = () =>
    `<div class="roster-grid">${players.map((p) => `<article class="roster-player"><div class="row"><button class="player-jersey" data-action="edit-shirt" data-id="${esc(p.id)}" aria-label="Mudar camisa de ${esc(p.name)}">${p.shirtNumber}</button><div><h3>${esc(p.name)}</h3><small>${esc([...(p.naturalPositions || []), ...(p.secondaryPositions || [])].join(" / ") || p.pos)} · ${playerAge(p)} anos</small></div><span class="rating">${p.ovr}</span></div><div class="roster-player-state"><span>${E.discipline.suspension(p, t.selectionCompetition) ? "Suspenso · " + E.discipline.suspension(p, t.selectionCompetition) + " jogo(s)" : p.injury ? "Lesionado" : lineup.has(p.id) ? "No onze titular" : "Opção de elenco"}</span><strong>${p.fitness}% energia</strong></div><div class="money-pair"><div><small>Valor</small>${moneyValue(p.price)}</div><div><small>Salário / semana</small>${moneyValue(p.salary)}</div></div><p class="muted">${esc(E.SQUAD_ROLES[p.squadRole] || "Papel a negociar")} · contrato ${p.contract}</p><div class="row">${btn("Renovar", "renew", p.id)}${btn("Vender", "sell", p.id)}${btn("Camisa " + p.shirtNumber, "edit-shirt", p.id)}</div></article>`).join("") || "<p>Nenhum jogador corresponde aos filtros.</p>"}</div>`;
  return `<div class="hero roster-hero"><span class="badge">GESTÃO DO ELENCO</span><h2 class="identity-title">${badge(t, "large")}<span>${esc(t.name)}</span></h2><p>${t.players.length} profissionais · ${t.players.filter((p) => E.discipline.available(p, t.selectionCompetition)).length} disponíveis · ${t.players.filter((p) => p.injury).length} no departamento médico</p><div class="row">${btn("Numeração do elenco", "shirt-squad", t.players[0]?.id || "")}<button data-page="Treinamento">Preparação física →</button></div></div><section class="card"><div class="row"><h3>Jogadores e contratos</h3><div class="segmented">${btn("Tabela", "roster-view", "table", rosterView === "table" ? "active" : "")}${btn("Cartões", "roster-view", "cards", rosterView === "cards" ? "active" : "")}</div></div><form id="roster-search" class="roster-filters"><label>Buscar jogador<input id="roster-query" value="${esc(rosterQuery)}" placeholder="Nome do atleta"></label><label>Posição<select id="roster-position">${options([["all", "Todas"], ...["GOL", "LAT", "ZAG", "VOL", "MEI", "ATA"].map((x) => [x, x])], rosterPosition)}</select></label><label>Situação<select id="roster-status">${options(
    [
      ["all", "Todos"],
      ["starting", "Titulares"],
      ["injured", "Lesionados"],
      ["suspended", "Suspensos no próximo compromisso"],
      ["tired", "Desgastados"],
      ["expiring", "Contrato perto do fim"],
    ],
    rosterStatus,
  )}</select></label><label>Ordenar<select id="roster-sort">${options(
    [
      ["overall", "Overall"],
      ["name", "Nome"],
      ["age", "Idade"],
      ["salary", "Salário"],
      ["value", "Valor de mercado"],
    ],
    rosterSort,
  )}</select></label><button>Buscar</button></form><p class="muted">${players.length} atletas encontrados. Valores em reais; salários apresentados por semana.</p>${rosterView === "cards" ? cards() : playersTable(players)}<details class="source-details"><summary>Referência do elenco e contratos</summary>${rosterReferenceView(t)}<p>Renovações são negociadas com o empresário. As condições mudam apenas após o aceite e a assinatura.</p></details></section>`;
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
      return `<button class="tactic-slot ${i === tacticalSlot ? "selected" : ""} ${fit < 0.85 ? "adapted" : ""}" style="left:${Math.min(90, Math.max(10, s.x))}%;top:${s.y}%" data-action="select-tactical-slot" data-id="${i}" data-tactic-slot="${i}" ${p ? `draggable="true" data-drag-player="${esc(p.id)}"` : ""} aria-label="${esc(s.label)}: ${esc(p?.name || "Sem atleta")}${suitability ? " · " + esc(suitability.label) + " · overall " + suitability.effective : ""}"><span class="slot-position">${esc(s.label)}</span><strong>${esc(p?.name || "Vaga aberta")}</strong><small>${p ? `${suitability.effective} · ${p.fitness}%${specialists.captain?.id === p.id ? " · C" : ""}` : "Escolher atleta"}</small><span class="slot-fit">${suitability ? esc({ "Fora da posição": "Fora", "Posição geral": "Geral", Adaptado: "Adap.", Habitual: "Hab." }[suitability.label] || suitability.label) + (suitability.penalty ? " −" + suitability.penalty + "%" : "") : ""}</span><span class="slot-duty">${esc(role.duty)}</span></button>`;
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
    )}</div></div><section class="position-picker" aria-label="Escolher jogador para posição"><span class="badge">POSIÇÃO SELECIONADA</span><h3>${esc(target.label)} · ${esc(T.positionNames[T.targetPosition(target)])} · ${esc(chosen?.name || "Sem atleta")}</h3><p class="muted">${chosen ? `Posição principal: ${T.adaptation(chosen, target).natural}${chosen.secondaryPositions?.length ? " · Também joga: " + chosen.secondaryPositions.join(" / ") : ""} · ${T.adaptation(chosen, target).label}. Overall ${chosen.ovr} → ${T.adaptation(chosen, target).effective} nesta posição · adaptação ${Math.round(T.fit(chosen, target) * 100)}%` : "Escolha um atleta disponível."}</p><label for="slot-player">Jogador nesta posição<select id="slot-player">${options(
    [
      ["", "Automático"],
      ...t.players
        .filter((p) => E.discipline.available(p, t.selectionCompetition))
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
  )}</select></label></div><form id="squad-search" class="squad-search"><label>Buscar atleta<input id="squad-query" placeholder="Nome do jogador" value="${esc(squadQuery)}"></label><label>Posição de origem<select id="squad-position">${options([["all", "Todas"], ...["GOL", "LAT", "ZAG", "VOL", "MEI", "ATA"].map((v) => [v, v])], squadPosition)}</select></label><button>Buscar</button></form><div class="candidate-list">${candidates.map((p) => `<div class="candidate ${chosen?.id === p.id ? "chosen" : ""}" draggable="${E.discipline.available(p, t.selectionCompetition)}" data-drag-player="${esc(p.id)}"><div><strong>${esc(p.name)}</strong>${disciplineStatus(p)}<small>${T.adaptation(p, target).natural} · overall ${p.ovr} → ${T.adaptation(p, target).effective} · ${T.adaptation(p, target).label} · adaptação ${Math.round(T.fit(p, target) * 100)}% · ${p.injury ? "lesão " + p.injury + " dias" : p.fitness + "%"}${assigned.has(p.id) ? " · titular " + assigned.get(p.id) : ""}</small></div><div>${btn(chosen?.id === p.id ? "Escalado aqui" : "Escalar", "place-player", p.id).replace("<button ", `<button ${!E.discipline.available(p, t.selectionCompetition) || chosen?.id === p.id ? "disabled" : ""} `)}${!assigned.has(p.id) && E.discipline.available(p, t.selectionCompetition) ? btn(plan.bench.includes(p.id) ? "Retirar prioridade" : "Priorizar banco", "toggle-bench", p.id) : ""}</div></div>`).join("") || "<p>Nenhum atleta neste filtro.</p>"}</div></section></div><p class="muted">Posições principais e habituais confirmadas mantêm o overall posicional. A perda por improvisação se aplica a locais sem confirmação, inclusive ao lado oposto quando ele não está entre as posições conhecidas do atleta. PE e PD são pontas. No centro, ATA permite um atacante móvel; escolha a função Centroavante para exigir a posição específica CA. A função não muda o lado no campo. Quando a fonte só informa uma posição geral, o lado fica identificado como não informado. As posições detalhadas são referências históricas e os percentuais de adaptação são parâmetros do jogo. A escalação automática prioriza condição física e adequação ao local. O banco completa automaticamente até nove atletas, respeitando suas prioridades.</p></div><div class="card"><span class="badge">IDENTIDADE DA EQUIPE</span><h3>Instruções táticas</h3><div class="tactic-instructions">${Object.entries(
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
    )}</div><p class="muted">Mentalidade, funções e ritmo alteram as oportunidades de gol. Pressão alta e ritmo rápido aumentam o desgaste. Contra-ataques e jogo direto aproveitam espaço contra linhas altas.</p></div><div class="card"><span class="badge">LIDERANÇA E BOLAS PARADAS</span><h3>Responsáveis da equipe</h3>${captainHierarchyView(t)}<div class="set-piece-grid">${Object.entries(
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
      return `<label>${label}<select data-assignment="${key}">${options([["", skill === "leadership" ? "Hierarquia do clube / liderança" : "Automático entre titulares"], ...[...t.players].sort((a, b) => T.skills(b)[skill] - T.skills(a)[skill]).map((p) => [p.id, p.name + " · " + (skill === "leadership" ? "Liderança " : "") + T.skills(p)[skill] + "/100" + (skill === "leadership" && T.leadership.hierarchy(t).some((c) => c.id === p.id) ? " · capitania de referência" : "") + (assigned.has(p.id) ? " · titular" : " · fora do onze")])], plan.assignments[key] || "")}</select><small>Em campo: ${esc(specialists[key]?.name || "Indisponível")}</small></label>`;
    })
    .join(
      "",
    )}</div><p class="muted">A hierarquia automática usa as referências de capitania disponíveis. A nota de liderança e os atributos de cobrança são avaliações da simulação, de 0 a 100. Se o escolhido estiver lesionado ou fora do onze, entra um substituto automático; o vice assume quando o capitão não joga.</p></div>`;
}

const newsCategories = {
  all: "Todas as editorias",
  discipline: "Disciplina",
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
function pressDirectory() {
  const data = E.press.data;
  return `<details class="card press-directory"><summary>Redações e colunistas</summary><p class="muted">Conheça as redações e os colunistas que acompanham seu clube, sua liga e o mercado da bola.</p><h3>Jornais</h3><div class="press-outlets">${data.outlets.map((o) => `<article class="fictional-outlet"><span class="badge">REDAÇÃO</span><strong>${esc(o.name)}</strong><small>${esc(o.focus)}</small></article>`).join("")}</div><h3>Jornalistas</h3><div class="press-profiles">${data.journalists
    .map(
      (p) =>
        `<article><span class="press-initials" aria-hidden="true">${esc(
          p.name
            .split(" ")
            .slice(0, 2)
            .map((n) => n[0])
            .join(""),
        )}</span><div><h4>${esc(p.name)}</h4><p>${esc(p.focus)}</p><small>${esc(data.outlets.find((o) => o.id === p.outletId).name)}</small></div><button data-action="press-follow" data-id="${p.id}">Ver reportagens</button></article>`,
    )
    .join("")}</div></details>`;
}
function realAwardCriteria() {
  const c = E.press.data.awardCriteria,
    start = state.performance?.criteriaStarted;
  return `<section class="card real-award-criteria" id="award-real-criteria" tabindex="-1"><div class="row"><div><span class="badge">REFERÊNCIA DA PREMIAÇÃO REAL</span><h3>O que inspira a Bola de Ouro da carreira</h3></div><a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">Consultar critérios oficiais ↗</a></div><div class="criteria-pillars">${c.pillars.map((p) => `<article><span class="criteria-order">0${p.order}</span><h4>${esc(p.name)}</h4><p>${esc(p.description)}</p><small>${esc(p.application)}</small></article>`).join("")}</div><p class="muted">A ordem de referência começa pelo desempenho individual. O jogo adapta esses pilares a estatísticas; não simula votos de jornalistas reais.</p><details><summary>Fair play e cartões</summary><p>Amarelo: −0,15 ponto; expulsão por dois amarelos: −1,25 adicional; vermelho direto: −2,5. Desconto total limitado a 20 pontos por apuração. As notas da partida também caem com os cartões.</p><p>Apenas cartões acompanhados nesta versão entram na avaliação. Prêmios já entregues mantêm o resultado anterior.</p></details><details><summary>Novos pontos por atuações decisivas</summary><p>O gol da vitória é o gol de número “gols sofridos + 1” do time vencedor: vale ${note(c.winningGoalPoints)} ponto(s). A assistência nesse gol vale ${note(c.winningAssistPoints)}. Ser melhor em campo nas quartas, semifinais ou final de uma copa continental vale ${note(c.knockoutMvpPoints)}.</p><p>O bônus de atuações decisivas é limitado a ${c.decisivenessCap} pontos por apuração. Jogos empatados não geram gol da vitória; amistosos continuam fora dos rankings oficiais. Apenas gols acompanhados depois desta atualização contam.${start ? " Início desse acompanhamento: " + E.formatDate({ ...state, season: start.season }, start.offset) + "." : ""}</p></details></section>`;
}

function newspaper() {
  const articles = E.journal(state, newsScope, newsCategory, {
      outlet: newsOutlet,
      journalist: newsJournalist,
      query: newsQuery,
    }),
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
        : newsScope === "world"
          ? "Futebol mundial"
          : regions[ownLeague.region];
  return `<section class="newspaper"><div class="paper-masthead"><div><span class="badge">O FUTEBOL ACONTECE AQUI</span><h2>DINASTIA <em>Jornal</em></h2></div><span>${esc(E.date(state))}<br>Temporada ${E.seasonLabel(state)}</span></div><div class="paper-edition"><strong>${esc(scopeLabel)}</strong><span>Notícias do universo da sua carreira</span></div><div class="news-toolbar"><div class="scope-filters" role="group" aria-label="Abrangência das notícias">${[
    ["club", "Meu clube"],
    ["league", "Minha liga"],
    ["continent", "Meu continente"],
    ["world", "Mundo"],
  ]
    .map(
      ([id, label]) =>
        `<button data-action="news-scope" data-id="${id}" class="${id === newsScope ? "active" : ""}" aria-pressed="${id === newsScope}">${label}</button>`,
    )
    .join(
      "",
    )}</div><label class="inline">Editoria<select id="news-category">${options(Object.entries(newsCategories), newsCategory)}</select></label></div><form id="press-search" class="press-filters"><label>Jornal<select id="news-outlet">${options([["all", "Todos os jornais"], ...E.press.data.outlets.map((o) => [o.id, o.name])], newsOutlet)}</select></label><label>Jornalista<select id="news-journalist">${options([["all", "Todos os jornalistas"], ...E.press.data.journalists.filter((p) => newsOutlet === "all" || p.outletId === newsOutlet).map((p) => [p.id, p.name])], newsJournalist)}</select></label><label>Buscar no jornal<input id="news-query" type="search" value="${esc(newsQuery)}" placeholder="Jogador, treinador, clube…"></label><button class="primary">Filtrar</button>${btn("Limpar", "press-clear").replace("<button ", '<button type="button" ')}</form><p class="muted press-results">${articles.length} matérias nesta edição</p>
    <div class="news-grid">${
      articles
        .map(
          (a, i) =>
            `<article class="news-article ${i === 0 ? "news-featured" : ""}" data-article="${esc(a.id)}" data-clubs="${esc(a.clubIds.join(" "))}"><div class="press-source"><strong>${esc(a.press.outlet.name)}</strong><small>${esc(newsCategories[a.category] || "Futebol")}</small></div><div class="article-meta"><span>${newsCategories[a.category] || "Clube"}</span><time>${esc(E.formatDate({ ...state, season: a.season }, a.offset ?? E.calendar(state)[a.day]?.offset ?? 0))}</time></div><h3>${esc(a.title)}</h3>${
              i === 0 && a.clubIds.length
                ? `<div class="article-lead-art">${a.clubIds
                    .slice(0, 2)
                    .map(
                      (id, j) =>
                        (j ? '<span aria-hidden="true">×</span>' : "") +
                        badge(team(id), "large"),
                    )
                    .join("")}</div>`
                : ""
            }${a.body ? `<p>${esc(a.body)}</p>` : ""}<div class="article-clubs">${a.clubIds.map((id) => teamLabel(id, "tiny")).join("")}</div><footer class="article-reference"><strong>${a.press.byline}</strong><span>${esc(a.press.outlet.name)}</span></footer>${btn("Ler reportagem →", "read-news", a.id, "read-news-button")}</article>`,
        )
        .join("") ||
      '<div class="news-empty"><h3>Nenhuma notícia nesta seleção</h3><p class="muted">Amplie a abrangência ou limpe os filtros para acompanhar outras coberturas da carreira.</p><button data-action="news-scope" data-id="world">Ver o mundo</button></div>'
    }</div>${pressDirectory()}</section>`;
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
let match3D = null,
  matchCamera = state.matchPreferences?.camera || "broadcast",
  matchZoom = state.matchPreferences?.zoom || 1;
function syncFieldControls() {
  if ($("#match-camera")) $("#match-camera").value = matchCamera;
  document
    .querySelectorAll(
      '[data-action="field-follow"], [data-action="view-follow"]',
    )
    .forEach((el) => {
      el.textContent =
        matchCamera === "follow" ? "Campo inteiro" : "Seguir bola";
      el.setAttribute("aria-pressed", String(matchCamera === "follow"));
    });
  if ($("#field-zoom-value"))
    $("#field-zoom-value").textContent = Math.round(matchZoom * 100) + "%";
  const minus = document.querySelector('[data-action="zoom-out"]'),
    plus = document.querySelector('[data-action="zoom-in"]');
  if (minus) minus.disabled = matchZoom <= 0.75;
  if (plus) plus.disabled = matchZoom >= 2.25;
}
function saveFieldPreferences() {
  state.matchPreferences = {
    speed,
    ...state.matchPreferences,
    camera: matchCamera,
    zoom: matchZoom,
  };
  scheduleSave();
}
let activeReplay = null;
let animatingPlay = false,
  visualGeneration = 0,
  liveScoreHold = null;
function scoreboard(f, goals = [0, 0]) {
  return `<div class="match-scoreboard"><div class="score-team home"><div><strong>${esc(name(f.pair[0]))}</strong><small>MANDANTE</small></div>${badge(team(f.pair[0]), "large")}</div><div class="score-centre"><strong>${goals[0]} <span>×</span> ${goals[1]}</strong></div><div class="score-team away">${badge(team(f.pair[1]), "large")}<div><strong>${esc(name(f.pair[1]))}</strong><small>VISITANTE</small></div></div></div>`;
}
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
      (p) =>
        E.discipline.available(p, m.competition) &&
        !starters.has(p.id) &&
        !used.has(p.id),
    ) || [];
  return `<section class="match-centre"><header class="match-heading"><span class="badge">${esc(f.name)}</span><div id="match-minute">${m ? m.minute + "’" : "PRÉ-JOGO"} · ${half ? "INTERVALO" : m?.done ? "ENCERRADO" : m?.secondHalfStarted || m?.minute > 45 ? "SEGUNDO TEMPO" : "PRIMEIRO TEMPO"}</div><div class="score">${scoreboard(f, m?.goals || [0, 0])}</div><div class="match-progress"><i style="width:${((m?.minute || 0) / 90) * 100}%"></i></div></header><div class="match-controls">${controls}<label>Visualização<select id="mode">${options(
    [
      ["2d", "Campo 2D"],
      ["3d", "Campo 3D"],
      ["text", "Relato e estatísticas"],
    ],
    matchMode,
  )}</select></label><label class="camera-control">Câmera 3D<select id="match-camera">${options(
    [
      ["broadcast", "Transmissão"],
      ["tactical", "Tática aérea"],
      ["goal", "Atrás do gol"],
      ["follow", "Acompanhar a bola"],
    ],
    matchCamera,
  )}</select></label><label class="camera-control quality-control">Qualidade 3D<select id="match-quality">${options(
    [
      ["auto", "Automática"],
      ["low", "Leve"],
      ["high", "Detalhada"],
    ],
    state.matchPreferences?.quality || "auto",
  )}</select></label></div><div class="match-workspace"><div><div id="event-announcement" class="goal-announcement" aria-live="assertive"></div><div class="play-caption" id="play-caption" aria-live="polite">${half ? "Intervalo: faça os ajustes e inicie o segundo tempo." : m?.done ? "Fim de jogo. Confira os melhores momentos." : "Acompanhe a bola e a construção das jogadas."}</div><div id="field-shell" class="field-shell"><div class="expanded-field-toolbar"><strong>${esc(name(f.pair[0]))} × ${esc(name(f.pair[1]))}</strong><div><button data-action="field-follow" ${m?.mode === "3d" ? "" : "hidden"}>${matchCamera === "follow" ? "Campo inteiro" : "Seguir bola"}</button><button data-action="field-pause" ${!m || m.done ? "disabled" : ""}>${m?.minute === 45 && !m.secondHalfStarted ? "Iniciar 2º tempo" : paused ? "Retomar" : "Pausar"}</button><button data-action="match-expand">Voltar</button></div></div><div id="field"><div class="match-empty-field"><strong>Prepare o seu time.</strong><span>Inicie a partida para acompanhar a bola em 2D ou 3D.</span></div></div><div class="field-view-controls" ${m?.mode === "3d" ? "" : "hidden"} role="group" aria-label="Visualização do campo 3D"><button data-action="view-follow" aria-pressed="${matchCamera === "follow"}">${matchCamera === "follow" ? "Campo inteiro" : "Seguir bola"}</button><div class="field-zoom" role="group" aria-label="Zoom do campo"><button data-action="zoom-out" aria-label="Afastar campo" ${matchZoom <= 0.75 ? "disabled" : ""}>−</button><button data-action="zoom-reset" aria-label="Restaurar enquadramento"><output id="field-zoom-value">${Math.round(matchZoom * 100)}%</output></button><button data-action="zoom-in" aria-label="Aproximar campo" ${matchZoom >= 2.25 ? "disabled" : ""}>+</button></div></div><button class="field-expand" data-action="match-expand" ${m?.plans ? "" : "disabled"}>Ampliar campo ↗</button></div><p id="field-help" class="muted" ${m?.mode === "3d" ? "" : "hidden"}>Use + e − para aproximar ou afastar. Seguir bola acompanha o lance de perto; toque em um jogador para ver seu nome.</p><p class="muted">${half ? "O relógio está parado no intervalo." : playing && paused ? "Partida pausada." : "O lance desacelera nas finalizações; o placar atualiza quando a bola chega ao gol."}</p><div class="match-stats" id="stats"></div>${m?.goalReplays?.length ? `<div class="card"><h3>Gols e replays</h3><div class="row">${m.goalReplays.map((p, i) => btn(`${p.minute}’ · ${esc(p.playerName)}`, "replay-goal", String(i))).join("")}</div></div>` : ""}</div><aside><section class="card"><h3>Relato da partida</h3><div class="log" id="log" aria-live="off"></div></section></aside></div>${
    plan && playing
      ? `<section class="card"><h3>Banco do treinador</h3><p>${(m.substitutions || []).filter((x) => x.side === side).length} de 5 substituições. Pause para escolher a troca.</p><form id="substitution-form" class="substitution-form"><label>Sai<select name="out">${options(
          E.discipline
            .active(plan)
            .map((p) => [
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
  }<div id="match-discipline">${matchDisciplineView(m)}</div><section class="card match-ratings-card"><div class="row"><h3>Notas e desempenho</h3><span class="pill">${m?.done ? "Avaliação final" : "Em avaliação"}</span></div><div id="match-ratings">${matchRatingsView(m)}</div></section>${m?.plans ? `<details class="card"><summary>Escalações e condição física</summary>${m.plans.map((p) => `<h3>${esc(p.name)}</h3><div class="live-player-list">${p.starters.map((x) => `<span>${esc(x.name)}${x.sentOff ? ' <b class="discipline-red">Expulso</b>' : ""}<small>${E.matchFitness(x, m, p.fatigue)}% · ${x.pos}</small></span>`).join("")}</div>`).join("")}</details>` : ""}<p class="muted">O campo ilustra os lances gerados pelo motor da partida. Condição é preparo físico: diminui com minutos e intensidade, e se recupera com descanso.</p></section>`;
}
function draw() {
  const m = state.live;
  if (!m) return;
  if ($("#field-help")) $("#field-help").hidden = m.mode !== "3d";
  if ($(".field-view-controls"))
    $(".field-view-controls").hidden = m.mode !== "3d";
  const followControl = document.querySelector('[data-action="field-follow"]');
  if (followControl) followControl.hidden = m.mode !== "3d";
  if (!m.plans) m.plans = E.matchPlans(state, m);
  const hold = liveScoreHold?.match === m ? liveScoreHold.goals : m.goals;
  if ($("#match-ratings") && !animatingPlay)
    $("#match-ratings").innerHTML = matchRatingsView(m);
  if ($("#match-minute"))
    $("#match-minute").textContent =
      `${m.minute}’ · ${m.done ? "ENCERRADO" : m.minute === 45 && !m.secondHalfStarted ? "INTERVALO" : m.secondHalfStarted || m.minute > 45 ? "SEGUNDO TEMPO" : "PRIMEIRO TEMPO"}`;
  if ($(".score")) $(".score").innerHTML = scoreboard(m, hold);
  if ($("#match-discipline"))
    $("#match-discipline").innerHTML = matchDisciplineView(m);
  document
    .querySelectorAll("#substitution-form select[name=out] option")
    .forEach((o) => {
      if (m.discipline?.reds.includes(o.value)) o.remove();
    });
  const possession = m.possession || [0, 0],
    sum = Math.max(1, possession[0] + possession[1]);
  const matchLines = E.performance.lines(m);
  const statFor = (side, key) =>
    matchLines
      .filter((p) => p.side === side)
      .reduce((n, p) => n + (p[key] || 0), 0);
  if ($("#stats"))
    $("#stats").innerHTML =
      `<div><small>Finalizações</small><strong>${m.shots.join(" × ")}</strong></div><div><small>Chutes no alvo</small><strong>${statFor(0, "onTarget")} × ${statFor(1, "onTarget")}</strong></div><div><small>Defesas</small><strong>${statFor(0, "saves")} × ${statFor(1, "saves")}</strong></div><div><small>Posse de bola</small><strong>${Math.round((possession[0] / sum) * 100)}% × ${Math.round((possession[1] / sum) * 100)}%</strong></div><div><small>Faltas</small><strong>${(m.discipline?.fouls || [0, 0]).join(" × ")}</strong></div><div><small>Amarelos</small><strong>${statFor(0, "yellowCards")} × ${statFor(1, "yellowCards")}</strong></div><div><small>Expulsões</small><strong>${statFor(0, "redCards")} × ${statFor(1, "redCards")}</strong></div>${m.penalties ? `<div><small>Pênaltis</small><strong>${m.penalties.join(" × ")}</strong></div>` : ""}`;
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
  const shownPlay = activeReplay || m.lastPlay,
    cached = liveFrames.get(m),
    valid = new Set(
      m.plans.flatMap((p) => E.discipline.active(p).map((p) => p.id)),
    );
  let view =
    cached && cached.playId === shownPlay?.id
      ? cached.view
      : shownPlay
        ? E.matchFrame(m, shownPlay, 0)
        : E.matchVisual(m, null);
  if (!activeReplay && view.positions.some((p) => !valid.has(p.id)))
    view = E.matchVisual(m, null);
  view = {
    ...view,
    positions: view.positions.filter((p) => !m.discipline?.reds.includes(p.id)),
  };
  view.activeId ||= shownPlay?.playerId;
  const kits = matchKits(m);
  document
    .querySelector(".camera-control")
    ?.classList.toggle("camera-visible", m.mode === "3d");
  document
    .querySelector(".quality-control")
    ?.classList.toggle("camera-visible", m.mode === "3d");
  if (m.mode === "text") {
    match3D?.dispose();
    match3D = null;
    if ($(".field-expand")) $(".field-expand").hidden = true;
    const latest = m.events.find(
      (e) =>
        !(
          liveScoreHold?.match === m &&
          e.startsWith(m.minute + "'") &&
          e.includes("GOL")
        ),
    );
    $("#field").innerHTML =
      `<div class="match-text-scene"><span class="badge">RELATO AO VIVO · ${m.minute} MIN</span><h3>${esc(latest || "A bola está rolando.")}</h3><p>${teamLabel(m.pair[m.possessionSide || 0], "small")} · acompanhe os lances e as estatísticas</p></div>`;
    return;
  }
  if ($(".field-expand")) $(".field-expand").hidden = false;
  if (m.mode === "3d") {
    if (!$("#three-stage")) {
      match3D?.dispose();
      $("#field").innerHTML =
        '<div id="three-stage" class="three-stage"></div>';
      match3D = null;
    }
    try {
      if (!match3D) {
        match3D = LegacyMatch3D.create($("#three-stage"), {
          quality: state.matchPreferences?.quality || "auto",
        });
        match3D.setCamera(matchCamera, matchZoom);
      }
      match3D.update(view, kits, m.ballPosition || view.ball);
      return;
    } catch (error) {
      match3D?.dispose();
      match3D = null;
      m.mode = "2d";
      matchMode = "2d";
      $("#mode").value = "2d";
      if ($(".field-view-controls")) $(".field-view-controls").hidden = true;
      if ($("#field-help")) $("#field-help").hidden = true;
      if (followControl) followControl.hidden = true;
      document
        .querySelectorAll(".camera-control")
        .forEach((el) => el.classList.remove("camera-visible"));
      notify("O 3D não está disponível neste navegador. Campo 2D ativado.");
    }
  }
  match3D?.dispose();
  match3D = null;
  const newPitch = !$("#pitch");
  if (newPitch)
    $("#field").innerHTML =
      `<div class="pitch match-pitch" id="pitch"><svg class="pitch-markings" viewBox="0 0 105 68" preserveAspectRatio="none" aria-hidden="true"><path d="M1 1H104V67H1ZM52.5 1V67M1 13.84H17.5V54.16H1M104 13.84H87.5V54.16H104M1 24.84H6.5V43.16H1M104 24.84H98.5V43.16H104"/><circle cx="52.5" cy="34" r="9.15"/><circle cx="52.5" cy="34" r=".35"/><circle cx="12" cy="34" r=".35"/><circle cx="93" cy="34" r=".35"/></svg><div class="goal-net left"></div><div class="goal-net right"></div><svg class="play-trail" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline id="ball-trail" points=""/></svg>${Array.from({ length: 22 }, (_, i) => `<span class="dot ${i >= 11 ? "away" : ""}" id="dot-${i}">${(i % 11) + 1}</span>`).join("")}<span class="dot ball" id="ball" aria-label="Bola"></span><span class="pitch-label">AO VIVO · 2D</span></div>`;
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
  const first = E.matchFrame(m, play, 0);
  liveFrames.set(m, { playId: play.id, view: first });
  m.ballPosition = { x: play.path[0].x, y: play.path[0].y };
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
    const duration =
      i === path.length - 1 && play.type !== "build-up"
        ? Math.max(900, step)
        : step;
    const moving = E.matchFrame(m, play, i);
    moving.duration = duration;
    liveFrames.set(m, { playId: play.id, view: moving });
    if (match3D) match3D.update(moving, matchKits(m), i ? null : point);
    else
      for (const p of moving.positions) {
        const dot = $("#dot-" + (p.side * 11 + p.index));
        if (dot) {
          dot.style.transitionDuration = duration + "ms";
          dot.style.left = p.x + "%";
          dot.style.top = p.y + "%";
          dot.classList.toggle("receiving", p.id === point.playerId);
        }
      }
    if (match3D)
      match3D.moveBall(
        point,
        duration,
        i === path.length - 1 && play.type !== "build-up",
      );
    if (ball) {
      ball.style.transitionDuration =
        (i === path.length - 1 && play.type !== "build-up"
          ? Math.max(900, step)
          : step) + "ms";
      ball.classList.toggle(
        "is-shooting",
        i === path.length - 1 && play.type !== "build-up",
      );
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
    match3D?.celebrate(play.side);
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
  if (m.discipline?.forfeit) {
    act(() => E.advance(state));
    return;
  }
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
const parseOfferMoney = LegacyMoney.parse;
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
  decorateMoneyInputs($("#deal"));
  $("#deal").showModal();
}
function openShirtDialog(id) {
  const players = [...team().players, ...team().youth],
    p = players.find((p) => p.id === id);
  if (!p) throw Error("Jogador indisponível.");
  const used = new Map(
      players.filter((x) => x.id !== id).map((x) => [x.shirtNumber, x]),
    ),
    free = 99 - used.size;
  $("#deal-form").innerHTML =
    `<section class="shirt-editor"><header class="offer-heading"><div><span class="badge">NUMERAÇÃO DO ELENCO</span><h2>${esc(p.name)}</h2><p>Escolha uma camisa disponível para esta temporada.</p></div></header><label>Jogador<select id="shirt-player">${options(
      players.map((x) => [x.id, x.shirtNumber + " · " + x.name]),
      id,
    )}</select></label><div class="jersey-workspace"><aside class="jersey-preview"><div class="jersey-shape"><small>${esc(team().name)}</small><strong class="shirt-preview-number">${p.shirtNumber || "—"}</strong><span>${esc(p.name.split(" ").slice(-1)[0])}</span></div><span class="pill">${free} números disponíveis</span><label>Novo número<input name="shirt" type="number" min="1" max="99" step="1" value="${p.shirtNumber || 1}" required></label></aside><div><div class="row shirt-legend"><span>Disponível</span><span>Ocupado</span><span>Atual</span></div><div class="shirt-grid" role="group" aria-label="Números de camisa">${Array.from(
      { length: 99 },
      (_, i) => {
        const n = i + 1,
          owner = used.get(n);
        return `<button type="button" data-shirt-choice="${n}" aria-pressed="${n === p.shirtNumber}" ${owner ? "disabled" : ""} title="${owner ? esc(owner.name) : "Número disponível"}" aria-label="Camisa ${n}${owner ? " · ocupada por " + esc(owner.name) : " disponível"}"><strong>${n}</strong>${owner ? `<small>${esc(owner.name.split(" ").slice(-1)[0])}</small>` : ""}</button>`;
      },
    ).join(
      "",
    )}</div></div></div><p class="muted">Profissional e base compartilham a numeração. Os números ocupados ficam identificados pelo jogador.</p><p id="deal-error" class="error" role="alert"></p><div class="dialog-footer"><button type="button" data-action="close-dialog">Cancelar</button><button class="primary">Confirmar número</button></div></section>`;
  const preview = () => {
    const value = Number($("#deal [name=shirt]").value);
    $(".shirt-preview-number").textContent =
      Number.isInteger(value) && value >= 1 && value <= 99 ? value : "—";
    $("#deal")
      .querySelectorAll("[data-shirt-choice]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(Number(b.dataset.shirtChoice) === value),
        ),
      );
  };
  $("#deal-form").oninput = preview;
  $("#deal-form").onclick = (e) => {
    const b = e.target.closest("[data-shirt-choice]");
    if (b && !b.disabled) {
      $("#deal [name=shirt]").value = b.dataset.shirtChoice;
      preview();
    }
  };
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
  if (!$("#deal").open) $("#deal").showModal();
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
  decorateMoneyInputs($("#deal"));
  $("#deal").showModal();
  $("#deal-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      if (kind === "renew")
        E.renew(
          state,
          id,
          Number(f.get("years")),
          LegacyMoney.parse(f.get("salary")),
        );
      if (kind === "sell")
        E.sell(state, id, f.get("buyer"), LegacyMoney.parse(f.get("fee")));
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
  const tab = event.target.closest('[role="tab"][data-section]');
  if (!tab || !["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key))
    return;
  event.preventDefault();
  const tabs = [...tab.parentElement.querySelectorAll('[role="tab"]')],
    i = tabs.indexOf(tab),
    next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (i + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
  const id = tabs[next].id;
  tabs[next].click();
  document.getElementById(id)?.focus();
});
document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-page]");
  if (nav) {
    if ($("#quick-menu").open) $("#quick-menu").close();
    if (
      page === "Dia de jogo" &&
      nav.dataset.page !== page &&
      state.live &&
      !state.live.done
    ) {
      paused = true;
      stopTimer();
    }
    const group =
      nav.dataset.workspace &&
      NAV.groups.find((g) => g.id === nav.dataset.workspace);
    const remembered = group?.sections.find(
      (x) => x.key === sectionMemory.get(group.id),
    );
    const targetPage = remembered?.page || nav.dataset.page,
      targetSquad =
        targetPage === "Elenco"
          ? remembered?.squadTab || nav.dataset.squadTab || squadTab
          : squadTab;
    if (targetPage === page && targetSquad === squadTab) {
      if (!nav.dataset.section) resetPageScroll();
      return;
    }
    page = targetPage;
    squadTab = targetSquad;
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
    const focusTab = nav.dataset.section ? nav.id : null;
    render();
    if (focusTab) {
      const selected = document.getElementById(focusTab);
      selected?.focus({ preventScroll: true });
      selected?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "instant",
      });
    } else resetPageScroll();
    return;
  }
  const b = event.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action,
    id = b.dataset.id;
  if (a === "read-news") {
    openNews(id);
    return;
  }
  if (a === "close-news-reader") {
    $("#news-reader").close();
    return;
  }
  if (a === "history-type") {
    honourFilters.type = id;
    honourFilters.competition = "all";
    honourFilters.award = "all";
    honourPage = 0;
    render();
    return;
  }
  if (a === "history-page") {
    honourPage = Math.max(0, honourPage + Number(id));
    render();
    return;
  }
  if (a === "history-clear") {
    honourFilters = {
      ...honourFilters,
      competition: "all",
      season: "all",
      club: "all",
      award: "all",
      query: "",
      preseason: false,
    };
    honourPage = 0;
    render();
    return;
  }
  if (a === "match-expand") {
    const shell = $("#field-shell"),
      expanded = shell.classList.toggle("is-expanded");
    document.body.classList.toggle("pitch-expanded", expanded);
    match3D?.setCamera(matchCamera, matchZoom);
    return;
  }
  if (["zoom-in", "zoom-out", "zoom-reset"].includes(a)) {
    matchZoom =
      a === "zoom-reset"
        ? 1
        : Math.max(
            0.75,
            Math.min(2.25, matchZoom + (a === "zoom-in" ? 0.25 : -0.25)),
          );
    if (a === "zoom-reset") matchCamera = "broadcast";
    match3D?.setCamera(matchCamera, matchZoom);
    syncFieldControls();
    saveFieldPreferences();
    return;
  }
  if (a === "field-follow" || a === "view-follow") {
    matchCamera = matchCamera === "follow" ? "broadcast" : "follow";
    if (matchCamera === "broadcast") matchZoom = 1;
    match3D?.setCamera(matchCamera, matchZoom);
    if ($("#match-camera")) $("#match-camera").value = matchCamera;
    syncFieldControls();
    saveFieldPreferences();
    return;
  }
  if (a === "field-pause") {
    if (state.live && !state.live.done) {
      if (state.live.minute === 45 && !state.live.secondHalfStarted) {
        E.startSecondHalf(state);
        paused = false;
        scheduleSave();
      } else paused = !paused;
      runTimer();
      b.textContent = paused ? "Retomar" : "Pausar";
    }
    return;
  }
  if (a === "quick-menu") {
    openQuickMenu();
    return;
  }
  if (a === "close-quick-menu") {
    $("#quick-menu").close();
    return;
  }
  if (a === "toggle-sidebar") {
    document.body.classList.toggle("compact-navigation");
    b.setAttribute(
      "aria-expanded",
      String(!document.body.classList.contains("compact-navigation")),
    );
    return;
  }
  if (a === "close-calendar-dialog") {
    $("#calendar-dialog").close();
    return;
  }
  if (a === "show-award-criteria") {
    const section = $("#award-real-criteria");
    section?.focus({ preventScroll: true });
    section?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    return;
  }
  if (a === "awards-page") {
    awardsPage = Math.max(0, awardsPage + Number(id));
    render();
    return;
  }
  if (a === "awards-competition") {
    awardsKind = "competition";
    awardsCompetition = id;
    awardsPage = 0;
    page = "Prêmios";
    render();
    return;
  }
  if (a === "training-layout") {
    trainingLayout = id;
    render();
    return;
  }
  if (a === "arrange-friendly") {
    openFriendlyDialog(false);
    return;
  }
  if (a === "organize-preseason") {
    openFriendlyDialog(true);
    return;
  }
  if (a === "shirt-squad") {
    openShirtDialog(id);
    return;
  }
  if (a === "roster-view") {
    rosterView = id;
    render();
    return;
  }
  if (a === "scout-compare") {
    if (scoutCompare.includes(id))
      scoutCompare = scoutCompare.filter((x) => x !== id);
    else if (scoutCompare.length < 3) scoutCompare.push(id);
    else {
      notify("Compare até três atletas por vez.");
      return;
    }
    render();
    return;
  }
  if (a === "scout-shortlist") {
    act(() => E.scouting.toggleShortlist(state, id));
    return;
  }

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
        new Date(E.schedule.anchor(state)).getUTCMonth(),
        Math.min(
          new Date(E.schedule.anchor(state)).getUTCMonth() + 11,
          (calendarMonth ?? new Date(E.schedule.anchor(state)).getUTCMonth()) +
            Number(id),
        ),
      );
      calendarSelected = Math.round(
        (Date.UTC(state.season, calendarMonth, 1) - E.schedule.anchor(state)) /
          86400000,
      );
    }
    if (a === "calendar-select") calendarSelected = Number(id);
    if (a === "calendar-mode") calendarMode = id;
    if (a === "calendar-today") {
      calendarMonth =
        new Date(
          E.schedule.anchor(state) + state.today * 86400000,
        ).getUTCMonth() +
        (E.schedule.at(state).getUTCFullYear() - state.season) * 12;
      calendarSelected = state.today;
    }
    if (a === "scout-scope") {
      scoutScope = id;
      scoutReport = "";
      scoutCompare = [];
    }
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
  if (a === "press-clear") {
    newsOutlet = "all";
    newsJournalist = "all";
    newsQuery = "";
    render();
    return;
  }
  if (a === "press-follow") {
    const p = E.press.data.journalists.find((p) => p.id === id);
    if (p) {
      newsOutlet = p.outletId;
      newsJournalist = id;
      newsScope = "world";
      newsCategory = "all";
      newsQuery = "";
      render();
    }
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
      case "cancel-friendly":
        E.cancelFriendly(state, id);
        break;
      case "cancel-preseason":
        E.cancelPreseason(state, id);
        break;
      case "reference-calendar":
        calendarView = "reference";
        break;
      case "career-calendar":
        calendarView = "career";
        break;
      case "begin":
        E.start(
          state,
          $("#start-club").value,
          readProfile("start"),
          setupMode,
          {
            calendar:
              $("#start-calendar").value === "regional"
                ? "regional"
                : "classic",
          },
        );
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
        if (!state.live) E.makeMatch(state, matchMode);
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
  if (el.id.startsWith("history-")) {
    const key = el.id.slice(8);
    if (["season", "competition", "club", "award", "preseason"].includes(key)) {
      honourFilters[key] = key === "preseason" ? el.checked : el.value;
      honourPage = 0;
      render();
      return;
    }
  }
  if (el.id === "match-quality") {
    state.matchPreferences = {
      speed,
      mode: matchMode,
      camera: matchCamera,
      ...state.matchPreferences,
      quality: el.value,
    };
    match3D?.dispose();
    match3D = null;
    scheduleSave();
    draw();
    return;
  }
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
  if (el.id === "start-calendar") {
    setupCalendar = el.value;
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
  if (el.id === "news-outlet") {
    newsOutlet = el.value;
    newsJournalist = "all";
    render();
    return;
  }
  if (el.id === "news-journalist") {
    newsJournalist = el.value;
    const p = E.press.data.journalists.find((p) => p.id === el.value);
    if (p) newsOutlet = p.outletId;
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
  if (el.id === "match-camera") {
    matchCamera = el.value;
    match3D?.setCamera(matchCamera, matchZoom);
    syncFieldControls();
    saveFieldPreferences();
    return;
  }
  if (el.id === "shirt-player") {
    openShirtDialog(el.value);
    return;
  }
  if (el.dataset.trainingDay !== undefined) {
    act(() =>
      E.training.setDay(state, Number(el.dataset.trainingDay), el.value),
    );
    return;
  }
  if (el.dataset.trainingFocus) {
    act(() => E.training.setFocus(state, el.dataset.trainingFocus, el.value));
    return;
  }
  if (["awards-kind", "awards-competition", "awards-scope"].includes(el.id)) {
    if (el.id === "awards-kind") awardsKind = el.value;
    if (el.id === "awards-competition") awardsCompetition = el.value;
    if (el.id === "awards-scope") awardsScope = el.value;
    awardsPage = 0;
    render();
    return;
  }
  if (el.id === "training-filter") {
    trainingFilter = el.value;
    render();
    return;
  }
  if (["roster-position", "roster-status", "roster-sort"].includes(el.id)) {
    rosterPosition = $("#roster-position").value;
    rosterStatus = $("#roster-status").value;
    rosterSort = $("#roster-sort").value;
    render();
    return;
  }
  if (el.id === "scout-report") {
    scoutReport = el.value;
    render();
    return;
  }
  if (el.id === "mode") {
    matchMode = el.value;
    state.matchPreferences = { ...state.matchPreferences, mode: matchMode };
    if (state.live) {
      state.live.mode = el.value;
      scheduleSave();
      draw();
    }
    return;
  }
  if (el.id === "speed") {
    speed = Number(el.value);
    state.matchPreferences = { ...state.matchPreferences, speed };
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
  if (event.target.id === "history-search") {
    event.preventDefault();
    honourFilters.query = $("#history-query").value.trim();
    honourPage = 0;
    render();
    return;
  }
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
  if (event.target.id === "press-search") {
    event.preventDefault();
    newsQuery = $("#news-query").value.trim();
    render();
    return;
  }
  if (event.target.id === "roster-search") {
    event.preventDefault();
    rosterQuery = $("#roster-query").value.trim();
    render();
    return;
  }
  if (event.target.id === "scouting-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    act(() => {
      E.scouting.start(state, {
        scope: scoutScope,
        position: form.get("position"),
        maxFee: LegacyMoney.parse(form.get("maxFee")),
        maxAge: Number(
          form.get("maxAge") || (scoutScope === "youth" ? 21 : 45),
        ),
        minAge: Number(form.get("minAge") || 15),
        minOverall: Number(form.get("minOverall") || 0),
        maxSalary: LegacyMoney.parse(form.get("maxSalary")),
        profile: form.get("profile"),
        depth: form.get("depth"),
        region: form.get("region"),
        league: form.get("league"),
        nationality: form.get("nationality"),
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
        LegacyMoney.parse($("#test-funds-amount").value),
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
        LegacyMoney.parse($("#fund-budget-amount").value),
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
        LegacyMoney.parse($("#budget-transfer").value),
        LegacyMoney.parse($("#budget-wage").value),
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
const preserveOnExit = () => {
  if (!loadError && autosaver.dirty) persist();
};
window.addEventListener("pagehide", preserveOnExit);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") preserveOnExit();
});
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
let trainingFilter = "all",
  trainingLayout = "cards";
function trainingView() {
  const t = team(),
    all = [...t.players, ...t.youth],
    next = E.upcomingFixture(state),
    remaining = next ? next.offset - state.today : null,
    session = E.training.session(state, remaining),
    schedule = E.training.ensure(state),
    today = E.training.weekday(state),
    average = Math.round(
      all.reduce((n, p) => n + p.fitness, 0) / Math.max(1, all.length),
    ),
    fatigue = Math.round(
      all.reduce((n, p) => n + (p.fatigue || 0), 0) / Math.max(1, all.length),
    );
  const players = all.filter(
    (p) =>
      trainingFilter === "all" ||
      (trainingFilter === "tired" &&
        (p.fitness < 85 || (p.fatigue || 0) > 50)) ||
      (trainingFilter === "youth" && t.youth.includes(p)) ||
      (trainingFilter === "injured" && p.injury),
  );
  return `<div class="hero training-hero"><span class="badge">CENTRO DE TREINAMENTO · NÍVEL ${t.facility}</span><h2>Prepare o próximo jogo.</h2><p>Distribua a carga, recupere os titulares e trabalhe os fundamentos. O planejamento automático alivia a véspera dos jogos.</p><div class="row"><span class="pill">Hoje · ${esc(session.label)}</span><label>Plano geral<select id="training">${options(
    ["Técnica", "Intensivo", "Recuperação"].map((v) => [v, v]),
    state.training,
  )}</select></label></div></div><div class="grid">${metric("ENERGIA MÉDIA", average + "%", all.filter((p) => p.fitness >= 90 && !p.injury).length + " atletas prontos")}${metric("DESGASTE ACUMULADO", fatigue + "%", "A sequência de jogos afeta a recuperação")}${metric("PRÓXIMO COMPROMISSO", remaining === null ? "A confirmar" : remaining + " dia(s)", next ? E.formatDate(state, next.offset) : "Planejamento livre")}</div><section class="card"><div class="row"><div><span class="badge">MICROCICLO SEMANAL</span><h3>Treinar com propósito.</h3></div><span class="pill">${esc(E.date(state))}</span></div><div class="training-week">${["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((day, i) => `<label class="training-day ${i === today ? "current" : ""}"><small>${day}${i === today ? " · HOJE" : ""}</small><select data-training-day="${i}" aria-label="Treino de ${day}">${options(Object.entries(E.training.sessions), schedule[i])}</select><span>${i === today ? esc(session.label) : schedule[i] === "auto" ? "Carga adaptada ao calendário" : esc(E.training.sessions[schedule[i]])}</span></label>`).join("")}</div><p class="muted">As sessões se repetem semanalmente. Dia de jogo tem prioridade; no automático, a véspera recebe ativação leve. Folga e recuperação não geram progresso técnico.</p></section><section class="card training-individual"><div class="row"><div><h3>Carga e desenvolvimento individual</h3><p class="muted">O foco acumula progresso nos dias treinados. Ao completar 100%, desenvolve o fundamento correspondente.</p></div>${btn("Descansar os desgastados por 2 dias", "recover-tired", "", "primary")}</div><div class="training-toolbar"><div class="segmented">${btn("Cartões", "training-layout", "cards", trainingLayout === "cards" ? "active" : "")}${btn("Tabela", "training-layout", "table", trainingLayout === "table" ? "active" : "")}</div><label class="inline">Mostrar<select id="training-filter">${options(
    [
      ["all", "Todos os atletas"],
      ["tired", "Precisam de recuperação"],
      ["youth", "Categorias de base"],
      ["injured", "Lesionados"],
    ],
    trainingFilter,
  )}</select></label></div><div class="${trainingLayout === "cards" ? "training-athletes" : "table-wrap"}"><table class="physical-table ${trainingLayout === "cards" ? "training-cards" : ""}"><thead><tr><th>ATLETA</th><th>ENERGIA / CARGA</th><th>PLANO DE CARGA</th><th>FOCO DE DESENVOLVIMENTO</th><th>AMANHÃ SEM JOGO</th></tr></thead><tbody>${
    players
      .map((p) => {
        const prediction = E.physical.preview(p, session.mode, t.facility),
          days = E.physical.restEstimate(p, t.facility),
          focus = p.trainingFocus || "balanced",
          xp = p.trainingXP?.[focus] || 0,
          selected = p.restDays
            ? "rest" + p.restDays
            : p.trainingPlan || "auto";
        return `<tr><td data-field="Atleta"><strong>${esc(p.name)}</strong><small class="sub">${p.pos} · ${playerAge(p)} anos${t.youth.includes(p) ? " · base" : ""}${p.injury ? " · lesão " + p.injury + " dias" : ""}</small><small class="sub">Resistência ${p.stamina || 70} · overall ${p.ovr}</small></td><td data-field="Energia e carga"><div class="readiness-meter"><i style="--readiness:${p.fitness}%"></i><strong>${p.fitness}%</strong></div><small class="sub">Desgaste ${p.fatigue || 0}%</small></td><td data-field="Plano de carga"><label class="training-control-label">Plano de carga<select data-recovery-player="${esc(p.id)}" aria-label="Plano de ${esc(p.name)}">${options([["auto", "Automático / equipe"], ["normal", "Carga normal"], ["light", "Treino leve"], ...(!p.injury ? [["intense", "Treino intenso"]] : []), ...Array.from({ length: 7 }, (_, i) => ["rest" + (i + 1), "Descanso · " + (i + 1) + " dia(s)"])], selected)}</select></label></td><td data-field="Foco de desenvolvimento"><label class="training-control-label">Foco de desenvolvimento<select data-training-focus="${esc(p.id)}" aria-label="Foco de ${esc(p.name)}">${options(Object.entries(E.training.focuses), focus)}</select></label><div class="development-progress"><i style="width:${xp}%"></i></div><small class="sub">${xp}% do ciclo${p.trainingBonuses?.[focus] ? " · +" + p.trainingBonuses[focus] + " no fundamento" : ""}</small></td><td data-field="Projeção sem jogo"><strong>${prediction.energyGain >= 0 ? "+" : ""}${prediction.energyGain} energia</strong><small class="sub">${prediction.fatigueChange >= 0 ? "+" : ""}${prediction.fatigueChange} desgaste</small><small class="sub">${days === 0 ? "Recuperado" : days > 7 ? "Recuperação acima de 7 dias" : days + " dias para recuperar"}</small></td></tr>`;
      })
      .join("") || '<tr><td colspan="5">Nenhum atleta neste filtro.</td></tr>'
  }</tbody></table></div><p class="muted">Projeções consideram um dia sem jogo. Descanso dispensa treino; jogar durante o descanso continua consumindo energia. Lesionados seguem recuperação.</p></section><section class="card"><h3>Diário do CT</h3><div class="training-history">${
    (state.trainingHistory || [])
      .slice(0, 7)
      .map(
        (h) =>
          `<article><small>${E.formatDate({ ...state, season: h.season }, h.offset)}</small><strong>${esc(h.label)}</strong><span>${h.trained} atletas treinaram · ${h.improved} fundamentos evoluíram</span></article>`,
      )
      .join("") ||
    '<p class="muted">As sessões aparecerão aqui quando você avançar os dias.</p>'
  }</div></section>`;
}
function windowBanner() {
  const w = E.transferWindowInfo(state);
  return `<section class="window-banner ${w.open ? "open" : "closed"}"><div><span class="badge">MERCADO DE TRANSFERÊNCIAS</span><h3>${w.label}</h3><p>${w.open ? `${w.days === null ? "Planejamento da próxima temporada" : w.days + " dia(s) até o fechamento"}` : w.days === null ? "Próxima janela na temporada seguinte" : w.days + " dia(s) para abrir"}</p></div><div>${w.ranges.map(([a, b]) => `<span>${E.formatDate(state, a)} → ${E.formatDate(state, b)}</span>`).join("")}<small>Datas simuladas da carreira; regras unificadas entre ligas.</small></div></section>`;
}
let scoutScope = "market",
  scoutReport = "",
  scoutCompare = [];
function scoutingView() {
  const data = E.scouting.ensure(state),
    saved = scoutScope === "shortlist",
    missions = data.missions.filter(
      (m) => m.clubId === state.clubId && m.scope === scoutScope,
    ),
    reports = data.reports.filter(
      (r) => r.clubId === state.clubId && r.scope === scoutScope,
    ),
    report = reports.find((r) => r.id === scoutReport) || reports[0],
    club = team();
  const lookup = new Map();
  for (const t of state.teams) {
    for (const p of t.players) lookup.set(p.id, { p, t, academy: false });
    for (const p of t.youth) lookup.set(p.id, { p, t, academy: true });
  }
  for (const p of state.freeAgents)
    lookup.set(p.id, { p, t: null, academy: false });
  const list = saved
    ? data.shortlist.map((playerId) => ({ playerId }))
    : report?.players || [];
  const cards = list
    .map((item) => {
      const located = lookup.get(item.playerId);
      if (!located) return "";
      const { p, t: seller } = located,
        academy = located.academy && seller.id === state.clubId,
        owned = seller?.id === state.clubId && !academy,
        a = E.scouting.advice(state, p, academy ? null : seller),
        favorite = data.shortlist.includes(p.id),
        confidence = item.confidence,
        fits =
          owned ||
          (academy
            ? club.money >= 100000 && Math.max(p.salary, 3000) <= a.wageRoom
            : a.affordable);
      return `<article class="scout-player detailed"><div class="row"><div><span class="badge">${academy ? "DA SUA BASE" : owned ? "NO SEU ELENCO" : esc(a.level)}</span><h3>${esc(p.name)}</h3><p>${esc([...(p.naturalPositions || []), ...(p.secondaryPositions || [])].join(" / ") || p.pos)} · ${playerAge(p)}${p.ageUnknown ? "" : " anos"}</p><span class="scout-club">${seller ? teamLabel(seller.id, "tiny") : "Sem clube"}</span></div><span class="scout-rating">${p.ovr}<small>pot. ${p.potential}</small></span></div>${confidence ? `<div class="scout-confidence"><span>Confiança na análise · ${confidence}%</span><i style="width:${confidence}%"></i></div>` : '<p class="muted">Análise preliminar · use uma missão para aprofundar a observação.</p>'}<div class="offer-metrics"><div><small>${academy ? "Promoção" : "Taxa estimada"}</small>${moneyValue(academy ? 100000 : a.askingFee)}</div><div><small>Salário / semana</small>${moneyValue(a.salary)}</div><div><small>1º ano estimado</small>${moneyValue(academy ? 100000 + p.salary * 52 : a.annualTotal)}</div></div><div class="scout-verdict ${fits ? "positive" : "caution"}"><strong>${owned ? "No seu elenco" : fits ? "Cabe nas verbas atuais" : "Requer ajuste de orçamento"}</strong><span>${a.difference >= 0 ? "+" : ""}${a.difference} de overall frente às opções da posição</span></div><p>${esc(item.reason || a.strengths[0])}</p><details><summary>Relatório técnico e financeiro</summary><div class="scout-report-detail"><h4>Pontos de interesse</h4>${a.strengths.map((text) => `<p>✓ ${esc(text)}</p>`).join("")}<h4>O que observar</h4>${a.concerns.map((text) => `<p>• ${esc(text)}</p>`).join("") || "<p>Sem alertas adicionais nesta análise.</p>"}<dl><dt>Abertura prudente</dt><dd>${money(a.minimumOpening)}</dd><dt>Luvas estimadas</dt><dd>${money(a.bonus)}</dd><dt>Espaço salarial / semana</dt><dd>${money(a.wageRoom)}</dd></dl><small>Custos são estimativas; clube e jogador podem contrapropor.</small></div></details><div class="scout-actions">${owned ? '<button data-page="Elenco">Ver no elenco</button>' : academy ? btn("Promover · R$ 100 mil", "promote", p.id) : btn("Abrir negociação", "buy", p.id, "primary")}${btn(favorite ? "★ Observando" : "☆ Observar", "scout-shortlist", p.id)}${btn(scoutCompare.includes(p.id) ? "✓ Comparando" : "Comparar", "scout-compare", p.id)}</div></article>`;
    })
    .join("");
  const compared = scoutCompare.map((id) => lookup.get(id)?.p).filter(Boolean);
  const comparison = compared.length
    ? `<section class="card scout-comparison"><div class="row"><h3>Compare antes de decidir</h3><small>ATÉ 3 ATLETAS</small></div><div class="table-wrap"><table><thead><tr><th>CRITÉRIO</th>${compared.map((p) => `<th>${esc(p.name)}</th>`).join("")}</tr></thead><tbody>${[
        ["Nível", (p) => p.ovr],
        ["Potencial", (p) => p.potential],
        ["Idade", (p) => playerAge(p)],
        [
          "Posições",
          (p) =>
            [
              ...(p.naturalPositions || []),
              ...(p.secondaryPositions || []),
            ].join(" / ") || p.pos,
        ],
        ["Valor", (p) => money(p.price)],
        ["Salário / semana", (p) => money(p.salary)],
        ["Energia", (p) => p.fitness + "%"],
      ]
        .map(
          ([label, value]) =>
            `<tr><td>${label}</td>${compared.map((p) => `<td>${esc(value(p))}</td>`).join("")}</tr>`,
        )
        .join("")}</tbody></table></div></section>`
    : "";
  return `<div class="hero"><span class="badge">INTELIGÊNCIA DE MERCADO</span><h2>O reforço certo para o seu projeto.</h2><p>Compare custo, encaixe no elenco e margem de evolução. A observação considera transferências, caixa e teto salarial separadamente.</p><div class="scout-budget-strip"><span>Transferências <strong>${money(club.finance.transferBudget)}</strong></span><span>Espaço salarial / semana <strong>${money(Math.max(0, club.finance.wageBudget - E.finance.payroll(club)))}</strong></span><span>Em observação <strong>${data.shortlist.length} / 30</strong></span></div></div><div class="segmented scout-tabs">${btn("Mercado", "scout-scope", "market", scoutScope === "market" ? "active" : "")}${btn("Base e jovens", "scout-scope", "youth", scoutScope === "youth" ? "active" : "")}${btn("Lista de observação", "scout-scope", "shortlist", saved ? "active" : "")}</div>${
    saved
      ? ""
      : `<div class="columns scouting-workspace"><section class="card"><span class="badge">NOVA MISSÃO</span><h3>Defina quem procurar.</h3><form id="scouting-form"><div class="columns"><label>Perfil<select name="profile">${options(
          [
            ["balanced", "Equilíbrio do elenco"],
            ["starter", "Impacto no time titular"],
            ["potential", "Desenvolvimento e revenda"],
            ["value", "Custo e benefício"],
          ],
          "balanced",
        )}</select></label><label>Profundidade<select name="depth">${options(
          [
            ["quick", "Triagem · 2 dias"],
            [
              "standard",
              "Padrão · " + (scoutScope === "youth" ? 5 : 3) + " dias",
            ],
            ["deep", "Detalhada · 7 dias"],
          ],
          "standard",
        )}</select></label></div><div class="columns"><label>Posição<select name="position">${options([["all", "Qualquer posição"], ...Object.entries(T.positionNames).map(([key, label]) => [key, key + " · " + label])], "all")}</select></label><label>Overall mínimo<input name="minOverall" type="number" min="0" max="99" value="0"></label></div><div class="columns"><label>Idade mínima<input name="minAge" type="number" min="15" max="45" value="15"></label><label>Idade máxima<input name="maxAge" type="number" min="15" max="${scoutScope === "youth" ? 23 : 45}" value="${scoutScope === "youth" ? 21 : 45}"></label></div><div class="columns"><label>Região<select name="region">${options(
          [
            ["all", "Mundo"],
            ["eu", "Europa"],
            ["sa", "América do Sul"],
            ["na", "América do Norte"],
            ["as", "Ásia"],
          ],
          "all",
        )}</select></label><label>Liga<select name="league">${options([["all", "Todas"], ["free", "Sem clube"], ...state.leagues.map((l) => [l.id, l.name])], "all")}</select></label></div><label>Nacionalidade<select name="nationality">${options([["all", "Todas"], ...E.national.countries], "all")}</select></label><div class="columns"><label>Máximo de transferência (R$)<input name="maxFee" type="text" value="${club.finance.transferBudget}" required></label><label>Máximo de salário / semana (R$)<input name="maxSalary" type="text" value="${Math.min(30000000, Math.max(0, club.finance.wageBudget - E.finance.payroll(club)))}" required></label></div><div class="mission-estimate" id="mission-estimate">Missão padrão · ${money(scoutScope === "youth" ? 5000 : 10000)} · ${scoutScope === "youth" ? 5 : 3} dias</div><button class="primary" ${missions.some((m) => m.status === "pending") ? "disabled" : ""}>Iniciar observação</button></form><p class="muted">Avance os dias na Visão geral. O relatório usa as verbas da data de conclusão; não garante aceite do clube ou do jogador.</p></section><section class="card"><span class="badge">AGENDA DO DEPARTAMENTO</span><h3>Do pedido ao relatório.</h3>${
          missions
            .slice(0, 5)
            .map((m) => {
              const total = m.due - m.started,
                done = Math.max(
                  0,
                  Math.min(100, ((state.today - m.started) / total) * 100),
                );
              return `<article class="mission-card"><div class="row"><strong>${m.status === "pending" ? "Em observação" : m.status === "completed" ? "Relatório entregue" : "Encerrada"}</strong><span>${m.depth === "deep" ? "Detalhada" : m.depth === "quick" ? "Triagem" : "Padrão"}</span></div><p>${m.position === "all" ? "Todos os setores" : esc(m.position)} · ${m.minAge || 15}–${m.maxAge} anos</p><div class="development-progress"><i style="width:${m.status === "completed" ? 100 : done}%"></i></div><small>${m.status === "pending" ? Math.max(0, m.due - state.today) + " dias restantes · " : ""}${E.formatDate({ ...state, season: m.season }, m.due)}</small></article>`;
            })
            .join("") ||
          '<div class="department-empty"><h3>Seu próximo reforço começa aqui.</h3><p>Envie uma missão para receber análise de encaixe, custos e riscos.</p></div>'
        }<div class="scout-principles"><h4>O que o relatório considera</h4><p>✓ Posições habituais e nível do elenco</p><p>✓ Caixa, taxa e salário semanal</p><p>✓ Idade, potencial e condição física</p><p>✓ Disponibilidade no clube de origem</p></div></section></div>`
  }${comparison}<section class="card"><div class="row"><h3>${saved ? "Jogadores em observação" : scoutScope === "youth" ? "Relatórios da base" : "Relatórios de recrutamento"}</h3>${
    reports.length
      ? `<label>Consultar relatório<select id="scout-report">${options(
          reports.map((r) => [
            r.id,
            E.formatDate({ ...state, season: r.season }, r.offset) +
              " · " +
              r.players.length +
              " jogadores",
          ]),
          report?.id,
        )}</select></label>`
      : ""
  }</div>${cards ? `<div class="scout-grid">${cards}</div>` : report ? "<p>Nenhum atleta coube nos critérios e nas verbas. Amplie a busca ou ajuste o orçamento.</p>" : saved ? '<p class="muted">Use ☆ Observar em um relatório para acompanhar até 30 nomes.</p>' : '<p class="muted">Os relatórios aparecerão após a conclusão das missões.</p>'}</section>`;
}
let calendarMonth = null,
  calendarSelected = null,
  calendarMode = "month",
  calendarScope = "career";
function captainHierarchyView(t) {
  const hierarchy = T.leadership.hierarchy(t),
    ref = T.leadership.club(t);
  if (!hierarchy.length)
    return '<p class="muted">Sem capitania confirmada nesta referência. O automático compara a liderança dos atletas em campo.</p>';
  return `<section class="captain-hierarchy"><div><span class="badge">CAPITANIA DE REFERÊNCIA</span><p>O automático respeita esta hierarquia entre os jogadores disponíveis. Sua escolha manual tem prioridade.</p></div><div class="captain-list">${hierarchy.map((c) => `<span><b>${c.rank === 1 ? "C" : c.rank + "º"}</b><strong>${esc(c.name)}</strong><small>Liderança ${T.skills(c.player).leadership}/100</small></span>`).join("")}</div><small>Consulta de ${ref.checkedAt.split("-").reverse().join("/")} · <a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">Ver referência</a> · Notas estimadas pelo jogo</small></section>`;
}
function preseasonView() {
  const first = E.calendar(state)[0]?.offset,
    preseason = state.calendarProfile && state.today < first;
  const tournaments = (state.preseasonTournaments || []).filter(
    (t) => t.status !== "cancelled",
  );
  return `${preseason ? `<section class="preseason-banner"><div><span class="badge">PRÉ-TEMPORADA · ${E.seasonLabel(state)}</span><h3>${first - state.today} dias para a estreia oficial</h3><p>Treine, negocie e monte a agenda de preparação. O primeiro compromisso de liga está previsto para ${E.formatDate(state, first)}.</p></div><button data-page="Treinamento">Preparar o elenco →</button></section>` : ""}${tournaments
    .map(
      (t) =>
        `<section class="card preseason-tournament"><div class="row"><div><span class="badge">TORNEIO DE PREPARAÇÃO</span><h3>${esc(t.name)}</h3><p class="muted">${E.formatDate(state, t.start)} — ${E.formatDate(state, t.end)} · ${t.status === "completed" ? "Encerrado" : "Três rodadas · todos contra todos"}</p></div>${t.start > state.today && t.status === "scheduled" ? btn("Cancelar torneio", "cancel-preseason", t.id) : ""}</div>${t.champion ? `<p class="tournament-winner">🏆 Campeão: ${teamLabel(t.champion)}</p>` : ""}<div class="table-wrap"><table><thead><tr><th>CLUBE</th><th>PTS</th><th>J</th><th>V</th><th>SG</th></tr></thead><tbody>${E.rank(
          t.table,
        )
          .map(
            (r) =>
              `<tr class="${r.id === state.clubId ? "mine" : ""}"><td>${teamLabel(r.id)}</td><td><strong>${r.p}</strong></td><td>${r.w + r.d + r.l}</td><td>${r.w}</td><td>${r.gf - r.ga}</td></tr>`,
          )
          .join("")}</tbody></table></div></section>`,
    )
    .join("")}`;
}
function openFriendlyDialog(tournament = false) {
  if (state.live && !state.live.done) {
    notify("Conclua a partida antes de organizar a agenda.");
    return;
  }
  const eligible = state.teams
    .filter((t) => t.id !== state.clubId && t.players.length >= 11)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const selected =
    calendarSelected > state.today ? calendarSelected : state.today + 5;
  const dialog = $("#calendar-dialog");
  dialog.innerHTML = `<form id="friendly-form"><div class="dialog-heading"><div><span class="badge">AGENDA DO CLUBE</span><h2>${tournament ? "Organizar pré-temporada" : "Marcar amistoso"}</h2></div><button type="button" data-action="close-calendar-dialog" aria-label="Fechar planejamento">×</button></div><p class="muted">${tournament ? "Convide três clubes para um torneio de pontos corridos, com uma rodada a cada quatro dias." : "Escolha o adversário, a data e o estádio. Os dois clubes precisam de pelo menos três dias entre jogos."}</p>${tournament ? '<label>Nome do torneio<input name="title" required maxlength="60" minlength="3" value="Copa de pré-temporada"></label>' : ""}<div class="friendly-fields"><label>${tournament ? "Primeira rodada" : "Data do jogo"}<input name="date" type="date" min="${E.schedule.iso(state, state.today + 1)}" max="${E.schedule.iso(state, tournament ? (state.calendarProfile?.preseasonDays || 0) - 9 : E.calendar(state).at(-1).offset)}" required value="${E.schedule.iso(state, selected)}"></label>${tournament ? "" : `<label>Mando de campo<select name="venue"><option value="home">Em casa · ${esc(team().name)}</option><option value="away">Na casa do adversário</option></select></label>`}<label class="wide">Filtrar adversários por liga<select name="league"><option value="all">Todas as ligas</option>${options(
    state.leagues.map((l) => [l.id, l.name]),
    team().leagueId,
  )}</select></label>${Array.from(
    { length: tournament ? 3 : 1 },
    (_, i) =>
      `<label class="wide">${tournament ? "Convidado " + (i + 1) : "Adversário"}<select name="opponent${i}" required>${options(
        eligible
          .filter((t) => t.leagueId === team().leagueId)
          .map((t) => [t.id, t.name]),
        eligible.filter((t) => t.leagueId === team().leagueId)[i]?.id,
      )}</select></label>`,
  ).join(
    "",
  )}</div><div class="friendly-preview" id="friendly-preview" role="status"></div><p id="calendar-error" class="notice error" hidden role="alert"></p><div class="dialog-actions"><button type="button" data-action="close-calendar-dialog">Voltar ao calendário</button><button class="primary">${tournament ? "Confirmar torneio" : "Confirmar amistoso"}</button></div><p class="muted">São compromissos de preparação da sua carreira. Não alteram a tabela oficial e geram desgaste físico e receita de bilheteria.</p></form>`;
  const form = $("#friendly-form");
  function preview() {
    const fd = new FormData(form),
      off = E.schedule.offset(state, fd.get("date"));
    $("#friendly-preview").textContent = tournament
      ? `Rodadas: ${[0, 4, 8].map((n) => E.formatDate(state, off + n)).join(" · ")}. As datas dos quatro clubes serão conferidas antes da confirmação.`
      : Number.isFinite(off)
        ? `${fd.get("venue") === "home" ? team().name : name(fd.get("opponent0"))} × ${fd.get("venue") === "home" ? name(fd.get("opponent0")) : team().name} · ${E.formatDate(state, off)}`
        : "Escolha uma data válida.";
  }
  form.onchange = (e) => {
    if (e.target.name === "league") {
      const filtered = eligible.filter(
        (t) => e.target.value === "all" || t.leagueId === e.target.value,
      );
      form.querySelectorAll("[name^=opponent]").forEach(
        (select, i) =>
          (select.innerHTML = options(
            filtered.map((t) => [t.id, t.name]),
            filtered[i]?.id,
          )),
      );
    }
    preview();
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      const off = E.schedule.offset(state, fd.get("date"));
      if (tournament)
        E.organizePreseason(
          state,
          [0, 1, 2].map((i) => fd.get("opponent" + i)),
          off,
          fd.get("title"),
        );
      else E.arrangeFriendly(state, fd.get("opponent0"), off, fd.get("venue"));
      dialog.close();
      scheduleSave();
      render();
      notify(
        tournament
          ? "Torneio confirmado no calendário."
          : "Amistoso confirmado no calendário.",
      );
    } catch (error) {
      $("#calendar-error").hidden = false;
      $("#calendar-error").textContent = error.message;
    }
  };
  preview();
  dialog.showModal();
}

function careerCalendarView() {
  const today = new Date(E.schedule.anchor(state) + state.today * 86400000);
  calendarMonth ??=
    today.getUTCMonth() + (today.getUTCFullYear() - state.season) * 12;
  calendarSelected ??= state.today;
  const fixtures = E.careerCalendar(state, calendarScope),
    monthStart = new Date(Date.UTC(state.season, calendarMonth, 1)),
    days = new Date(Date.UTC(state.season, calendarMonth + 1, 0)).getUTCDate(),
    first = (monthStart.getUTCDay() + 6) % 7;
  const offsetOf = (day) =>
    Math.round(
      (Date.UTC(state.season, calendarMonth, day) - E.schedule.anchor(state)) /
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
          (Date.parse(n.dueOn) - E.schedule.anchor(state)) / 86400000,
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
    `<article class="fixture-card"><span class="badge">${esc(f.name)} · ${f.offset < state.today ? "Disputado" : f.offset === state.today ? "Hoje" : "Confirmado"}</span><h3>${matchup(f, f.goals)}</h3><p>${E.formatDate(state, f.offset)} · ${f.kind === "national" ? "Seleção" : f.pair[0] === state.clubId ? "Casa" : "Fora"}${f.penalties ? " · Pênaltis " + f.penalties.join("–") : ""}</p>${f.offset === state.today && E.nextFixture(state) ? '<button data-page="Dia de jogo" class="primary">Abrir partida</button>' : ""}${f.kind === "friendly" && f.status === "scheduled" && f.offset > state.today && !f.tournamentId ? btn("Cancelar amistoso", "cancel-friendly", f.id) : ""}${f.offset < state.today && !f.goals ? "<small>Placar não disponível no arquivo desta carreira.</small>" : ""}</article>`;
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
      return `<button class="calendar-day ${offset === state.today ? "today" : ""} ${offset === calendarSelected ? "selected" : ""} ${matches.length ? "has-match" : ""}" data-action="calendar-select" data-id="${offset}" ${offset === state.today ? 'aria-current="date"' : ""} aria-label="${esc(E.formatDate(state, offset))}${matches.length ? " · " + matches.length + " jogo(s)" : ""}${notes.length ? " · " + notes.map((n) => esc(n.label)).join(", ") : ""}"><span>${day}</span>${matches.map((f) => `<small class="match-chip ${f.kind === "national" ? "international" : ""}">${f.goals ? f.goals.join("–") : f.kind === "national" ? "SEL" : f.kind === "friendly" ? "AMIST" : f.competition === team().leagueId ? "LIGA" : "COPA"}<span>${esc(name(f.pair.find((id) => id !== state.clubId && id !== state.national.job)))}</span></small>`).join("")}${notes.length ? '<i class="calendar-note-dot" aria-hidden="true"></i>' : ""}</button>`;
    }).join("");
  const monthFixtures = fixtures.filter(
    (f) =>
      new Date(E.schedule.anchor(state) + f.offset * 86400000).getUTCMonth() +
        (E.schedule.at(state, f.offset).getUTCFullYear() - state.season) *
          12 ===
      calendarMonth,
  );
  return `<div class="hero"><span class="badge">AGENDA DO TREINADOR</span><h2>Sua temporada, dia a dia.</h2><p>Temporada ${E.seasonLabel(state)} · Prepare o elenco, organize amistosos e acompanhe os compromissos.</p><div class="hero-actions">${btn("Marcar amistoso", "arrange-friendly", "", "primary")}${state.calendarProfile && state.today < state.calendarProfile.preseasonDays - 10 ? btn("Organizar torneio de pré-temporada", "organize-preseason") : ""}</div></div><section class="card"><div class="row calendar-toolbar"><div class="row">${btn("← Mês anterior", "calendar-month", "-1")}<h3>${esc(labelMonth)}</h3>${btn("Próximo mês →", "calendar-month", "1")}${btn("Hoje", "calendar-today")}</div><div class="row">${btn("Mês", "calendar-mode", "month", calendarMode === "month" ? "primary" : "")}${btn("Agenda", "calendar-mode", "agenda", calendarMode === "agenda" ? "primary" : "")}<label>Compromissos<select id="calendar-scope">${options(
    [
      ["career", "Clube e seleção"],
      ["club", "Somente clube"],
      ["national", "Somente seleção"],
    ],
    calendarScope,
  )}</select></label></div></div><div class="calendar-workspace"><div>${calendarMode === "month" ? `<div class="calendar-weekdays">${["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((d) => `<span>${d}</span>`).join("")}</div><div class="calendar-grid">${cells}</div><p class="muted calendar-legend">● Liga · Copa · Amistoso · Seleção · ponto dourado: prazo ou janela</p>` : monthFixtures.map(row).join("") || "<p>Nenhum jogo confirmado neste mês. Use as setas para consultar os demais meses.</p>"}</div><aside class="calendar-details"><span class="badge">${E.formatDate(state, calendarSelected)}</span>${detail.map(row).join("") || '<h3>Sem jogo confirmado</h3><p class="muted">Um dia para preparar o elenco, recuperar os atletas e acompanhar o mercado.</p>'}${dayEvents.map((e) => `<p class="calendar-deadline">${esc(e.label)}</p>`).join("")}${calendarSelected > state.today ? btn("Marcar amistoso nesta data", "arrange-friendly", "", "primary") : ""}<p class="muted">O avanço dos dias fica na Visão geral.</p><button data-page="Visão geral">Ir para Visão geral</button></aside></div></section>${preseasonView()}${windowBanner()}<div class="row"><button data-action="reference-calendar">Consultar datas reais da base</button></div>`;
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
let awardsKind = "ballon",
  awardsCompetition = "",
  awardsPage = 0,
  awardsScope = "all";
const note = (value, digits = 1) =>
  value === null || value === undefined
    ? "—"
    : Number(value).toFixed(digits).replace(".", ",");
function seasonStatLine(p) {
  const r = state.performance?.current.players[p.id];
  return r?.appearances
    ? `<small class="sub season-stat">Temporada · ${r.goals} G · ${r.assists} A · nota ${note(E.performance.average(r))}${p.pos === "GOL" ? ` · ${r.saves} defesas · ${r.cleanSheets} SG` : ""}</small>`
    : "";
}
function matchRatingsView(m) {
  if (!m?.performance)
    return '<p class="muted">As avaliações aparecerão quando a bola rolar.</p>';
  const rows = E.performance.lines(m, m.done),
    winner = m.performance.playerOfMatch;
  if (!rows.length)
    return '<p class="muted">Aguarde os primeiros lances para consultar as notas.</p>';
  return `${winner ? `<div class="match-best-player"><span class="award-symbol" aria-hidden="true">★</span><div><span class="badge">MELHOR JOGADOR DA PARTIDA</span><h3>${esc(winner.name)}</h3><p>${esc(name(winner.clubId))} · ${winner.goals} gols · ${winner.assists} assistências${winner.keeper ? ` · ${winner.saves} defesas${winner.cleanSheet ? " · sem sofrer gol" : ""}` : ""}</p></div><strong class="match-note excellent">${note(winner.rating)}</strong></div>` : ""}<div class="match-ratings-teams">${m.pair
    .map(
      (id, side) =>
        `<section><h4>${teamLabel(id, "small")}</h4>${rows
          .filter((p) => p.side === side)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .map(
            (p) =>
              `<div class="match-rating-line ${p.id === winner?.id ? "best" : ""}"><div><strong>${esc(p.name)}${p.id === winner?.id ? " ★" : ""}</strong><small>${p.yellowCards ? "🟨 " + p.yellowCards + " · " : ""}${p.redCards ? "🟥 EXPULSO · " : ""}${p.minutes} min · ${p.goals} G · ${p.assists} A${p.keeper ? ` · ${p.saves} defesas · ${p.conceded} sofridos` : ` · ${p.recoveries} recuperações`}${p.cleanSheet ? " · SG" : ""}</small></div><span class="match-note ${(p.rating || 0) >= 8 ? "excellent" : (p.rating || 0) < 6 ? "poor" : ""}" aria-label="Nota de ${esc(p.name)}: ${note(p.rating)}">${note(p.rating)}</span></div>`,
          )
          .join("")}</section>`,
    )
    .join(
      "",
    )}</div><p class="muted ratings-explanation">Notas de 1 a 10, baseadas nos lances, com desconto por cartões. SG: pelo menos 60 minutos sem sofrer gol enquanto esteve em campo. Participações curtas sem ações relevantes ficam sem nota final.${m.performance.fromMinute ? ` Acompanhamento parcial a partir do minuto ${m.performance.fromMinute}.` : ""}</p>`;
}
function awardCard(a) {
  const month = a.month
    ? new Date(a.month + "-01T12:00:00Z").toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
    : a.seasonLabel;
  return `<article class="card individual-award"><span class="award-symbol ${a.type === "ballon" ? "gold-ball" : ""}" aria-hidden="true">${a.type === "ballon" ? "" : a.type === "keeper" ? "◈" : "★"}</span><span class="badge">${esc(a.name)}</span><h3>${esc(a.winner.name)}</h3><p>${teamLabel(a.winner.clubId, "small")}</p><p class="award-period">${esc(month)}${a.competitionName ? " · " + esc(a.competitionName) : ""}</p><div class="award-card-stats"><span>Nota <b>${note(a.winner.average, 2)}</b></span>${a.type === "keeper" ? `<span><b>${a.winner.saves}</b> defesas</span><span><b>${a.winner.keeperCleanSheets}</b> sem sofrer gol</span>` : `<span><b>${a.winner.goals}</b> gols</span><span><b>${a.winner.assists}</b> assistências</span>`}</div><details><summary>Ver pontuação e pódio</summary>${a.podium.map((p, i) => `<p>${i + 1}º · ${esc(p.name)} · ${note(p.points.total)} pontos</p>`).join("")}<small>${a.partial ? "Apuração parcial: esta temporada já estava em andamento ao iniciar o acompanhamento." : "Apuração do desempenho acompanhado na temporada."}</small>${(a.criteriaRevision || 1) < 3 ? '<small class="sub">Resultado preservado com os critérios vigentes na época.</small>' : ""}</details></article>`;
}
function performanceDetails(p) {
  return `<details class="performance-breakdown"><summary>Como foram calculados os ${note(p.points.total)} pontos</summary><dl><dt>Desempenho e nota média</dt><dd>${note(p.points.performance)}</dd><dt>Gols e assistências</dt><dd>${note(p.points.production)}</dd><dt>Minutos e melhores em campo</dt><dd>${note(p.points.consistency)}</dd><dt>Contribuição para títulos</dt><dd>${note(p.points.titles)}</dd><dt>Atuações decisivas</dt><dd>${note(p.points.decisiveness || 0)}</dd><dt>Fair play · desconto por cartões</dt><dd>${note(p.points.fairPlay || 0)}</dd>${awardsKind === "keeper" ? `<dt>Defesas, eficiência e jogos sem sofrer gol</dt><dd>${note(p.points.goalkeeping)}</dd>` : ""}</dl><p class="muted">${p.decisiveGoals || 0} gols da vitória · ${p.decisiveAssists || 0} assistências decisivas · ${p.knockoutMvp || 0} melhores em campo no mata-mata continental.</p></details>`;
}
function awardsView() {
  const data = E.performance.ensure(state),
    current = data.current,
    competitions = Object.values(current.competitions).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  if (!awardsCompetition) awardsCompetition = team().leagueId;
  const kinds = [
    ["ballon", "Bola de Ouro"],
    ["keeper", "Melhor goleiro"],
    ["competition", "Melhor do campeonato"],
    ["month", "Melhor do mês"],
    ["history", "Premiados"],
  ];
  const comp = ["competition", "month"].includes(awardsKind)
    ? awardsCompetition
    : null;
  let ranked =
    awardsKind === "history" ? [] : E.performance.rank(state, awardsKind, comp);
  if (awardsScope === "club")
    ranked = ranked.filter((p) => team().players.some((x) => x.id === p.id));
  const pages = Math.max(
    1,
    Math.ceil(
      (awardsKind === "history"
        ? data.awards.filter(
            (a) => awardsScope !== "club" || a.winner.clubId === state.clubId,
          ).length
        : ranked.length) / 12,
    ),
  );
  awardsPage = Math.min(awardsPage, pages - 1);
  const list = ranked.slice(awardsPage * 12, awardsPage * 12 + 12),
    gk = awardsKind === "keeper";
  const awards = data.awards.filter(
    (a) => awardsScope !== "club" || a.winner.clubId === state.clubId,
  );
  const monthly = current.month?.key || E.schedule.iso(state).slice(0, 7);
  const winner =
    awardsKind === "history"
      ? null
      : data.awards.find(
          (a) =>
            a.season === state.season &&
            a.type === awardsKind &&
            (!comp || a.competition === comp),
        );
  const closed =
    awardsKind === "competition"
      ? current.competitions[comp]?.closed
      : ["ballon", "keeper", "month"].includes(awardsKind) && current.closed;
  return `<div class="hero awards-hero"><div><span class="badge">PRÊMIOS INDIVIDUAIS · ${E.seasonLabel(state)}</span><h2>Uma temporada para fazer história.</h2><p>O reconhecimento vem do que acontece em campo: notas, gols, assistências, defesas e contribuição para os títulos.</p><button data-action="show-award-criteria">Ver critérios e fontes →</button><button data-page="Histórico">Vencedores anteriores →</button></div><span class="awards-emblem" aria-hidden="true">✦</span></div><section class="card"><div class="awards-toolbar"><label>Premiação<select id="awards-kind">${options(kinds, awardsKind)}</select></label>${["competition", "month"].includes(awardsKind) ? `<label>Campeonato<select id="awards-competition">${options([...state.leagues.map((l) => [l.id, l.name]), ...state.cups.map((c) => [c.id, c.name])], awardsCompetition)}</select></label>` : ""}<label>Atletas<select id="awards-scope">${options(
    [
      ["all", "Todos os clubes"],
      ["club", "Meu elenco"],
    ],
    awardsScope,
  )}</select></label></div><p class="muted award-status">${awardsKind === "history" ? "Resultados confirmados e preservados na carreira." : winner && awardsKind !== "month" ? "Resultado confirmado." : awardsKind === "month" && current.closed ? "Temporada encerrada. O último mês premiado aparece abaixo." : closed ? "Apuração encerrada. Consulte os premiados; não há candidato com amostra mínima nesta seleção." : `Classificação provisória${awardsKind === "month" && monthly ? " · " + monthly : ""}. O vencedor será confirmado ${awardsKind === "month" ? "na virada do mês" : awardsKind === "competition" ? "quando o campeonato terminar" : "ao encerrar a temporada"}.`}</p><p class="muted">${current.startedOffset > 0 ? "Acompanhamento iniciado com a temporada em andamento. " : ""}As estatísticas começam em ${E.formatDate({ ...state, season: data.started.season }, data.started.offset)}; resultados antigos não são reconstruídos.</p></section>${
    awardsKind === "history"
      ? `<div class="individual-awards-grid">${
          awards
            .slice(awardsPage * 12, awardsPage * 12 + 12)
            .map(awardCard)
            .join("") ||
          '<section class="card awards-empty"><span class="award-symbol">☆</span><h3>As primeiras conquistas estão por vir.</h3><p>O melhor do mês é anunciado na mudança do mês; os demais vencedores, ao concluir a competição ou a temporada.</p></section>'
        }</div>${awards.length > 12 ? `<div class="row">${btn("← Anterior", "awards-page", "-1")}<span>${awards.length} premiações</span>${btn("Próxima →", "awards-page", "1")}</div>` : ""}`
      : `${winner ? `<div class="confirmed-award">${awardsKind === "month" ? '<p class="muted">Último mês premiado</p>' : ""}${awardCard(winner)}</div>` : ""}<section class="card"><div class="row"><h3>${esc(kinds.find((k) => k[0] === awardsKind)[1])} · ${ranked.length} atletas</h3><span class="pill">${awardsKind === "month" ? "Mínimo: 2 jogos e 120 min" : comp ? "Mínimo: 3 jogos e 180 min" : "Mínimo: 10 jogos e 900 min"}</span></div><div class="table-wrap"><table class="awards-table"><thead><tr><th>#</th><th>JOGADOR</th><th>J / MIN</th><th>NOTA MÉDIA</th>${gk ? "<th>DEFESAS</th><th>EFICIÊNCIA</th><th>SEM SOFRER GOL</th>" : "<th>GOLS</th><th>ASSIST.</th><th>MELHOR EM CAMPO</th>"}<th>PONTOS</th></tr></thead><tbody>${list.map((p, i) => `<tr class="${p.clubId === state.clubId ? "mine" : ""}"><td>${awardsPage * 12 + i + 1}</td><td><strong>${esc(p.name)}</strong><span class="sub">${teamLabel(p.clubId, "tiny")}</span>${p.eligible ? "" : '<small class="sub">Amostra ainda insuficiente</small>'}${performanceDetails(p)}</td><td data-stat="Jogos / minutos">${gk ? p.keeperMatches : p.appearances}<small class="sub">${gk ? p.keeperMinutes : p.minutes} min</small></td><td data-stat="Nota média"><span class="match-note ${(p.average || 0) >= 8 ? "excellent" : ""}">${note(p.average, 2)}</span></td>${gk ? `<td data-stat="Defesas">${p.saves}<small class="sub">${p.keeperMatches ? note(p.saves / p.keeperMatches, 2) : "—"} por jogo</small></td><td data-stat="Eficiência">${p.faced ? Math.round((p.saves / p.faced) * 100) + "%" : "—"}<small class="sub">${p.keeperConceded} sofridos</small></td><td data-stat="Sem sofrer gol">${p.keeperCleanSheets}</td>` : `<td data-stat="Gols">${p.goals}</td><td data-stat="Assistências">${p.assists}</td><td data-stat="Melhor em campo">${p.playerOfMatch}</td>`}<td data-stat="Pontos"><strong>${note(p.points.total, 2)}</strong></td></tr>`).join("") || '<tr><td colspan="8"><div class="awards-empty"><span class="award-symbol">☆</span><h3>A disputa começa em campo.</h3><p>Dispute partidas oficiais para acompanhar os candidatos. Amistosos recebem notas, mas ficam fora desta classificação.</p></div></td></tr>'}</tbody></table></div>${ranked.length ? `<div class="row">${btn("← Anterior", "awards-page", "-1")}<span>Página ${awardsPage + 1} de ${pages}</span>${btn("Próxima →", "awards-page", "1")}</div>` : ""}</section>`
  }${realAwardCriteria()}<details class="card award-rules"><summary>Critérios da premiação</summary><p>As notas vão de 1 a 10. Jogadores de linha são avaliados por gols, assistências, chances criadas, passe, recuperações, duelos e resultado. Defensores recebem peso maior pelo trabalho defensivo. Goleiros são avaliados principalmente por defesas, eficiência contra chutes no alvo, gols sofridos e jogos sem sofrer gol.</p><p>Na Bola de Ouro: desempenho = (nota média − 5) × 30; produção = gols × 2,2 + assistências × 1,6; regularidade considera minutos e melhores em campo. Títulos acrescentam pontos proporcionais aos minutos pelo clube vencedor: liga 30, Champions 40, Libertadores 35, Europa League 25 e Conference 18. Não basta pertencer ao elenco campeão.</p><p>No prêmio de goleiros, defesas, eficiência e jogos sem sofrer gol acrescentam pontos próprios; a taxa de gols sofridos por 90 minutos reduz a pontuação. Melhor do mês usa somente aquele mês e campeonato, sem bônus de título. Os prêmios anuais seguem o ciclo da temporada da carreira, e não uma votação oficial. Não há premiação em dinheiro.</p></details>${recentPerformancesView()}`;
}
function recentPerformancesView() {
  const matches = (state.performance?.matches || []).slice(0, 8);
  return `<section class="card"><h3>Relatórios das suas últimas partidas</h3>${matches.map((m) => `<details class="match-report"><summary><span>${E.formatDate({ ...state, season: m.season }, m.offset)} · ${esc(m.name)}</span><strong>${esc(name(m.pair[0]))} ${m.goals.join(" × ")} ${esc(name(m.pair[1]))}</strong></summary><div class="report-best">${m.playerOfMatch ? `★ Melhor em campo: <strong>${esc(m.playerOfMatch.name)}</strong> · ${note(m.playerOfMatch.rating)}` : "Sem avaliação completa disponível."}${m.partial ? " · Relatório parcial" : ""}</div><div class="table-wrap"><table><thead><tr><th>JOGADOR</th><th>MIN</th><th>G / A</th><th>DEFESAS</th><th>NOTA</th></tr></thead><tbody>${m.players.map((p) => `<tr><td>${esc(p.name)}</td><td>${p.minutes}</td><td>${p.goals} / ${p.assists}</td><td>${p.keeper ? p.saves : "—"}</td><td>${note(p.rating)}</td></tr>`).join("")}</tbody></table></div></details>`).join("") || '<p class="muted">Relatórios completos serão guardados quando você disputar partidas. Os últimos 60 ficam no save.</p>'}</section>`;
}

function trophyRoom() {
  const trophies = (state.trophies || []).filter(
    (t) => t.clubId === state.clubId || t.coachId === "you",
  );
  return `<div class="hero"><span class="badge">SALA DE TROFÉUS</span><h2>As conquistas ficam para a história.</h2><p>Títulos confirmados do seu clube e das equipes que você levou ao topo.</p><button data-page="Prêmios">Prêmios dos jogadores →</button><button data-page="Histórico">Histórico de campeões →</button></div><div class="trophy-grid">${trophies.map((t) => `<article class="card trophy-card">${trophySvg()}<span class="badge">${E.seasonLabel({ ...state, season: t.season }, E.league(state, team(t.clubId).leagueId)?.region)}</span><h3>${esc(t.name)}</h3><p>${teamLabel(t.clubId)}</p><small>${t.coachId === "you" ? "Conquistado durante sua gestão" : "Histórico do clube"}</small></article>`).join("") || `<div class="card trophy-empty">${trophySvg()}<h3>O primeiro capítulo ainda será escrito.</h3><p>Os títulos de liga e das competições continentais aparecem aqui após a confirmação do campeão.</p></div>`}</div>`;
}
function showCelebration() {
  const title = (state.trophies || []).find(
    (t) => t.coachId === "you" && !t.celebrated,
  );
  if (!title || document.querySelector("dialog[open]")) return;
  const dialog = $("#trophy-dialog");
  if (!dialog) return;
  dialog.innerHTML = `<div class="champion-celebration">${Array.from({ length: 24 }, (_, i) => `<i class="confetti" style="--i:${i};--left:${(i * 37) % 100}%"></i>`).join("")}<span class="badge">CAMPEÃO · ${E.seasonLabel({ ...state, season: title.season }, E.league(state, team(title.clubId).leagueId)?.region)}</span>${trophySvg()}<h2>${esc(name(title.clubId))} no topo!</h2><h3>${esc(title.name)}</h3><p>Uma conquista para o clube. Um novo marco na sua carreira.</p>${btn("Guardar na sala de troféus", "close-celebration", title.id, "primary")}</div>`;
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
  let size = 0,
    savedAt = null;
  try {
    size = (localStorage.getItem(KEY) || "").length * 2;
    savedAt = JSON.parse(
      localStorage.getItem("dinastia-save-meta") || "null",
    )?.savedAt;
  } catch {}
  return `<div class="hero"><span class="badge">SUA CARREIRA, SEU ARQUIVO</span><h2>Salvamentos</h2><p>${esc(state.profile.name)} · ${esc(team().name)} · ${esc(E.date(state))}</p></div><section class="card save-explanation"><h3>Onde fica a minha carreira?</h3><p><strong>Neste navegador e neste aparelho.</strong> O salvamento automático guarda uma cópia comprimida da sua carreira nos dados locais deste site.</p><dl><dt>Endereço do save</dt><dd>${esc(location.origin)}</dd><dt>Última gravação registrada</dt><dd>${savedAt ? esc(new Date(savedAt).toLocaleString("pt-BR")) : "Use Salvar para registrar a gravação"}</dd><dt>Tamanho aproximado</dt><dd>${(size / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} MB</dd></dl><p>Não há conta nem sincronização na nuvem. O Netlify e o GitHub hospedam o jogo; eles não recebem os saves das pessoas. Há uma carreira ativa por navegador neste endereço. Arquivos exportados permitem guardar outras carreiras e alternar entre elas pela importação.</p><p>Trocar de celular, navegador ou endereço do site não leva esse save junto. Limpar os dados do site, usar uma aba anônima ou desinstalar o navegador pode apagar o progresso. Para guardar uma cópia ou continuar em outro aparelho, baixe o arquivo e depois importe-o.</p></section><div class="card"><h3>Continuar de onde parou</h3><p>O jogo salva suas ações automaticamente e tenta preservar a partida quando você coloca o aplicativo em segundo plano. O indicador “Salvo” confirma a gravação no navegador.</p><div class="row">${btn("Salvar neste navegador", "save-now", "", "primary")}${btn("Baixar arquivo do save", "export-save")}${btn("Importar arquivo", "import-save")}</div><p class="muted">No celular, o arquivo fica na pasta escolhida para downloads. Envie-o para seu armazenamento pessoal se quiser manter uma cópia fora do aparelho.</p></div><div class="card"><h3>Excluir carreira</h3><p>Apaga a carreira e as cópias de recuperação deste navegador. Os arquivos que você já baixou continuam disponíveis.</p>${btn("Excluir carreira", "delete-save", "", "danger")}</div>`;
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
      "dinastia-fc-" + state.season + "-" + (state.today || 0) + ".json";
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
      "dinastia-save-meta",
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
    try {
      localStorage.setItem(
        "dinastia-save-meta",
        JSON.stringify({ savedAt: new Date().toISOString() }),
      );
    } catch {}
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

function disciplineStatus(p) {
  const competition = team().selectionCompetition || team().leagueId,
    ban = E.discipline.suspension(p, competition),
    c = E.discipline.counts(p, state, competition),
    kind = state.cups.some((x) => x.id === competition) ? "cup" : "league",
    limit = E.discipline.rules(competition, kind).yellowLimit;
  return ban
    ? `<small class="sub discipline-red">Suspenso · ${ban} jogo(s) nesta competição</small>`
    : c.accumulated === limit - 1
      ? '<small class="sub discipline-yellow">Pendurado · mais um amarelo gera suspensão</small>'
      : "";
}
function matchDisciplineView(m) {
  if (!m?.discipline) return "";
  const cards = m.discipline.cards.slice(-6).reverse();
  return `<section class="card match-discipline-panel"><div class="row"><h3>Disciplina em campo</h3><span class="pill">${m.plans.map((p) => E.discipline.active(p).length).join(" × ")} jogadores</span></div>${m.discipline.forfeit ? `<p class="notice">${esc(m.discipline.forfeit.reason)} aos ${m.discipline.forfeit.minute}’. Placar administrativo; não gera gols individuais.</p>` : ""}<div class="match-card-events">${cards.map((e) => `<div class="match-card-event"><span class="referee-card ${e.type === "yellow" ? "yellow" : "red"}" aria-label="${e.type === "yellow" ? "Amarelo" : "Vermelho"}"></span><time>${e.minute}’</time><div><strong>${esc(e.name)}</strong><small>${esc(e.reason)} · ${esc(m.plans[e.side].name)}</small></div></div>`).join("") || '<p class="muted">Nenhum cartão nesta partida.</p>'}</div></section>`;
}
function disciplineView() {
  const DS = E.discipline,
    t = team(),
    competitions = [
      ...state.leagues.map((l) => ({ id: l.id, name: l.name, kind: "league" })),
      ...state.cups.map((c) => ({ id: c.id, name: c.name, kind: "cup" })),
    ],
    compName = (id) => competitions.find((c) => c.id === id)?.name || id,
    current = t.selectionCompetition || t.leagueId,
    bans = t.players.flatMap((p) =>
      Object.entries(p.discipline?.bans || {})
        .filter(([, b]) => b.remaining > 0)
        .map(([id, b]) => ({ p, id, ...b })),
    ),
    rows = t.players
      .flatMap((p) =>
        Object.entries(p.discipline?.cards || {})
          .filter(([, c]) => c.season === state.season)
          .map(([id, c]) => ({ p, id, ...c })),
      )
      .sort((a, b) => b.accumulated - a.accumulated),
    pending = rows.filter(
      (c) =>
        c.accumulated ===
        DS.rules(c.id, competitions.find((x) => x.id === c.id)?.kind)
          .yellowLimit -
          1,
    ),
    history = (state.discipline?.events || [])
      .filter((e) => e.clubId === t.id)
      .slice(0, 60);
  return `<div class="hero"><span class="badge">GESTÃO DISCIPLINAR</span><h2>Quem pode entrar em campo.</h2><p>Próximo compromisso: ${esc(compName(current))}. Suspensões são cumpridas em jogos da mesma competição.</p><button data-page="Elenco">Preparar escalação →</button></div><div class="grid">${metric("SUSPENSÕES ATIVAS", bans.length, "Penas por atleta e competição")}${metric("PENDURADOS", pending.length, "Um amarelo do limite")}${metric("FORA DO PRÓXIMO JOGO", t.players.filter((p) => DS.suspension(p, current)).length, compName(current))}</div><section class="card"><h3>Suspensões a cumprir</h3><div class="discipline-bans">${bans.map((b) => `<article class="discipline-ban"><span class="referee-card red" aria-hidden="true"></span><div><strong>${esc(b.p.name)}</strong><small>${esc(compName(b.id))} · ${esc(b.reason)}</small></div><b>${b.remaining} jogo(s)</b></article>`).join("") || '<p class="muted">Seu elenco está livre de suspensões.</p>'}</div></section><section class="card"><h3>Cartões nesta temporada</h3><div class="table-wrap"><table class="discipline-table"><thead><tr><th>JOGADOR</th><th>COMPETIÇÃO</th><th>AMARELOS</th><th>EXPULSÕES</th><th>ACÚMULO ATUAL</th><th>SITUAÇÃO</th></tr></thead><tbody>${
    rows
      .map((c) => {
        const limit = DS.rules(
          c.id,
          competitions.find((x) => x.id === c.id)?.kind,
        ).yellowLimit;
        return `<tr><td>${esc(c.p.name)}</td><td>${esc(compName(c.id))}</td><td>${c.yellows}</td><td>${c.reds}</td><td>${c.accumulated} / ${limit}</td><td>${DS.suspension(c.p, c.id) ? '<span class="discipline-red">Suspenso</span>' : c.accumulated === limit - 1 ? '<span class="discipline-yellow">Pendurado</span>' : "Disponível"}</td></tr>`;
      })
      .join("") ||
    '<tr><td colspan="6">Nenhum cartão oficial registrado nesta temporada.</td></tr>'
  }</tbody></table></div></section><section class="card"><h3>Histórico de sanções do clube</h3><div class="discipline-history">${history.map((e) => `<article><time>${esc(E.formatDate({ ...state, season: e.season }, e.offset))}</time><div><strong>${esc(e.name)}</strong><p>${e.action === "suspended" ? `Suspensão: ${e.matches} jogo(s)` : e.action === "served" ? (e.matches ? `Pena cumprida nesta rodada · restam ${e.matches} jogo(s)` : "Suspensão cumprida · liberado") : "Cartão registrado"} · ${esc(e.reason)}</p><small>${esc(compName(e.competition))}</small></div></article>`).join("") || '<p class="muted">Os próximos cartões e cumprimentos de suspensão aparecerão aqui.</p>'}</div></section><details class="card discipline-rules"><summary>Regras disciplinares da simulação</summary><p>Brasileirão: suspensão a cada 3 amarelos. Demais ligas: a cada 5. Copas continentais: a cada 3. O acúmulo é separado por competição e reinicia na temporada seguinte; penas pendentes continuam.</p><p>Dois amarelos no jogo expulsam e geram 1 jogo de suspensão. Vermelho direto: 2 jogos; conduta violenta: 3 jogos. Se o amarelo também completar o limite acumulado, as penas se somam. Os amarelos do segundo cartão contam no acumulado deste regulamento.</p><p>A pena começa no próximo jogo oficial da mesma competição, incluindo quando o atleta ficaria no banco. Dias sem jogo, outras competições e amistosos não cumprem essa pena. Cartões em amistosos afetam só a partida. Em uma transferência, as penas acompanham o atleta.</p><p>Uma equipe com menos de sete jogadores perde por resultado administrativo, sem criar gols individuais. Pressão alta aumenta o risco de advertências. Goleiro expulso é coberto por um atleta de linha até você colocar um goleiro disponível.</p><p>Estas são regras simplificadas do jogo, não uma reprodução integral dos regulamentos de cada federação. Fair play considera os cartões oficiais acompanhados desde a atualização; o histórico anterior é preservado.</p><a href="https://www.theifab.com/laws/latest/fouls-and-misconduct/" target="_blank" rel="noopener noreferrer">Referência: IFAB · faltas e conduta ↗</a></details>`;
}

let honourFilters = {
    type: "titles",
    competition: "all",
    season: "all",
    club: "all",
    award: "all",
    query: "",
    preseason: false,
  },
  honourPage = 0;
function honoursView() {
  const H = E.honours,
    f = honourFilters,
    all = H.records(state, f),
    pageSize = 12,
    pages = Math.max(1, Math.ceil(all.length / pageSize));
  honourPage = Math.min(honourPage, pages - 1);
  const compMap = new Map(
    [...state.leagues, ...state.cups].map((c) => [c.id, c.name]),
  );
  if (f.preseason)
    for (const t of state.trophies || []) compMap.set(t.competitionId, t.name);
  const list = all.slice(honourPage * pageSize, (honourPage + 1) * pageSize),
    hasAny =
      f.type === "awards"
        ? (state.performance?.awards || []).length
        : f.preseason
          ? (state.trophies || []).length
          : H.official(state).length;
  return `<div class="hero history-hero"><span class="badge">ALMANAQUE DO FUTEBOL</span><h2>Os campeões ficam para a história.</h2><p>Consulte os títulos e os vencedores das premiações registrados na sua carreira.</p></div><section class="card"><div class="segmented" role="group" aria-label="Tipo de histórico">${btn("Campeões das competições", "history-type", "titles", f.type === "titles" ? "active" : "")}${btn("Prêmios individuais", "history-type", "awards", f.type === "awards" ? "active" : "")}</div><form id="history-search" class="history-filters"><label>Temporada<select id="history-season">${options([["all", "Todas as temporadas"], ...H.seasons(state).map((y) => [String(y), E.seasonLabel({ ...state, season: y })])], f.season)}</select></label><label>Competição<select id="history-competition">${options([["all", "Todas as competições"], ...(f.type === "awards" ? [["world", "Prêmios mundiais"]] : []), ...compMap.entries()], f.competition)}</select></label><label>Clube<select id="history-club">${options(
    [
      ["all", "Todos os clubes"],
      [state.clubId, "Meu clube · " + team().name],
      ...state.teams
        .filter((t) => t.id !== state.clubId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => [t.id, t.name]),
    ],
    f.club,
  )}</select></label>${
    f.type === "awards"
      ? `<label>Prêmio<select id="history-award">${options(
          [
            ["all", "Todos os prêmios"],
            ["ballon", "Bola de Ouro"],
            ["keeper", "Melhor goleiro"],
            ["competition", "Melhor do campeonato"],
            ["month", "Melhor do mês"],
          ],
          f.award,
        )}</select></label>`
      : `<label class="history-preseason"><input id="history-preseason" type="checkbox" ${f.preseason ? "checked" : ""}>Incluir pré-temporada</label>`
  }<label>Buscar<input id="history-query" type="search" value="${esc(f.query)}" placeholder="Clube, jogador ou competição"></label><button class="primary">Filtrar</button>${btn("Limpar", "history-clear").replace("<button ", '<button type="button" ')}</form><p class="muted">${all.length} registros nesta consulta · ${H.seasons(state).length} temporadas com conquistas</p></section><div class="history-records">${list.map((r) => (f.type === "awards" ? awardCard(r.source) : `<article class="card history-champion"><div class="history-trophy" aria-hidden="true">${trophySvg()}</div><div><span class="badge">${esc(E.seasonLabel({ ...state, season: r.season }, E.league(state, team(r.clubId).leagueId)?.region))}</span><h3>${esc(r.name)}</h3><p>${teamLabel(r.clubId, "medium")}</p><small>${r.source.coachId === "you" ? "Conquistado sob seu comando" : "Campeão da competição"} · ${esc(E.formatDate({ ...state, season: r.season }, r.offset || 0))}</small></div></article>`)).join("") || `<section class="card history-empty"><span class="award-symbol" aria-hidden="true">☆</span><h3>${hasAny ? "Nenhum resultado para estes filtros." : f.type === "awards" ? "Os primeiros prêmios ainda serão entregues." : "O primeiro campeão ainda vai levantar a taça."}</h3><p>${hasAny ? "Amplie a temporada, a competição ou o clube selecionado." : "Os títulos e prêmios passam a aparecer assim que forem confirmados durante a carreira."}</p></section>`}</div>${all.length ? `<div class="row history-pagination">${btn("← Anterior", "history-page", "-1")}<span>Página ${honourPage + 1} de ${pages}</span>${btn("Próxima →", "history-page", "1")}</div>` : ""}<details class="card"><summary>Sobre estes registros</summary><p>Este almanaque usa as conquistas confirmadas no seu save. Não adiciona resultados de anos anteriores ao início da carreira. As premiações mantêm a pontuação e o pódio da data em que foram entregues.</p></details>`;
}
function renderMobileNavigation() {
  const nav = $("#mobile-nav"),
    g = NAV.groupFor(page),
    match = E.currentMatch(state).available;
  const entries = [
    ["Visão geral", "Início"],
    ["Elenco", "Elenco"],
    [match ? "Dia de jogo" : "Calendário", match ? "Jogar" : "Agenda"],
    ["Transferências", "Mercado"],
  ];
  nav.innerHTML =
    entries
      .map(
        ([p, label]) =>
          `<button data-page="${p}" ${NAV.groupFor(p) ? `data-workspace="${NAV.groupFor(p).id}"` : ""} aria-label="${label}" ${g?.page === p || page === p ? 'aria-current="page"' : ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${navigationPaths[p] || '<circle cx="12" cy="12" r="8"/><path d="m12 7 5 5-5 5-5-5Z"/>'}</svg><span>${label}</span></button>`,
      )
      .join("") +
    `<button data-action="quick-menu" aria-label="Todos os menus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg><span>Menu</span></button>`;
}
function openNews(id) {
  const articles = E.journal(state, newsScope, newsCategory, {
      outlet: newsOutlet,
      journalist: newsJournalist,
      query: newsQuery,
    }),
    index = articles.findIndex((a) => a.id === id),
    a = articles[index];
  if (!a) return;
  const dialog = $("#news-reader");
  dialog.innerHTML = `<div class="reader-toolbar"><strong>${esc(a.press.outlet.name)}</strong><button data-action="close-news-reader" aria-label="Fechar reportagem">×</button></div><article class="reader-article"><span class="badge">${esc(newsCategories[a.category] || "Futebol")} · ${esc(E.formatDate({ ...state, season: a.season }, a.offset || 0))}</span><h2 tabindex="-1">${esc(a.title)}</h2><p class="reader-byline">Por <strong>${esc(a.press.byline)}</strong></p><div class="reader-clubs">${a.clubIds.map((id) => teamLabel(id, "small")).join("")}</div><p class="reader-body">${esc(a.body || "Acompanhe os próximos acontecimentos e os resultados da temporada nas páginas do jornal.")}</p></article><div class="reader-pagination">${index > 0 ? btn("← Reportagem anterior", "read-news", articles[index - 1].id) : "<span></span>"}${index < articles.length - 1 ? btn("Próxima reportagem →", "read-news", articles[index + 1].id) : ""}</div>`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector("h2").focus({ preventScroll: true });
  dialog.scrollTop = 0;
}

function matchKits(m) {
  const kits = m.pair.map((id) => ({ ...A.clubColors(team(id)) }));
  if (A.contrast(kits[0].primary, kits[1].primary) < 1.8)
    kits[1] = {
      primary:
        A.contrast(kits[0].primary, kits[1].secondary) >= 1.8
          ? kits[1].secondary
          : A.readable(kits[0].primary),
      secondary: kits[1].primary,
    };
  return kits;
}

function alignWorkspaceTabs() {
  const bar = $(".workspace-tabs"),
    selected = bar?.querySelector('[aria-selected="true"]');
  if (!selected) return;
  const a = bar.getBoundingClientRect(),
    b = selected.getBoundingClientRect();
  if (b.left < a.left + 6) bar.scrollLeft -= a.left + 6 - b.left;
  else if (b.right > a.right - 6) bar.scrollLeft += b.right - a.right + 6;
}
window.addEventListener("resize", () =>
  requestAnimationFrame(alignWorkspaceTabs),
);

function resetPageScroll() {
  window.scrollTo({ top: 0, behavior: "instant" });
  if (matchMedia("(max-width:850px)").matches)
    $("#game")?.scrollTo({ top: 0, behavior: "instant" });
}
function syncHostingFooter() {
  document.body.classList.toggle(
    "has-hosting-badge",
    Boolean(document.getElementById("nl-badge-frame")),
  );
}
let hostingSyncQueued = false;
const hostingObserver = new MutationObserver(() => {
  if (hostingSyncQueued) return;
  hostingSyncQueued = true;
  requestAnimationFrame(() => {
    hostingSyncQueued = false;
    syncHostingFooter();
  });
});
hostingObserver.observe(document.body, { childList: true, subtree: true });
syncHostingFooter();
