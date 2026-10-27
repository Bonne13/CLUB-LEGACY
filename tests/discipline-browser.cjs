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
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        ignoreHTTPSErrors: process.env.LEGACY_BROWSER_PROXY_CA === "1",
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.setDefaultTimeout(45000);
    const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000",
      url = process.env.LEGACY_STANDALONE ? base + "/discipline.html" : base;
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
    const nav = require("./navigation-helper.cjs").createNavigator(page);
    await page.goto(url);
    await page.locator("#start-league").selectOption("es");
    await page.locator("#start-club").selectOption("es-1");
    await page.locator("#start-calendar").selectOption("classic");
    await page.locator("#start-coach-name").fill("Marina Costa");
    await page.locator("[data-action=begin]").click();
    await nav("Disciplina");
    assert(
      (await page.locator("#content").innerText()).includes(
        "livre de suspensões",
      ),
    );
    await page.locator("#match-day").click();
    await page.locator("#mode").selectOption("2d");
    await page.locator("[data-action=play]").click();
    await page.locator("[data-action=pause]").click();
    const dismissed = await page.evaluate(() => {
      stopTimer();
      paused = true;
      animatingPlay = false;
      const m = state.live,
        side = m.pair.indexOf(state.clubId),
        p = m.plans[side].starters[8];
      while (m.minute < 10) E.minute(state, m, () => 0.99);
      E.discipline.card(state, m, side, p.id, "yellow");
      E.discipline.card(state, m, side, p.id, "yellow");
      window.disciplineDismissed = p.id;
      render();
      draw();
      return { id: p.id, name: p.name, side };
    });
    assert(
      (await page.locator("#match-discipline").innerText()).includes(
        "Segundo amarelo",
      ),
    );
    assert.equal(
      await page.locator("#pitch .dot:not(.ball):visible").count(),
      21,
    );
    assert.equal(
      await page
        .locator(
          `#substitution-form select[name=out] option[value="${dismissed.id}"]`,
        )
        .count(),
      0,
    );
    assert((await page.locator("#stats").innerText()).includes("Expulsões"));
    await page.screenshot({ path: "/tmp/legacy-v13-red-card.png" });
    await page.locator("#mode").selectOption("3d");
    await page.waitForFunction(() => match3D?.snapshot().players === 21);
    assert.equal(await page.evaluate(() => match3D.snapshot().players), 21);
    await page.locator("[data-action=instant]").click();
    const ban = await page.evaluate(() => {
      const p = team().players.find((p) => p.id === disciplineDismissed);
      return E.discipline.suspension(p, "es");
    });
    assert(ban >= 1);
    assert(
      (await page.locator(".match-ratings-card").innerText()).includes(
        "EXPULSO",
      ),
    );
    await page.locator("[data-action=continue]").click();
    await nav("Disciplina");
    assert(
      (await page.locator(".discipline-bans").innerText()).includes(
        dismissed.name,
      ),
    );
    await page.locator(".discipline-rules summary").click();
    assert(
      (await page.locator(".discipline-rules").innerText()).includes("cada 5"),
    );
    await page.screenshot({ path: "/tmp/legacy-v13-discipline.png" });
    const before = await page.evaluate(() => ({
      today: state.today,
      money: team().money,
    }));
    await nav("Elenco");
    assert(
      await page.evaluate(
        () =>
          !E.matchPlans(state, {
            pair: [state.clubId, "es-0"],
            competition: "es",
            kind: "league",
          })[0].starters.some((p) => p.id === disciplineDismissed),
      ),
    );
    await nav("Prêmios");
    await page.locator("#awards-scope").selectOption("club");
    await page.locator(".performance-breakdown summary").first().click();
    assert(
      (await page.locator(".performance-breakdown[open]").innerText()).includes(
        "Fair play",
      ),
    );
    await page.locator("[data-action=show-award-criteria]").click();
    assert(
      (await page.locator(".criteria-pillars").innerText()).includes(
        "Cartões oficiais",
      ),
    );
    await nav("Jornal");
    await page.locator("#news-category").selectOption("discipline");
    assert(
      (await page.locator(".news-grid").innerText()).includes(dismissed.name),
    );
    await nav("Disciplina");
    await page.setViewportSize({ width: 390, height: 844 });
    for (const theme of ["dark", "light"]) {
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: `/tmp/legacy-v13-discipline-mobile-${theme}.png`,
      });
    }
    assert.deepEqual(
      await page.evaluate(() => ({ today: state.today, money: team().money })),
      before,
    );
    await page.evaluate(() => persist());
    await page.reload();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await nav("Disciplina");
    assert(
      (await page.locator(".discipline-bans").innerText()).includes(
        dismissed.name,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Cartões, expulsão 2D/3D, substituições, suspensões, escalação, jornal, fair play, temas, celular e save: OK.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
