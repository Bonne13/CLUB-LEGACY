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
    page.setDefaultTimeout(45000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000",
      url = process.env.LEGACY_STANDALONE ? base + "/press.html" : base;
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
    const nav = (name) => page.locator(`#nav [data-page="${name}"]`).click();
    await page.goto(url);
    await page.locator("#start-league").selectOption("es");
    await page.locator("#start-club").selectOption("es-1");
    await page.locator("#start-calendar").selectOption("classic");
    await page.locator("#start-coach-name").fill("Marina Costa");
    await page.locator("[data-action=begin]").click();
    await nav("Jornal");
    assert(
      (await page.locator(".press-disclosure").innerText()).includes(
        "não são notícias publicadas",
      ),
    );
    assert.equal(await page.locator("#news-outlet option").count(), 10);
    assert.equal(await page.locator("#news-journalist option").count(), 9);
    assert((await page.locator(".news-article").count()) > 0);
    assert(
      await page
        .locator(".article-reference > strong")
        .evaluateAll((els) =>
          els.every((e) => e.textContent === "Redação Legacy"),
        ),
    );
    await page.screenshot({ path: "/tmp/legacy-v12-newspaper.png" });
    const before = await page.evaluate(() => ({
      today: state.today,
      money: team().money,
    }));
    await page.locator(".press-directory > summary").click();
    assert.equal(await page.locator(".press-outlets > a").count(), 9);
    assert.equal(await page.locator(".press-profiles > article").count(), 8);
    assert(
      await page
        .locator(".press-directory a")
        .evaluateAll((els) =>
          els.every(
            (e) => e.href.startsWith("https:") && e.rel.includes("noopener"),
          ),
        ),
    );
    await page.locator("[data-action=press-follow][data-id=pvc]").click();
    assert.equal(await page.locator("#news-outlet").inputValue(), "uol");
    assert.equal(await page.locator("#news-journalist").inputValue(), "pvc");
    assert((await page.locator(".news-article").count()) > 0);
    assert(
      await page
        .locator(".article-reference")
        .evaluateAll((els) =>
          els.every((e) => e.textContent.includes("Paulo Vinícius Coelho")),
        ),
    );
    await page.locator("[data-action=press-clear]").click();
    await page.locator("#news-outlet").selectOption("marca");
    assert.equal(await page.locator("#news-journalist option").count(), 1);
    assert(
      await page
        .locator(".press-source > a")
        .evaluateAll((els) => els.every((e) => e.textContent === "MARCA")),
    );
    await page.locator("[data-action=press-clear]").click();
    await page.locator("#news-query").fill("MARINA");
    await page.locator("#press-search .primary").click();
    assert((await page.locator(".news-article").count()) > 0);
    await page.locator("#news-query").fill("no-result-for-this-query-zz");
    await page.locator("#press-search .primary").click();
    assert.equal(await page.locator(".news-article").count(), 0);
    await page.locator("[data-action=press-clear]").click();
    assert.deepEqual(
      await page.evaluate(() => ({ today: state.today, money: team().money })),
      before,
    );
    await page.locator("#match-day").click();
    await page.locator("#mode").selectOption("text");
    await page.evaluate(() => {
      window.pressMinute = E.minute;
      let count = 0;
      E.minute = function (s, m) {
        const r = count++ === 0 ? [0, 0, 0.5, 0, 0] : [];
        return pressMinute(s, m, () => r.shift() ?? 0.99);
      };
    });
    await page.locator("[data-action=play]").click();
    await page.locator("[data-action=instant]").click();
    await page.evaluate(() => {
      E.minute = pressMinute;
    });
    const winner = await page.evaluate(
      () =>
        Object.values(state.live.performance.players).find(
          (p) => p.decisiveGoals === 1,
        )?.id,
    );
    assert(winner);
    await page.locator("[data-action=continue]").click();
    await nav("Prêmios");
    await page.locator("#awards-scope").selectOption("club");
    await page.locator(".performance-breakdown summary").first().click();
    assert(
      (await page.locator(".performance-breakdown[open]").innerText()).includes(
        "Atuações decisivas",
      ),
    );
    assert(
      (await page.evaluate(
        () =>
          E.performance
            .rank(state, "ballon")
            .find(
              (p) =>
                p.id ===
                Object.values(state.performance.matches[0].players).find(
                  (x) => x.decisiveGoals === 1,
                ).id,
            ).points.decisiveness,
      )) > 0,
    );
    await page.locator("[data-action=show-award-criteria]").click();
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "award-real-criteria",
    );
    assert.equal(await page.locator(".criteria-pillars > article").count(), 3);
    assert(
      (await page.locator(".criteria-pillars").innerText()).includes(
        "Cartões oficiais reduzem",
      ),
    );
    assert.equal(
      new URL(
        await page
          .locator(".real-award-criteria .row > a")
          .getAttribute("href"),
      ).hostname,
      "ballondor.com",
    );
    await page.locator(".real-award-criteria details > summary").last().click();
    await page
      .locator(".real-award-criteria")
      .screenshot({ path: "/tmp/legacy-v12-award-criteria.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({ path: "/tmp/legacy-v12-criteria-mobile.png" });
    await nav("Jornal");
    await page.locator("[data-action=news-scope][data-id=world]").click();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({ path: "/tmp/legacy-v12-newspaper-mobile.png" });
    await page.locator(".press-directory > summary").click();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.locator("#theme-toggle").click();
    await page.screenshot({ path: "/tmp/legacy-v12-press-light.png" });
    await page.locator("#save").click();
    await page.reload();
    assert(
      await page.evaluate(
        (id) => state.performance.current.players[id].decisiveGoals === 1,
        winner,
      ),
    );
    await nav("Jornal");
    assert(
      (await page.locator(".press-disclosure").innerText()).includes(
        "referências",
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: veículos e perfis reais, autoria simulada identificada, diretório, fontes HTTPS, filtros combinados, pesquisa, mundo, crédito por decisão, critérios oficiais explicados, celular, claro/escuro e persistência.",
    );
  } catch (error) {
    if (page)
      await page
        .screenshot({ path: "/tmp/legacy-v12-failure.png" })
        .catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
