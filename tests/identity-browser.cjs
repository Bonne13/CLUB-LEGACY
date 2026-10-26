const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  let page;
  try {
    page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      ignoreHTTPSErrors: process.env.LEGACY_BROWSER_PROXY_CA === "1",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000",
      url = process.env.LEGACY_STANDALONE ? base + "/identity.html" : base;
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
    const nav = (name) =>
      page.locator(`#nav button[data-page="${name}"]`).click();
    const images = () =>
      page.locator(".team-badge img").evaluateAll(async (imgs) => {
        await Promise.all(imgs.map((i) => i.decode()));
        return imgs.every((i) => i.naturalWidth > 0);
      });
    const primary = () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue(
          "--club-primary",
        ),
      );
    await page.goto(url);
    assert(await images());
    assert.equal(await page.locator(".club-roundel").count(), 0);
    await page.locator("#start-club").selectOption("br-1");
    assert(
      (await page.locator(".club-preview img").getAttribute("alt")).includes(
        "Palmeiras",
      ),
    );
    await page.locator("#start-coach-name").fill("Rafaela Silva");
    await page.locator("[data-action=begin]").click();
    assert(await images());
    const clubColor = await primary();
    await page.evaluate(() => {
      window.originalNav = document.querySelector(
        '#nav button[data-page="Elenco"]',
      );
      window.originalIdentity = document.querySelector("#sidebar-club");
    });
    await nav("Elenco");
    assert(
      await page.evaluate(
        () =>
          originalNav ===
            document.querySelector('#nav button[data-page="Elenco"]') &&
          originalIdentity === document.querySelector("#sidebar-club") &&
          document.activeElement === originalNav,
      ),
    );
    await nav("Competições");
    assert.equal(await page.locator("tbody .team-badge img").count(), 20);
    assert(await images());
    await page.screenshot({
      path: "/tmp/legacy-v08-table-dark.png",
      fullPage: true,
    });
    // Um arquivo indisponível usa um emblema neutro, sem imagem quebrada ou sigla.
    await page
      .locator("tbody .team-badge img")
      .first()
      .evaluate((i) => i.dispatchEvent(new Event("error")));
    assert.equal(
      await page.locator('tbody .team-badge[data-loaded="false"]').count(),
      1,
    );
    assert(
      await page
        .locator('tbody .team-badge[data-loaded="false"] svg')
        .isVisible(),
    );
    await nav("Seleções");
    assert.equal(await page.locator("#national-choice").count(), 0);
    assert.equal(
      await page.locator('[data-action="assume-national"]').count(),
      0,
    );
    assert.equal(
      await page
        .locator('[data-action="workspace"][data-id="national"]')
        .count(),
      0,
    );
    assert.equal(await primary(), clubColor);
    const selection = await page.evaluate(() => {
      state.reputation = 90;
      state.today = 55;
      state.day = E.calendar().findIndex((d) => d.offset >= 55);
      state.national.nextReview = 55;
      const row = E.league(state, team().leagueId).table.find(
        (r) => r.id === state.clubId,
      );
      row.w = 8;
      row.p = 24;
      const invite = E.national.review(state);
      render();
      return invite.selectionId;
    });
    // A oferta sozinha não muda o cargo nem a identidade do clube.
    assert.equal(await primary(), clubColor);
    await page
      .locator(`[data-action=assume-national][data-id="${selection}"]`)
      .click();
    assert.equal(
      await page.evaluate(() => document.body.dataset.scope),
      "national",
    );
    assert.equal(
      await page.evaluate(() => document.body.dataset.identity),
      selection,
    );
    assert.notEqual(await primary(), clubColor);
    assert(await images());
    assert(
      (
        await page
          .locator("#sidebar-club .sidebar-club img")
          .getAttribute("alt")
      ).startsWith("Bandeira"),
    );
    await page.screenshot({
      path: "/tmp/legacy-v08-national-dark.png",
      fullPage: true,
    });
    await nav("Elenco");
    assert.equal(
      await page.locator("#tactical-scope").inputValue(),
      "national",
    );
    assert.equal(
      await page.evaluate(() => document.body.dataset.scope),
      "national",
    );
    await page
      .getByRole("tab", { name: "Jogadores e contratos", exact: true })
      .click();
    assert((await page.locator("#content").innerText()).includes("Convocados"));
    assert.equal(await page.locator('[data-action="renew"]').count(), 0);
    await nav("Calendário");
    assert.equal(
      await page.locator("#calendar-scope").inputValue(),
      "national",
    );
    assert.equal(
      await page.evaluate(() => document.body.dataset.scope),
      "national",
    );
    await page.locator("#theme-toggle").click();
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "light",
    );
    await page.screenshot({
      path: "/tmp/legacy-v08-national-light.png",
      fullPage: true,
    });
    await nav("Financeiro");
    assert.equal(await primary(), clubColor);
    assert.equal(
      await page.evaluate(() => document.body.dataset.scope),
      "club",
    );
    await page.locator('[data-action="workspace"][data-id="national"]').click();
    assert.equal(await page.evaluate(() => page), "Seleções");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "/tmp/legacy-v08-mobile-light.png",
      fullPage: true,
    });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.locator('[data-action="workspace"][data-id="club"]').click();
    assert.equal(await primary(), clubColor);
    await page.locator("#theme-toggle").click();
    await page.screenshot({
      path: "/tmp/legacy-v08-mobile-dark.png",
      fullPage: true,
    });
    const retained = await page.evaluate(() => {
      const nav = document.querySelector("#nav");
      nav.scrollLeft = 140;
      const before = nav.scrollLeft;
      render();
      return { before, after: nav.scrollLeft };
    });
    assert.equal(retained.after, retained.before);
    const durations = await page.evaluate(() =>
      ["Elenco", "Transferências", "Olheiros", "Calendário", "Visão geral"].map(
        (p) => {
          const t = performance.now();
          document.querySelector(`#nav button[data-page="${p}"]`).click();
          return performance.now() - t;
        },
      ),
    );
    assert(Math.max(...durations) < 500);
    await page.locator("#save").click();
    await page.reload();
    assert(await images());
    assert.equal(await page.evaluate(() => state.national.job), selection);
    await page.locator('[data-action="workspace"][data-id="national"]').click();
    await page
      .getByRole("button", { name: "Deixar seleção", exact: true })
      .click();
    assert.equal(await page.evaluate(() => state.national.job), null);
    assert.equal(await primary(), clubColor);
    assert.equal(
      await page
        .locator('[data-action="workspace"][data-id="national"]')
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      `PASS: escudos reais, fallback, menu estável e foco preservado; cores por contexto e tema; seleção apenas por convite; convocados, calendário, celular e persistência. Navegação máxima: ${Math.round(Math.max(...durations))} ms.`,
    );
  } catch (e) {
    if (page)
      await page
        .screenshot({
          path: "/tmp/legacy-v08-identity-failure.png",
          fullPage: true,
        })
        .catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
