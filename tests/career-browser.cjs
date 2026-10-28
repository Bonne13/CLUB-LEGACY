const { chromium } = require("playwright"),
  fs = require("node:fs"),
  assert = require("node:assert/strict"),
  path = require("node:path");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000",
      target = process.env.LEGACY_STANDALONE
        ? base + "/standalone-test.html"
        : base;
    if (process.env.LEGACY_STANDALONE) {
      const html = fs.readFileSync(
        path.resolve(__dirname, "../../CLUB-LEGACY-jogavel.html"),
        "utf8",
      );
      await p.route("**/*", (r) =>
        r.request().url() === target
          ? r.fulfill({ contentType: "text/html", body: html })
          : r.abort(),
      );
    }
    await p.goto(target);
    await p.locator("#start-coach-name").fill("Mariana Costa");
    await p.locator("#start-coach-age").fill("32");
    await p.locator("#start-coach-nationality").selectOption("Portugal");
    await p.locator("#start-league").selectOption("en");
    assert.equal(
      await p.locator("#start-coach-name").inputValue(),
      "Mariana Costa",
    );
    await p.locator("#start-calendar").selectOption("classic");
    await p
      .getByRole("button", { name: "Começar carreira", exact: false })
      .click();
    await require("./navigation-helper.cjs").navigate(p, "Carreira");
    assert(
      (await p.locator("#content").innerText()).includes("32 anos · Portugal"),
    );
    await require("./navigation-helper.cjs").navigate(p, "Seleções");
    await p.evaluate(() => {
      const id = "nt-Argentina";
      state.national.invites.push({
        id: "browser-invite",
        selectionId: id,
        name: E.national.definitions.find((d) => d.id === id).name,
        season: state.season,
        offset: state.today,
        expires: state.today + 14,
        required: 35,
        status: "pending",
        reason: "Oferta de federação para testar convocação e persistência.",
      });
      render();
    });
    await p.locator("[data-action=assume-national]").click();
    assert.equal(await p.evaluate(() => state.national.job), "nt-Argentina");
    await p.locator("#national-filter").selectOption("called");
    assert.equal(await p.locator("[data-action=call-player]").count(), 23);
    await p.locator("[data-action=call-player]").last().click();
    assert.equal(await p.locator("[data-action=call-player]").count(), 22);
    await p.locator("[data-action=auto-call]").click();
    assert.equal(await p.locator("[data-action=call-player]").count(), 23);
    // Conclui o primeiro jogo do clube; a semana seguinte deve parar no amistoso.
    await p.getByRole("button", { name: "Dia de jogo", exact: true }).click();
    await p.locator("[data-action=play]").click();
    await p.locator("[data-action=instant]").click();
    await p.locator("[data-action=continue]").click();
    await p.locator("#simulate-amount").fill("1");
    await p.locator("#simulate-unit").selectOption("weeks");
    await p
      .getByRole("button", { name: "Simular período", exact: true })
      .click();
    await p.waitForFunction(() => !advancing);
    assert.equal(await p.evaluate(() => state.today), 5);
    await p.getByRole("button", { name: "Dia de jogo", exact: true }).click();
    assert((await p.locator(".score").innerText()).includes("Argentina"));
    await p.locator("#mode").selectOption("2d");
    await p.locator("[data-action=play]").click();
    await p.locator("[data-action=pause]").click();
    await require("./navigation-helper.cjs").navigate(p, "Salvamentos");
    const dl = p.waitForEvent("download");
    await p.locator("[data-action=export-save]").click();
    const download = await dl;
    const file = "/tmp/legacy-career-roundtrip.json";
    await download.saveAs(file);
    const exported = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.equal(exported.career.profile.name, "Mariana Costa");
    assert.equal(exported.career.live.kind, "national");
    // Arquivo inválido preserva toda a simulação.
    const before = await p.evaluate(() => JSON.stringify(state));
    await p.locator("#import-file").setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{invalid"),
    });
    await p.waitForTimeout(200);
    assert((await p.locator("#notification").innerText()).includes("inválido"));
    assert.equal(await p.evaluate(() => JSON.stringify(state)), before);
    await p.locator("[data-action=delete-save]").click();
    await p.locator("[data-action=cancel-save-dialog]").click();
    assert.equal(await p.evaluate(() => state.profile.name), "Mariana Costa");
    // Exclui carreira, mantém tema e não restaura nenhum backup ao recarregar.
    await p.evaluate(() =>
      localStorage.setItem("club-legacy-v1-backup", "legacy-backup"),
    );
    await p.locator("[data-action=delete-save]").click();
    await p.locator("[data-action=confirm-delete]").click();
    assert(await p.locator("#career-entry").isVisible());
    assert.equal(
      await p.evaluate(() => localStorage.getItem("club-legacy-v2")),
      null,
    );
    await p.reload();
    assert(await p.locator("#career-entry").isVisible());
    assert.equal(
      await p.evaluate(() => localStorage.getItem("club-legacy-v2")),
      null,
    );
    assert.equal(
      await p.evaluate(() => localStorage.getItem("club-legacy-v1-backup")),
      null,
    );
    await p.locator("#import-file").setInputFiles(file);
    await p.locator("[data-action=cancel-save-dialog]").click();
    assert(await p.locator("#career-entry").isVisible());
    await p.locator("#import-file").setInputFiles(file);
    await p.locator("[data-action=confirm-import]").click();
    assert.equal(await p.evaluate(() => state.profile.name), "Mariana Costa");
    assert.equal(await p.evaluate(() => state.national.job), "nt-Argentina");
    await p.reload();
    assert.equal(await p.evaluate(() => state.today), 5);
    await p.getByRole("button", { name: "Dia de jogo", exact: true }).click();
    await p.locator("[data-action=instant]").click();
    assert(
      await p.evaluate(() =>
        state.national.results.some(
          (r) => r.pair.includes("nt-Argentina") && r.offset === 5,
        ),
      ),
    );
    await p.locator("[data-action=continue]").click();
    await require("./navigation-helper.cjs").navigate(p, "Carreira");
    assert.equal(await p.locator("#profile-form").count(), 0);
    assert.equal(await p.evaluate(() => state.profile.name), "Mariana Costa");
    for (const width of [1440, 390]) {
      await p.setViewportSize({ width, height: 900 });
      await require("./navigation-helper.cjs").navigate(p, "Seleções");
      await p.screenshot({
        path: "/tmp/legacy-national-" + width + ".png",
        fullPage: true,
      });
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: perfil, convocação, amistoso 2D, exportação, importação inválida/cancelada/confirmada, exclusão e recarga; desktop e celular.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
