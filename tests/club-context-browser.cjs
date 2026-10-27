const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  let page;
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      ignoreHTTPSErrors: process.env.LEGACY_BROWSER_PROXY_CA === "1",
    });
    page = await context.newPage();
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000",
      url = process.env.LEGACY_STANDALONE ? base + "/club-context.html" : base;
    if (process.env.LEGACY_STANDALONE) {
      const html = fs.readFileSync(
        path.resolve(__dirname, "../../CLUB-LEGACY-jogavel.html"),
        "utf8",
      );
      await page.route("**/*", (r) =>
        r.request().url() === url
          ? r.fulfill({ contentType: "text/html", body: html })
          : r.abort(),
      );
    }
    await page.goto(url);
    const nav = require("./navigation-helper.cjs").createNavigator(page);
    await page.locator("#start-league").selectOption("es");
    await page.locator("#start-club").selectOption("es-1");
    await page.locator("#start-coach-name").fill("Marina Costa");
    await page.locator("#start-calendar").selectOption("regional");
    await page.locator("#start-game-mode").selectOption("test");
    await page.locator("[data-action=begin]").click();
    await nav("Elenco", { squadTab: "players" });
    await page.locator("#roster-position").selectOption("GOL");
    const names = await page.locator("#game").innerText();
    assert.match(names, /Joan García/);
    assert.match(names, /Wojciech Szczesny/);
    assert.match(names, /Dominik Livakovic/);
    await nav("Categorias de base");
    assert.match(await page.locator("#game").innerText(), /Jesse Bisiwu/);
    await nav("Clube");
    assert.match(
      await page.locator(".stadium-profile").innerText(),
      /Spotify Camp Nou/,
    );
    assert.equal(await page.locator(".facility-card").count(), 6);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "facilities " + width,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(".venue-catalog summary").click();
    await page.locator("#venue-reference-club").selectOption("br-0");
    assert.match(
      await page.locator("#venue-reference-result").innerText(),
      /Maracan/,
    );
    assert.equal(
      await page.locator("#venue-reference-club option").count(),
      397,
    );
    await page.screenshot({ path: "/tmp/dinastia-v18-club-estate-mobile.png" });
    const old = await page.evaluate(() => ({
      cash: team().money,
      level: E.facilities.level(team(), "medical"),
      quote: E.facilities.quote(state, team(), "medical"),
    }));
    await page.locator("[data-facility=medical] [data-action=upgrade]").click();
    assert.equal(
      await page.evaluate(() => team().money),
      old.cash - old.quote.cost,
    );
    assert.equal(
      await page.evaluate(() => E.facilities.level(team(), "medical")),
      old.level,
    );
    assert(
      await page
        .locator("[data-facility=medical] [role=progressbar]")
        .isVisible(),
    );
    await page.locator("#save").click();
    await page.reload();
    assert.equal(
      await page.evaluate(
        () =>
          team().infrastructure.projects.filter((p) => p.status === "building")
            .length,
      ),
      1,
    );
    await nav("Visão geral");
    await page.locator("#simulate-amount").fill(String(old.quote.days));
    await page.locator("#simulate-unit").selectOption("days");
    await page
      .getByRole("button", { name: "Simular período", exact: true })
      .click();
    await page.waitForFunction(() => !advancing, {}, { timeout: 120000 });
    assert.equal(
      await page.evaluate(() => E.facilities.level(team(), "medical")),
      old.level + 1,
    );
    await nav("Clube");
    assert.match(
      await page.locator(".facility-history").innerText(),
      /Departamento médico/,
    );
    await page
      .locator("[data-facility=commercial] [data-action=upgrade]")
      .click();
    const refund = await page.evaluate(() =>
      E.facilities.refund(
        state,
        team().infrastructure.projects.find((p) => p.status === "building"),
      ),
    );
    const beforeRefund = await page.evaluate(() => team().money);
    await page
      .locator("[data-facility=commercial] [data-action=cancel-upgrade]")
      .click();
    assert.equal(
      await page.evaluate(() => team().money),
      beforeRefund + refund,
    );
    await nav("Competições");
    await page.locator(".league-rule-card summary").click();
    assert.match(
      await page.locator(".league-rule-card").innerText(),
      /confronto direto/,
    );
    assert.match(
      await page.locator(".rules-summary").innerText(),
      /3 oportunidades/,
    );
    assert(
      await page.locator('.league-rule-card a[href*="rfef.es"]').isVisible(),
    );
    await page.locator("#competition").selectOption("br");
    await page.locator(".league-rule-card summary").click();
    assert.match(
      await page.locator(".league-rule-card ol").innerText(),
      /Vitórias/,
    );
    await page.locator("#competition").selectOption("us");
    await page.locator(".league-rule-card summary").click();
    assert.match(
      await page.locator(".league-rule-card").innerText(),
      /adaptado/,
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await nav("Salvamentos");
    await page.locator("#save").click();
    await page.reload();
    assert.equal(
      await page.evaluate(() => E.facilities.level(team(), "medical")),
      old.level + 1,
    );
    assert.equal(
      await page.evaluate(
        () => team().players.filter((p) => p.pos === "GOL").length,
      ),
      3,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: Barcelona professional/youth goalkeepers; all-stadium catalogue; 320/390/768 responsive estate; construction debit, persistence, calendar completion and cancellation; league rules and explicit format limits.",
    );
  } catch (e) {
    if (page)
      await page
        .screenshot({ path: "/tmp/dinastia-v18-club-context-failure.png" })
        .catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
