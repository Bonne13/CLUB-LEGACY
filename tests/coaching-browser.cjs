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
    page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      ignoreHTTPSErrors: process.env.LEGACY_BROWSER_PROXY_CA === "1",
    });
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000",
      url = process.env.LEGACY_STANDALONE ? base + "/coaching.html" : base;
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
    await page.locator("#start-coach-name").fill("Marina Costa");
    await page.locator("#start-game-mode").selectOption("test");
    await page.locator("#start-calendar").selectOption("classic");
    await page.locator("[data-action=begin]").click();
    assert.equal(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue(
          "--club-primary",
        ),
      ),
      "#a50044",
    );
    await nav("Financeiro");
    const cash = await page.evaluate(() => team().money);
    await page.locator("#test-funds-amount").fill("500.000.000");
    await page
      .getByRole("button", { name: "Adicionar dinheiro", exact: true })
      .click();
    assert.equal(await page.evaluate(() => team().money), cash + 500000000);
    await page.locator("#match-day").click();
    let centred = await page.locator(".score").evaluate((el) => {
      const a = el.getBoundingClientRect(),
        b = el.querySelector(".score-centre").getBoundingClientRect();
      return Math.abs((a.left + a.right - b.left - b.right) / 2) < 1;
    });
    assert(centred);
    await page.locator("#mode").selectOption("3d");
    await page.evaluate(() => {
      const original = E.minute;
      E.minute = function (s, m, rng) {
        E.minute = original;
        let v = [0, 0, 0.5, 0, 0];
        return original(s, m, () => v.shift() ?? 0);
      };
    });
    await page.locator("[data-action=play]").click();
    await page.getByRole("button", { name: "Pausar", exact: true }).click();
    await page.waitForFunction(() => !animatingPlay);
    await page.waitForTimeout(300);
    assert.equal(await page.locator("#mode").inputValue(), "3d");
    assert.equal(await page.locator("#three-stage canvas").count(), 1);
    const scene = await page.evaluate(() => match3D.snapshot());
    assert(scene.players >= 11 && scene.triangles > 100);
    assert.equal(await page.evaluate(() => state.live.goals[0]), 1);
    await page
      .locator("#three-stage")
      .screenshot({ path: "/tmp/legacy-v09-three-broadcast.png" });
    await page.locator("#match-camera").selectOption("goal");
    assert.equal(await page.evaluate(() => match3D.snapshot().camera), "goal");
    await page
      .locator("#three-stage")
      .screenshot({ path: "/tmp/legacy-v09-three-goal.png" });
    await page.locator("#match-camera").selectOption("tactical");
    assert.equal(
      await page.evaluate(() => match3D.snapshot().camera),
      "tactical",
    );
    const height = await page
      .locator("#three-stage")
      .evaluate((e) => e.clientHeight);
    assert(height > 200 && height < 900);
    await page.screenshot({ path: "/tmp/legacy-v09-three-final.png" });
    await page.locator("#mode").selectOption("2d");
    assert.equal(await page.locator("#pitch .pitch-markings").count(), 1);
    assert.equal(await page.locator("#three-stage").count(), 0);
    assert.equal(await page.locator("#pitch .dot:not(.ball)").count(), 22);
    await page.screenshot({ path: "/tmp/legacy-v09-two-final.png" });
    await page.locator("[data-action=instant]").click();
    await page.locator("[data-action=continue]").click();
    await nav("Treinamento");
    const athlete = await page.evaluate(() => {
      const t = team(),
        used = new Set(Object.keys(state.live?.minutesPlayed || {}));
      return (
        t.players.find((p) => !p.injury && !used.has(p.id))?.id ||
        t.players.find((p) => !p.injury).id
      );
    });
    await page
      .locator(`[data-training-focus="${athlete}"]`)
      .selectOption("finishing");
    const weekday = await page.evaluate(() => E.training.weekday(state));
    await page
      .locator(`[data-training-day="${weekday}"]`)
      .selectOption("technical");
    assert.equal(
      await page.evaluate(
        (id) => team().players.find((p) => p.id === id).trainingFocus,
        athlete,
      ),
      "finishing",
    );
    await page.screenshot({ path: "/tmp/legacy-v09-training-final.png" });
    await nav("Olheiros");
    const form = page.locator("#scouting-form");
    await form.locator("[name=depth]").selectOption("quick");
    await form.locator("[name=profile]").selectOption("potential");
    await form.locator("[name=minOverall]").fill("55");
    await form.locator("[name=maxAge]").fill("23");
    await form.locator("[name=region]").selectOption("eu");
    await form.locator("[name=maxFee]").fill("20.000.000");
    await form.locator("[name=maxSalary]").fill("200.000");
    const before = await page.evaluate(() => team().money);
    await page
      .getByRole("button", { name: "Iniciar observação", exact: true })
      .click();
    assert.equal(await page.evaluate(() => team().money), before - 6000);
    await nav("Visão geral");
    await page.locator("#simulate-amount").fill("2");
    await page.locator("#simulate-unit").selectOption("days");
    await page
      .getByRole("button", { name: "Simular período", exact: true })
      .click();
    await page.waitForFunction(() => !advancing);
    assert((await page.evaluate(() => state.trainingHistory.length)) >= 2);
    await nav("Olheiros");
    assert((await page.locator(".scout-player").count()) > 1);
    const candidates = await page
      .locator("[data-action=scout-compare]")
      .evaluateAll((els) => els.slice(0, 2).map((e) => e.dataset.id));
    await page
      .locator(`[data-action=scout-shortlist][data-id="${candidates[0]}"]`)
      .click();
    for (const id of candidates)
      await page
        .locator(`[data-action=scout-compare][data-id="${id}"]`)
        .click();
    assert.equal(await page.locator(".scout-comparison tbody tr").count(), 7);
    await page.screenshot({ path: "/tmp/legacy-v09-scouts-final.png" });
    await nav("Elenco");
    await page.getByRole("tab", { name: "Jogadores", exact: true }).click();
    const first = page.locator("[data-action=edit-shirt]").first(),
      id = await first.getAttribute("data-id");
    await first.click();
    assert.equal(await page.locator(".shirt-grid button").count(), 99);
    assert((await page.locator(".shirt-grid button:disabled").count()) > 0);
    await page.locator('[data-shirt-choice="99"]').click();
    assert.equal(await page.locator(".shirt-preview-number").innerText(), "99");
    await page
      .getByRole("button", { name: "Confirmar número", exact: true })
      .click();
    assert.equal(
      await page.evaluate(
        (id) => team().players.find((p) => p.id === id).shirtNumber,
        id,
      ),
      99,
    );
    await page.getByRole("button", { name: "Cartões", exact: true }).click();
    assert((await page.locator(".roster-player").count()) > 10);
    await page.screenshot({ path: "/tmp/legacy-v09-roster-final.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const view of ["Elenco", "Olheiros", "Treinamento"]) {
      await nav(view);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        view,
      );
      await page.screenshot({
        path: "/tmp/legacy-v09-" + view + "-mobile.png",
      });
    }
    await nav("Elenco");
    await page.locator(".player-jersey").first().click();
    assert((await page.locator("#deal").boundingBox()).width <= 390);
    await page.screenshot({ path: "/tmp/legacy-v09-shirt-mobile.png" });
    await page.locator("[data-action=close-dialog]").click();
    await page.locator("#save").click();
    await page.reload();
    assert(await page.evaluate(() => state.scouting.shortlist.length > 0));
    assert.equal(
      await page.evaluate(
        (id) => team().players.find((p) => p.id === id).shirtNumber,
        id,
      ),
      99,
    );
    assert.equal(
      await page.evaluate(
        (id) => team().players.find((p) => p.id === id).trainingFocus,
        athlete,
      ),
      "finishing",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: placar centralizado; 3D WebGL real, câmeras, gol e 2D; dinheiro localizado; olheiros com filtros, comparação e lista; treino semanal, focos e histórico; elenco e grade de camisas; persistência e celular.",
    );
  } catch (e) {
    if (page)
      await page
        .screenshot({ path: "/tmp/legacy-v09-failure.png", fullPage: true })
        .catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
