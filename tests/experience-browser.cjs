const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { seedHonours } = require("./experience-fixtures.cjs");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  let page, mobile;
  const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000",
    url = process.env.LEGACY_STANDALONE ? base + "/experience.html" : base,
    errors = [];
  const make = async (context) => {
    const p = await context.newPage();
    p.setDefaultTimeout(60000);
    p.on("pageerror", (e) => errors.push(e.message));
    if (process.env.LEGACY_STANDALONE) {
      const html = fs.readFileSync(
        path.resolve(__dirname, "../../CLUB-LEGACY-jogavel.html"),
        "utf8",
      );
      await p.route("**/*", (r) =>
        r.request().url() === url
          ? r.fulfill({ contentType: "text/html", body: html })
          : r.abort(),
      );
    }
    await p.goto(url);
    return p;
  };
  try {
    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      ignoreHTTPSErrors: process.env.LEGACY_BROWSER_PROXY_CA === "1",
    });
    page = await make(desktop);
    let nav = require("./navigation-helper.cjs").createNavigator(page);
    await page.locator("#start-league").selectOption("es");
    await page.locator("#start-club").selectOption("es-1");
    await page.locator("#start-coach-name").fill("Marina Costa");
    await page.locator("#start-calendar").selectOption("classic");
    await page.locator("[data-action=begin]").click();
    await nav("Jornal");
    assert(
      !/fict[ií]ci|simula[cç][aã]o/i.test(
        await page.locator(".newspaper").innerText(),
      ),
    );
    assert.equal(await page.locator(".press-disclosure").count(), 0);
    const headline = await page.locator(".news-article h3").first().innerText();
    await page.locator("[data-action=read-news]").first().click();
    assert(await page.locator("#news-reader").isVisible());
    assert.equal(await page.locator("#news-reader h2").innerText(), headline);
    await page.screenshot({ path: "/tmp/dinastia-v15-newspaper-reader.png" });
    await page.locator("[data-action=close-news-reader]").click();
    await nav("Histórico");
    assert(
      (await page.locator(".history-empty").innerText()).includes(
        "primeiro campeão",
      ),
    );
    const names = await page.evaluate((source) => {
      const seed = Function("return (" + source + ")")();
      const result = seed(state, E);
      render();
      return result;
    }, seedHonours.toString());
    assert.equal(await page.locator(".history-champion").count(), 2);
    await page.locator("#history-competition").selectOption("champions");
    assert.equal(await page.locator(".history-champion").count(), 1);
    assert(
      (await page.locator(".history-champion").innerText()).includes(
        "Barcelona",
      ),
    );
    await page.locator("[data-action=history-clear]").click();
    await page.locator("#history-season").selectOption("2025");
    assert(
      (await page.locator(".history-champion").innerText()).includes(
        "Real Madrid",
      ),
    );
    await page.locator("[data-action=history-type][data-id=awards]").click();
    await page.locator("[data-action=history-clear]").click();
    assert.equal(
      await page.locator(".history-records .individual-award").count(),
      2,
    );
    await page.locator("#history-award").selectOption("keeper");
    assert(
      (await page.locator(".history-records").innerText()).includes(
        names.keeper,
      ),
    );
    await page.locator("[data-action=history-clear]").click();
    await page.locator("#history-query").fill(names.player);
    await page.locator("#history-search .primary").click();
    assert.equal(
      await page.locator(".history-records .individual-award").count(),
      1,
    );
    await page.screenshot({ path: "/tmp/dinastia-v15-honours.png" });
    await nav("Salvamentos");
    assert(
      (await page.locator(".save-explanation").innerText()).includes(
        "não recebem os saves",
      ),
    );
    assert(
      (await page.locator(".save-explanation").innerText()).includes(
        new URL(url).origin,
      ),
    );
    await page.evaluate(() => {
      state.reputation += 1;
      autosaver.markDirty();
      window.dispatchEvent(new Event("pagehide"));
    });
    assert(
      await page.evaluate(() => localStorage.getItem(KEY).startsWith("CL3:")),
    );
    assert(
      await page.evaluate(() =>
        Boolean(JSON.parse(localStorage.getItem("dinastia-save-meta")).savedAt),
      ),
    );
    const backup = await page.evaluate(() => LegacySaves.serialize(state));
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      ignoreHTTPSErrors: process.env.LEGACY_BROWSER_PROXY_CA === "1",
    });
    mobile = await make(phone);
    assert(await mobile.locator("#career-entry").isVisible());
    await mobile.locator("#import-file").setInputFiles({
      name: "dinastia-fc-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(backup),
    });
    await mobile.locator("[data-action=confirm-import]").click();
    assert.equal(
      await mobile.evaluate(() => state.profile.name),
      "Marina Costa",
    );
    nav = require("./navigation-helper.cjs").createNavigator(mobile);
    await mobile.evaluate(() => {
      if (!document.getElementById("nl-badge-frame")) {
        const badge = document.createElement("iframe");
        badge.id = "nl-badge-frame";
        badge.title = "Hosting badge fixture";
        badge.style =
          "position:fixed;bottom:0;right:0;width:194px;height:64px;border:0;z-index:2147483645";
        badge.srcdoc =
          '<body style="margin:0;background:#132139;color:#fff;font:12px system-ui;display:flex;align-items:center;justify-content:center;height:64px">Powered by Netlify</body>';
        document.body.append(badge);
      }
    });
    await mobile.waitForFunction(() =>
      document.body.classList.contains("has-hosting-badge"),
    );
    const footer = await mobile.locator("#mobile-nav").boundingBox(),
      branding = await mobile.locator("#nl-badge-frame").boundingBox();
    assert(footer.y + footer.height <= branding.y + 1);
    for (const width of [320, 360, 390, 768]) {
      await mobile.setViewportSize({ width, height: 844 });
      for (const name of [
        "Jornal",
        "Elenco",
        "Treinamento",
        "Olheiros",
        "Financeiro",
        "Histórico",
        "Salvamentos",
      ]) {
        await nav(name);
        assert(
          await mobile.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          name + " " + width,
        );
      }
    }
    await mobile.setViewportSize({ width: 390, height: 844 });
    assert(await mobile.locator("#mobile-nav").isVisible());
    assert.equal(await mobile.locator("#mobile-nav button").count(), 5);
    await mobile.locator("#mobile-nav [data-action=quick-menu]").click();
    assert.equal(await mobile.locator("#quick-menu-results button").count(), 8);
    await mobile.keyboard.press("Escape");
    await nav("Elenco", { squadTab: "players" });
    await mobile.getByRole("button", { name: "Cartões", exact: true }).click();
    await mobile.locator(".player-jersey").first().click();
    const shirts = await mobile
      .locator(".shirt-grid button")
      .first()
      .boundingBox();
    assert(shirts.width >= 40 && shirts.height >= 44);
    await mobile.locator("[data-action=close-dialog]").click();
    await nav("Jornal");
    await mobile.locator("[data-action=read-news]").first().click();
    assert((await mobile.locator("#news-reader").boundingBox()).width <= 390);
    await mobile.locator("[data-action=close-news-reader]").click();
    await mobile.locator('#mobile-nav [data-page="Dia de jogo"]').click();
    await mobile.locator("#mode").selectOption("3d");
    await mobile.evaluate(() => {
      window.originalExperienceMinute = E.minute;
      let played = false;
      E.minute = (s, m) => {
        const values = played ? [] : [0, 0, 0.5, 0, 0];
        played = true;
        return originalExperienceMinute(s, m, () => values.shift() ?? 0.99);
      };
    });
    await mobile.locator("[data-action=play]").click();
    await mobile.waitForFunction(() => state.live.minute >= 1);
    await mobile.locator("[data-action=pause]").click();
    await mobile.waitForFunction(() => !animatingPlay);
    await mobile.evaluate(() => {
      E.minute = originalExperienceMinute;
    });
    let scene = await mobile.evaluate(() => match3D.snapshot());
    assert.equal(scene.players, 22);
    assert.equal(scene.quality, "low");
    assert(scene.visiblePitch);
    assert(scene.labels <= 2);
    assert.equal(await mobile.locator("#mode").inputValue(), "3d");
    await mobile.locator("#three-stage canvas").scrollIntoViewIfNeeded();
    const canvas = await mobile.locator("#three-stage canvas").boundingBox(),
      target = scene.screenPlayers.find(
        (p) => p.x > 0.1 && p.x < 0.9 && p.y > 0.1 && p.y < 0.9,
      );
    await mobile.touchscreen.tap(
      canvas.x + target.x * canvas.width,
      canvas.y + target.y * canvas.height,
    );
    assert(await mobile.evaluate(() => Boolean(match3D.snapshot().selectedId)));
    await mobile.locator(".field-expand").click();
    assert(
      await mobile
        .locator("#field-shell")
        .evaluate((e) => e.classList.contains("is-expanded")),
    );
    await mobile.waitForFunction(
      () => match3D.snapshot().aspect < 1 && match3D.snapshot().visiblePitch,
    );
    await mobile.locator('[data-action="field-follow"]').click();
    assert.equal(
      await mobile.evaluate(() => match3D.snapshot().camera),
      "follow",
    );
    await mobile.locator('[data-action="field-follow"]').click();
    await mobile.screenshot({
      path: "/tmp/dinastia-v15-mobile-expanded-3d.png",
    });
    await mobile.setViewportSize({ width: 844, height: 390 });
    await mobile.waitForFunction(() => match3D.snapshot().aspect > 2);
    assert(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await mobile
      .locator(".expanded-field-toolbar [data-action=match-expand]")
      .click();
    await mobile.setViewportSize({ width: 390, height: 844 });
    await mobile.locator("#match-camera").selectOption("follow");
    assert.equal(
      await mobile.evaluate(() => match3D.snapshot().camera),
      "follow",
    );
    await mobile.locator("#match-quality").selectOption("high");
    await mobile.waitForFunction(() => match3D.snapshot().quality === "high");
    await mobile.locator("#mode").selectOption("2d");
    assert.equal(
      await mobile.locator("#pitch .dot:not(.ball):visible").count(),
      22,
    );
    await mobile.locator("#mode").selectOption("text");
    assert.equal(await mobile.locator("#three-stage").count(), 0);
    assert.equal(await mobile.locator("#pitch").count(), 0);
    await mobile.locator("[data-action=instant]").click();
    await mobile.locator("[data-action=continue]").click();
    await nav("Histórico");
    await mobile
      .locator('[data-action="history-type"][data-id="awards"]')
      .click();
    assert(
      (await mobile.locator(".history-records").innerText()).includes(
        names.player,
      ),
    );
    await nav("Salvamentos");
    assert(await mobile.locator("[data-action=export-save]").isVisible());
    await mobile.screenshot({ path: "/tmp/dinastia-v15-mobile-saves.png" });
    await mobile.locator("#save").click();
    await mobile.reload();
    assert.equal(
      await mobile.evaluate(() => state.profile.name),
      "Marina Costa",
    );
    assert.equal(
      await mobile.evaluate(() => state.matchPreferences.quality),
      "high",
    );
    assert.equal(
      await mobile.evaluate(
        () =>
          state.performance.awards.filter((a) => a.id.includes(":world:season"))
            .length,
      ),
      2,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: jornal sem avisos, leitor, histórico filtrável, save local/backup/importação entre contextos, mobile 320–768, toque, camisas, 3D leve/detalhado, câmera dinâmica, campo ampliado, 2D/texto e persistência.",
    );
  } catch (e) {
    if (mobile)
      await mobile
        .screenshot({ path: "/tmp/dinastia-v15-experience-failure.png" })
        .catch(() => {});
    else if (page)
      await page
        .screenshot({ path: "/tmp/dinastia-v15-experience-failure.png" })
        .catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
