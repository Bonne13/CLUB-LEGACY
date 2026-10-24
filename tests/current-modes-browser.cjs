const { chromium } = require("playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
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
    assert.equal(await p.locator("#start-game-mode").inputValue(), "normal");
    await p.locator("#start-coach-name").fill("Ana Silva");
    await p.locator("[data-action=begin]").click();
    assert.equal(await p.evaluate(() => state.season), 2026);
    assert(await p.locator("#time-controls").isVisible());
    for (const name of [
      "Elenco",
      "Financeiro",
      "Calendário",
      "Carreira",
      "Jornal",
    ]) {
      await p.getByRole("button", { name, exact: true }).click();
      assert(await p.locator("#time-controls").isHidden());
      assert.equal(await p.locator("#simulation-form").count(), 0);
    }
    await p.getByRole("button", { name: "Financeiro", exact: true }).click();
    assert.equal(await p.locator("#test-funds-form").count(), 0);
    await p.getByRole("button", { name: "Carreira", exact: true }).click();
    p.once("dialog", (d) => d.dismiss());
    await p.locator("[data-action=enable-test-mode]").click();
    assert.equal(await p.evaluate(() => state.mode), "normal");
    p.once("dialog", (d) => d.accept());
    await p.locator("[data-action=enable-test-mode]").click();
    assert.equal(await p.evaluate(() => state.mode), "test");
    await p.getByRole("button", { name: "Financeiro", exact: true }).click();
    const before = await p.evaluate(() => ({
      cash: team().money,
      transfer: team().finance.transferBudget,
    }));
    await p.locator("#test-funds-amount").fill("500000000");
    await p
      .getByRole("button", { name: "Adicionar dinheiro", exact: true })
      .click();
    assert.equal(await p.evaluate(() => team().money), before.cash + 500000000);
    assert.equal(
      await p.evaluate(() => team().finance.transferBudget),
      before.transfer + 500000000,
    );
    assert((await p.locator("#context").innerText()).includes("MODO TESTE"));
    await p.reload();
    assert.equal(await p.evaluate(() => state.mode), "test");
    assert.equal(await p.evaluate(() => state.testFundingTotal), 500000000);
    await p.getByRole("button", { name: "Visão geral", exact: true }).click();
    assert(await p.locator("#time-controls").isVisible());
    await p.getByRole("button", { name: "Elenco", exact: true }).click();
    await p
      .getByRole("tab", { name: "Jogadores e contratos", exact: true })
      .click();
    assert((await p.locator("#content").innerText()).includes("02/06/2026"));
    assert((await p.locator("#content").innerText()).includes("Lucas Paquetá"));
    await p.getByRole("button", { name: "Financeiro", exact: true }).click();
    await p.setViewportSize({ width: 390, height: 844 });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({
      path: "/tmp/legacy-test-mode-mobile.png",
      fullPage: true,
    });
    // Outra carreira escolhe modo teste já na criação.
    await p.getByRole("button", { name: "Salvamentos", exact: true }).click();
    await p.locator("[data-action=delete-save]").click();
    await p.locator("[data-action=confirm-delete]").click();
    await p.locator("#start-game-mode").selectOption("test");
    await p.locator("#start-coach-name").fill("Ana Teste");
    await p.locator("#start-league").selectOption("en");
    assert.equal(await p.locator("#start-game-mode").inputValue(), "test");
    await p.locator("[data-action=begin]").click();
    assert.equal(await p.evaluate(() => state.mode), "test");
    await p.getByRole("button", { name: "Financeiro", exact: true }).click();
    assert(await p.locator("#test-funds-form").isVisible());
    assert.deepEqual(errors, []);
    console.log(
      "PASS: fontes atuais, dois modos, aportes e persistência, calendário exclusivo da Visão geral, criação e ativação, desktop/celular.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
