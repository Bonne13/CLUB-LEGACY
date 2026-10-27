const { chromium } = require("playwright");
const fs = require("node:fs");
const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000";
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator("#start-coach-name").fill("Carlos Silva");
  await page.locator("#start-club").selectOption("br-7");
  await page.locator("#start-calendar").selectOption("classic");
  await page.getByRole("button", { name: "Começar carreira" }).click();
  await require("./navigation-helper.cjs").navigate(page, "Elenco");
  await page.getByRole("tab", { name: "Jogadores", exact: true }).click();
  await page
    .getByRole("button", { name: "Renovar", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Enviar proposta" }).click();
  assert(
    await page
      .getByRole("status")
      .innerText()
      .then((t) => t.includes("Proposta enviada")),
  );
  await page
    .getByRole("button", { name: "Vender", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Aceitar venda" }).click();
  await require("./navigation-helper.cjs").navigate(page, "Transferências");
  await page.evaluate(() => {
    team().finance.transferBudget = Math.max(
      team().finance.transferBudget,
      1000000000,
    );
    team().finance.wageBudget = E.finance.payroll(team()) + 10000000;
    team().money = Math.max(team().money, 2000000000);
  });
  await page
    .getByRole("button", { name: "Negociar", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Enviar proposta" }).click();
  await require("./navigation-helper.cjs").navigate(page, "Categorias de base");
  await page
    .getByRole("button", { name: "Promover · R$ 100 mil" })
    .first()
    .click();
  await require("./navigation-helper.cjs").navigate(page, "Clube");
  await page.getByRole("button", { name: "Ampliar" }).first().click();
  await page.getByRole("button", { name: "Dia de jogo", exact: true }).click();
  await page.locator("#mode").selectOption("2d");
  await page.getByRole("button", { name: "Iniciar partida" }).click();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  assert.equal(await page.locator(".dot").count(), 23);
  await page.locator("#mode").selectOption("text");
  assert.equal(await page.locator(".dot").count(), 0);
  await page.locator("#mode").selectOption("2d");
  await page.reload();
  await page.getByRole("button", { name: "Dia de jogo", exact: true }).click();
  await page.getByRole("button", { name: "Concluir partida" }).click();
  await page.getByRole("button", { name: "Continuar carreira" }).click();
  assert.equal(await page.evaluate(() => state.day), 1);
  for (const name of ["Calendário", "Carreira", "Competições", "Treinamento"])
    await page.getByRole("button", { name, exact: true }).click();
  await require("./navigation-helper.cjs").navigate(page, "Competições");
  await page.locator("#competition").selectOption("champions");
  assert(
    await page
      .locator("#content")
      .innerText()
      .then((t) => t.includes("36 clubes")),
  );
  await require("./navigation-helper.cjs").navigate(page, "Calendário");
  await page
    .getByRole("button", { name: "Consultar datas reais da base" })
    .click();
  await page.locator("#reference-league").selectOption("en");
  await page.locator("#reference-club").selectOption("en-2");
  assert(
    await page
      .locator("#content")
      .innerText()
      .then((t) => t.includes("15/08/2025") && t.includes("Bournemouth")),
  );
  await page.evaluate(() => {
    const random = () => 0.47;
    while (Legacy.dayInfo(state)) {
      if (Legacy.nextFixture(state))
        state.live = {
          ...Legacy.nextFixture(state),
          day: state.day,
          minute: 90,
          goals: [2, 1],
          shots: [5, 4],
          events: [],
        };
      Legacy.advance(state, random);
      state.live = null;
    }
    persist();
  });
  await require("./navigation-helper.cjs").navigate(page, "Carreira");
  while (await page.locator("#trophy-dialog").isVisible())
    await page.locator("[data-action=close-celebration]").click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Aceitar proposta" }).first().click();
  await require("./navigation-helper.cjs").navigate(page, "Visão geral");
  await page.getByRole("button", { name: "Iniciar temporada 2027" }).click();
  assert.equal(await page.evaluate(() => state.season), 2027);
  assert.equal(await page.evaluate(() => state.day), 0);
  await require("./navigation-helper.cjs").navigate(page, "Visão geral");
  await page.screenshot({ path: "/tmp/club-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/club-mobile.png", fullPage: true });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  const backupContext = await browser.newContext();
  const old = {
    club: "Porto Imperial",
    season: 2026,
    week: 5,
    money: 12345678,
    players: require("../engine.js").fresh().teams[0].players.slice(0, 18),
    youth: [],
    table: [{ name: "Porto Imperial", p: 7, w: 2, d: 1, l: 1, gf: 6, ga: 4 }],
  };
  await backupContext.addInitScript(
    (old) => localStorage.setItem("club-legacy-v1", JSON.stringify(old)),
    old,
  );
  const migration = await backupContext.newPage();
  await migration.goto(base);
  assert.equal(
    await migration.evaluate(
      () => state.teams.find((t) => t.id === state.clubId).name,
    ),
    "Fluminense",
  );
  assert.equal(
    await migration.evaluate(() => state.legacyArchive.table[0].p),
    7,
  );
  assert(
    await migration.evaluate(
      () => !!localStorage.getItem("club-legacy-v1-backup"),
    ),
  );
  await backupContext.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: navegador — nova carreira, renovação, venda, compra, base, estrutura, 2D/texto, retomada, resultado, páginas, datas históricas, nova temporada, troca de clube, migração e layout móvel",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
