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
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000",
      url = process.env.LEGACY_STANDALONE ? base + "/performance.html" : base;
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
    await nav("Prêmios");
    assert(
      (await page.locator(".awards-empty").innerText()).includes(
        "partidas oficiais",
      ),
    );
    await page.locator("#match-day").click();
    await page.locator("#mode").selectOption("text");
    await page.evaluate(() => {
      window.beforeAwardsMinute = E.minute;
      let step = 0;
      E.minute = function (s, m) {
        step++;
        let values = step <= 3 ? [0, 0, 0.5, 0, 0] : [];
        return beforeAwardsMinute(s, m, () => values.shift() ?? 0.99);
      };
    });
    await page.locator("[data-action=play]").click();
    await page.locator("[data-action=instant]").click();
    await page.evaluate(() => {
      E.minute = beforeAwardsMinute;
    });
    const motm = await page.evaluate(
      () => state.live.performance.playerOfMatch,
    );
    assert(motm && motm.goals === 3);
    assert(
      (await page.locator(".match-best-player").innerText()).includes(
        motm.name,
      ),
    );
    assert.equal(await page.locator(".match-rating-line").count(), 22);
    assert(
      (await page.locator("#log").innerText()).includes("Melhor em campo"),
    );
    await page
      .locator(".match-ratings-card")
      .screenshot({ path: "/tmp/legacy-v11-match-ratings.png" });
    await page.locator("[data-action=continue]").click();
    await nav("Prêmios");
    await page.locator("#awards-scope").selectOption("club");
    assert(
      (await page.locator(".awards-table tbody").innerText()).includes(
        motm.name,
      ),
    );
    await page.locator(".performance-breakdown summary").first().click();
    assert(
      (await page.locator(".performance-breakdown[open]").innerText()).includes(
        "Contribuição para títulos",
      ),
    );
    await page.locator("#awards-kind").selectOption("keeper");
    assert(
      (await page.locator(".awards-table thead").innerText()).includes(
        "DEFESAS",
      ),
    );
    assert.equal(await page.locator(".awards-table tbody tr").count(), 1);
    await page.locator("#awards-kind").selectOption("competition");
    await page.locator("#awards-competition").selectOption("es");
    assert(
      (await page.locator(".awards-table tbody").innerText()).includes(
        motm.name,
      ),
    );
    await page.locator(".match-report summary").first().click();
    assert.equal(
      await page.locator(".match-report[open] tbody tr").count(),
      22,
    );
    await page.locator("#save").click();
    await page.reload();
    assert.equal(
      await page.evaluate(() => state.performance.matches[0].playerOfMatch.id),
      motm.id,
    );
    await nav("Jornal");
    assert(
      (await page.locator("#content").innerText()).includes("melhor em campo"),
    );
    // Complete a real season with the deployed engine, including every AI fixture.
    const result = await page.evaluate(() => {
      let seed = 2026,
        days = 0;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      while (E.dayInfo(state) && days++ < 366) {
        if (E.nextFixture(state)) {
          const m = E.makeMatch(state, "text");
          while (m.minute < 90) E.minute(state, m, random);
        }
        E.advance(state, random);
        state.live = null;
      }
      page = "Prêmios";
      awardsKind = "ballon";
      awardsScope = "all";
      render();
      return {
        days,
        gold: state.performance.awards.find((a) => a.type === "ballon"),
        keeper: state.performance.awards.find((a) => a.type === "keeper"),
        months: state.performance.awards.filter((a) => a.type === "month")
          .length,
        championships: state.performance.awards.filter(
          (a) => a.type === "competition",
        ).length,
      };
    });
    assert(
      result.days < 366 &&
        result.gold &&
        result.keeper &&
        result.months > 0 &&
        result.championships > 0,
    );
    while (await page.locator("#trophy-dialog").evaluate((e) => e.open))
      await page.locator("[data-action=close-celebration]").click();
    assert.equal(
      await page.locator(".confirmed-award h3").innerText(),
      result.gold.winner.name,
    );
    await page.screenshot({ path: "/tmp/legacy-v11-ballon-dor.png" });
    await page.locator("#awards-kind").selectOption("keeper");
    assert.equal(
      await page.locator(".confirmed-award h3").innerText(),
      result.keeper.winner.name,
    );
    await page.screenshot({ path: "/tmp/legacy-v11-goalkeeper.png" });
    await page.locator("#awards-kind").selectOption("month");
    assert(
      (await page.locator(".confirmed-award").innerText()).includes(
        "Melhor jogador do mês",
      ),
    );
    await page.locator("#awards-kind").selectOption("competition");
    assert(
      (await page.locator(".confirmed-award").innerText()).includes(
        "Melhor jogador do campeonato",
      ),
    );
    await page.locator("#awards-kind").selectOption("history");
    const first = await page
      .locator(".individual-award h3")
      .first()
      .innerText();
    await page.locator('[data-action=awards-page][data-id="1"]').click();
    assert.notEqual(
      await page.locator(".individual-award h3").first().innerText(),
      first,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    for (const kind of [
      "ballon",
      "keeper",
      "month",
      "competition",
      "history",
    ]) {
      await page.locator("#awards-kind").selectOption(kind);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        kind,
      );
      await page.screenshot({
        path: "/tmp/legacy-v11-" + kind + "-mobile.png",
      });
    }
    await page.locator("#save").click();
    await page.reload();
    assert(
      await page.evaluate(() =>
        state.performance.awards.some((a) => a.type === "keeper"),
      ),
    );
    assert(await page.evaluate(() => state.performance.current.closed));
    await nav("Visão geral");
    await page.locator("[data-action=next-season]").click();
    assert.equal(
      await page.evaluate(
        () => Object.keys(state.performance.current.players).length,
      ),
      0,
    );
    await nav("Prêmios");
    await page.locator("#awards-kind").selectOption("history");
    assert((await page.locator(".individual-award").count()) > 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: notas e MVP por partida; estatísticas e critérios; goleiros; mensal e campeonato; temporada completa com Bola de Ouro e melhor goleiro; histórico, paginação, desktop/celular, save comprimido e temporada seguinte.",
    );
  } catch (e) {
    if (page)
      await page
        .screenshot({ path: "/tmp/legacy-v11-browser-failure.png" })
        .catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
