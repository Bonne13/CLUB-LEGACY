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
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000",
      url = process.env.LEGACY_STANDALONE ? base + "/preseason.html" : base;
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
    const advance = async (days) => {
      await nav("Visão geral");
      await page.locator("#simulate-amount").fill(String(days));
      await page.locator("#simulate-unit").selectOption("days");
      await page
        .getByRole("button", { name: "Simular período", exact: true })
        .click();
      await page.waitForFunction(() => !advancing);
    };
    const play = async () => {
      await page.locator("#match-day").click();
      await page.locator("[data-action=play]").click();
      await page.locator("[data-action=instant]").click();
      if (await page.locator("#trophy-dialog").evaluate((e) => e.open))
        await page.locator("[data-action=close-celebration]").click();
      await page.locator("[data-action=continue]").click();
      if (await page.locator("#trophy-dialog").evaluate((e) => e.open))
        await page.locator("[data-action=close-celebration]").click();
    };
    await page.goto(url);
    await page.locator("#start-league").selectOption("es");
    await page.locator("#start-club").selectOption("es-1");
    await page.locator("#start-coach-name").fill("Marina Costa");
    assert.equal(
      await page.locator("#start-calendar").inputValue(),
      "regional",
    );
    await page.locator("[data-action=begin]").click();
    assert.equal(
      await page.evaluate(() => E.schedule.iso(state)),
      "2026-07-01",
    );
    assert(await page.locator("#match-day").isHidden());
    assert((await page.locator("#context").innerText()).includes("2026/27"));
    await nav("Elenco");
    assert(
      (await page.locator(".captain-list").innerText()).includes("Raphinha"),
    );
    assert.equal(
      await page.evaluate(() => T.specialists(team()).captain.name),
      "Raphinha",
    );
    assert(
      (
        await page
          .locator("[data-assignment=captain] option")
          .first()
          .innerText()
      ).includes("Hierarquia"),
    );
    await page.screenshot({
      path: "/tmp/legacy-v10-captains.png",
      fullPage: true,
    });
    await page.keyboard.press("Control+k");
    await page.locator("#quick-menu-search").fill("treinamento");
    await page.locator("#quick-menu-results [data-page=Treinamento]").click();
    assert(await page.locator("#quick-menu").evaluate((e) => !e.open));
    assert((await page.locator(".training-cards tbody tr").count()) > 10);
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const invalid = await page
        .locator(".training-cards select,.training-day select")
        .evaluateAll(
          (els) =>
            els.filter((e) => {
              const a = e.getBoundingClientRect(),
                b = e.closest("td,label").getBoundingClientRect();
              return a.left < b.left - 1 || a.right > b.right + 1;
            }).length,
        );
      assert.equal(
        invalid,
        0,
        "treino sem controles fora da célula em " + width,
      );
      await page
        .locator(".training-cards tbody tr")
        .first()
        .screenshot({
          path: "/tmp/legacy-v10-training-card-" + width + ".png",
        });
      await page
        .locator(".training-individual")
        .screenshot({ path: "/tmp/legacy-v10-training-" + width + ".png" });
    }
    await page.locator("[data-action=training-layout][data-id=table]").click();
    await page.waitForFunction(() => trainingLayout === "table");
    await page.waitForSelector(".physical-table:not(.training-cards)");
    assert.equal(await page.locator(".training-cards").count(), 0);
    await page.locator("[data-action=training-layout][data-id=cards]").click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await nav("Calendário");
    await page.locator(".hero [data-action=arrange-friendly]").click();
    await page.locator("#friendly-form [name=date]").fill("2026-07-06");
    await page.locator("#friendly-form [name=opponent0]").selectOption("es-0");
    await page
      .getByRole("button", { name: "Confirmar amistoso", exact: true })
      .click();
    assert.equal(await page.evaluate(() => state.friendlies.length), 1);
    assert(
      (await page.locator(".calendar-grid").innerText()).includes("AMIST"),
    );
    await page.locator('[data-action=calendar-select][data-id="5"]').click();
    await page
      .getByRole("button", { name: "Cancelar amistoso", exact: true })
      .click();
    assert.equal(
      await page.evaluate(() => state.friendlies[0].status),
      "cancelled",
    );
    await page.locator(".hero [data-action=arrange-friendly]").click();
    await page.locator("#friendly-form [name=date]").fill("2026-07-06");
    await page.locator("#friendly-form [name=opponent0]").selectOption("es-0");
    await page
      .getByRole("button", { name: "Confirmar amistoso", exact: true })
      .click();
    await page.locator("[data-action=organize-preseason]").click();
    await page.locator("#friendly-form [name=date]").fill("2026-07-15");
    await page.locator("#friendly-form [name=title]").fill("Copa Marina");
    await page.locator("#friendly-form [name=opponent0]").selectOption("es-2");
    await page.locator("#friendly-form [name=opponent1]").selectOption("es-3");
    await page.locator("#friendly-form [name=opponent2]").selectOption("es-4");
    await page
      .getByRole("button", { name: "Confirmar torneio", exact: true })
      .click();
    assert.equal(
      await page.evaluate(() => state.preseasonTournaments.length),
      1,
    );
    assert.equal(
      await page.locator(".preseason-tournament tbody tr").count(),
      4,
    );
    await page.screenshot({
      path: "/tmp/legacy-v10-calendar.png",
      fullPage: true,
    });
    await advance(10);
    assert.equal(await page.evaluate(() => state.today), 5);
    await play();
    assert.equal(
      await page.evaluate(
        () => state.friendlies.find((f) => f.id === "friendly-2").status,
      ),
      "completed",
    );
    await advance(14);
    assert.equal(await page.evaluate(() => state.today), 14);
    await play();
    await advance(7);
    assert.equal(await page.evaluate(() => state.today), 18);
    await play();
    await advance(7);
    assert.equal(await page.evaluate(() => state.today), 22);
    await play();
    assert.equal(
      await page.evaluate(() => state.preseasonTournaments[0].status),
      "completed",
    );
    assert.equal(
      await page.evaluate(() =>
        E.league(state, "es").table.reduce((n, r) => n + r.p, 0),
      ),
      0,
    );
    await nav("Calendário");
    for (let i = 0; i < 6; i++)
      await page.locator('[data-action=calendar-month][data-id="1"]').click();
    assert(
      (await page.locator(".calendar-toolbar h3").innerText()).includes("2027"),
    );
    await page.locator("[data-action=calendar-today]").click();
    await page.waitForFunction(() => calendarMonth === 6);
    assert(
      (await page.locator(".calendar-toolbar h3").innerText())
        .toLowerCase()
        .includes("julho"),
    );
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const pages = [
        "Visão geral",
        "Jornal",
        "Calendário",
        "Elenco",
        "Treinamento",
        "Transferências",
        "Olheiros",
        "Categorias de base",
        "Competições",
        "Troféus",
        "Carreira",
        "Clube",
        "Financeiro",
        "Seleções",
        "Salvamentos",
      ];
      for (const name of pages) {
        await nav(name);
        assert((await page.locator("#content").innerText()).length > 40, name);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          name + " em " + width,
        );
      }
      await page.screenshot({
        path: "/tmp/legacy-v10-all-pages-" + width + ".png",
      });
    }
    await page.locator("#navigation-search").click();
    await page.locator("#quick-menu-search").fill("inexistente");
    assert(
      (await page.locator("#quick-menu-results").innerText()).includes(
        "Nenhuma",
      ),
    );
    await page.keyboard.press("Escape");
    await page.locator("#save").click();
    await page.reload();
    assert.equal(await page.evaluate(() => state.calendarProfile.region), "eu");
    assert.equal(
      await page.evaluate(() => state.preseasonTournaments[0].status),
      "completed",
    );
    assert.equal(
      await page.evaluate(() => E.schedule.iso(state)),
      "2026-07-24",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: capitania atual e liderança; treino sem sobreposição em quatro larguras; menu pesquisável, todas as páginas em desktop/celular; início 2026/27, amistosos, cancelamento, torneio completo, desgaste, calendário em 2027 e save.",
    );
  } catch (error) {
    if (page)
      await page
        .screenshot({ path: "/tmp/legacy-v10-browser-failure.png" })
        .catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
