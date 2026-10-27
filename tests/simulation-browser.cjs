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
      url = process.env.LEGACY_STANDALONE ? base + "/simulation.html" : base;
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
    await page.locator("#start-calendar").selectOption("classic");
    await page.locator("#start-coach-name").fill("Marina Costa");
    await page.locator("[data-action=begin]").click();
    const initial = await page.evaluate(() => ({
      lineup: [...team().lineup],
      roster: team().players.map((p) => p.id),
      numbers: Object.fromEntries(
        team().players.map((p) => [p.id, p.shirtNumber]),
      ),
      raph: team().players.find((p) => p.name === "Raphinha").id,
      yamal: team().players.find((p) => p.name === "Lamine Yamal").id,
    }));
    assert.equal(initial.numbers[initial.raph], 11);
    assert.equal(initial.numbers[initial.yamal], 10);
    await nav("Elenco", { squadTab: "players" });
    await page
      .locator(`[data-action=edit-shirt][data-id="${initial.raph}"]`)
      .click();
    assert(await page.locator('[data-shirt-choice="10"]').isEnabled());
    await page.locator('[data-shirt-choice="10"]').click();
    assert.match(
      await page.locator("#shirt-reassignment").innerText(),
      /Lamine Yamal.*camisa \d+/,
    );
    const replacement = await page.evaluate(
      ({ raph }) => E.shirtNumberChange(state, raph, 10).displacedNumber,
      initial,
    );
    await page.screenshot({
      path: "/tmp/dinastia-v17-shirt-reassignment-mobile.png",
    });
    await page
      .getByRole("button", { name: "Confirmar número", exact: true })
      .click();
    assert.equal(
      await page.evaluate(
        (id) => team().players.find((p) => p.id === id).shirtNumber,
        initial.raph,
      ),
      10,
    );
    assert.equal(
      await page.evaluate(
        (id) => team().players.find((p) => p.id === id).shirtNumber,
        initial.yamal,
      ),
      replacement,
    );
    await page.locator("#save").click();
    await page.reload();
    assert.equal(
      await page.evaluate(
        (id) => team().players.find((p) => p.id === id).shirtNumber,
        initial.raph,
      ),
      10,
    );
    await page.locator("#match-day").click();
    await page.evaluate(() => {
      window.originalSimulationMinute = E.minute;
      E.minute = (s, m) => originalSimulationMinute(s, m, () => 0.99);
      speed = 120;
    });
    await page.locator("[data-action=play]").click();
    await page.waitForFunction(() => state.live.minute >= 6);
    await page.locator("[data-action=pause]").click();
    await page.waitForFunction(() => !animatingPlay);
    let patterns = await page.evaluate(() => [
      ...new Set(state.live.timeline.map((p) => p.pattern)),
    ]);
    assert(patterns.length >= 4, patterns.join(","));
    assert.equal(
      await page.locator("#pitch .dot:not(.ball):visible").count(),
      22,
    );
    await page.screenshot({ path: "/tmp/dinastia-v17-varied-2d-mobile.png" });
    await page.locator("#mode").selectOption("3d");
    await page.waitForFunction(() => match3D?.snapshot().players === 22);
    const swap = await page.evaluate(() => {
      const m = state.live,
        plan = m.plans[m.pair.indexOf(state.clubId)],
        out = plan.starters[8],
        incoming = team().players.find(
          (p) =>
            plan.bench.includes(p.id) &&
            !plan.starters.some((x) => x.id === p.id),
        );
      return { out: out.id, incoming: incoming.id };
    });
    await page.locator("#substitution-form [name=out]").selectOption(swap.out);
    await page
      .locator("#substitution-form [name=in]")
      .selectOption(swap.incoming);
    await page
      .getByRole("button", { name: "Fazer substituição", exact: true })
      .click();
    assert.deepEqual(await page.evaluate(() => team().lineup), initial.lineup);
    await page.locator("[data-action=pause]").click();
    await page.waitForFunction(() => state.live.minute >= 8);
    await page.locator("[data-action=pause]").click();
    await page.waitForFunction(() => !animatingPlay);
    assert.equal(await page.evaluate(() => match3D.snapshot().players), 22);
    assert(await page.evaluate(() => match3D.snapshot().visiblePitch));
    await page.screenshot({ path: "/tmp/dinastia-v17-varied-3d-mobile.png" });
    await page.evaluate(() => {
      E.minute = originalSimulationMinute;
    });
    await page.locator("[data-action=instant]").click();
    await page.waitForFunction(() => state.live?.done);
    assert.deepEqual(await page.evaluate(() => team().lineup), initial.lineup);
    assert.deepEqual(
      await page.evaluate(() => team().players.map((p) => p.id)),
      initial.roster,
    );
    await page.locator("[data-action=continue]").click();
    await nav("Elenco", { squadTab: "tactics" });
    assert.deepEqual(await page.evaluate(() => team().lineup), initial.lineup);
    await page.locator("#save").click();
    await page.reload();
    assert.deepEqual(await page.evaluate(() => team().lineup), initial.lineup);
    assert.equal(
      await page.evaluate(
        (id) => team().players.find((p) => p.id === id).shirtNumber,
        initial.yamal,
      ),
      replacement,
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: Barcelona 2026/27 numbers; occupied-number preview and relocation; save/reload; varied 2D/3D plays and real substitutions; unchanged permanent eleven and roster after the match; mobile layout.",
    );
  } catch (e) {
    if (page)
      await page
        .screenshot({ path: "/tmp/dinastia-v17-simulation-failure.png" })
        .catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
