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
      url = process.env.LEGACY_STANDALONE ? base + "/navigation.html" : base;
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
    assert((await page.title()).includes("DINASTIA FC"));
    await page.locator("#start-league").selectOption("es");
    await page.locator("#start-club").selectOption("es-1");
    await page.locator("#start-coach-name").fill("Marina Costa");
    await page.locator("#start-calendar").selectOption("classic");
    await page.locator("[data-action=begin]").click();
    assert.deepEqual(await page.locator("#nav .nav-label").allTextContents(), [
      "Visão geral",
      "Jornal",
      "Calendário",
      "Elenco",
      "Transferências",
      "Competições",
      "Carreira",
      "Clube",
    ]);
    const before = await page.evaluate(() => ({
      today: state.today,
      money: team().money,
      lineup: [...team().lineup],
    }));
    await nav("Prêmios");
    assert.equal(await page.locator("#title").innerText(), "Competições");
    assert.equal(
      await page.locator("#nav [aria-current=page]").getAttribute("data-page"),
      "Competições",
    );
    assert.equal(
      await page.locator(".workspace-tabs [aria-selected=true]").innerText(),
      "Prêmios e estatísticas",
    );
    assert(await page.locator(".awards-table").isVisible());
    await nav("Troféus");
    assert.equal(await page.locator("#title").innerText(), "Carreira");
    assert(await page.locator(".trophy-grid").isVisible());
    await nav("Salvamentos");
    assert(await page.locator("[data-action=export-save]").isVisible());
    await nav("Financeiro");
    assert.equal(await page.locator("#title").innerText(), "Clube");
    assert(await page.locator("#budget-transfer").isVisible());
    await nav("Elenco");
    assert.equal(await page.locator(".workspace-tabs [role=tab]").count(), 5);
    assert.equal(await page.locator(".squad-tabs").count(), 0);
    assert(await page.locator("#squad-panel-tactics").isVisible());
    await page.locator("#squad-tab-tactics").focus();
    await page.keyboard.press("ArrowRight");
    assert(await page.locator("#squad-panel-players").isVisible());
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "squad-tab-players",
    );
    await page.keyboard.press("End");
    assert.equal(
      await page.locator("#content").getAttribute("data-view"),
      "Disciplina",
    );
    assert(await page.locator(".discipline-rules").isVisible());
    await page.keyboard.press("Home");
    assert(await page.locator("#squad-panel-tactics").isVisible());
    await nav("Treinamento");
    assert(await page.locator(".training-week").isVisible());
    await nav("Categorias de base");
    assert.equal(
      await page.locator("#nav [aria-current=page]").getAttribute("data-page"),
      "Elenco",
    );
    await nav("Olheiros");
    assert.equal(await page.locator("#title").innerText(), "Transferências");
    assert.equal(await page.locator(".workspace-tabs [role=tab]").count(), 2);
    await page.keyboard.press("Control+k");
    assert.equal(await page.locator("#quick-menu-results button").count(), 8);
    await page.locator("#quick-menu-search").fill("trofeus");
    await page.locator('#quick-menu-results [data-page="Troféus"]').click();
    assert(await page.locator(".trophy-grid").isVisible());
    await nav("Jornal");
    await page.locator(".press-directory summary").click();
    assert.equal(await page.locator(".fictional-outlet").count(), 9);
    assert.equal(await page.locator(".press-directory a").count(), 0);
    assert(
      (await page.locator(".press-disclosure").innerText()).includes(
        "FICTÍCIA",
      ),
    );
    const artwork = await page.evaluate(async () => {
      const E = Legacy,
        ids = [
          "br-0",
          "br-1",
          "br-2",
          "br-5",
          "es-0",
          "es-1",
          "en-0",
          "en-1",
          "it-0",
          "it-2",
          "fr-0",
          "de-0",
        ];
      const gallery = document.createElement("section");
      gallery.id = "emblem-gallery";
      gallery.style =
        "position:fixed;inset:0;z-index:99999;background:#142139;color:white;padding:35px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;align-content:start;overflow:auto";
      gallery.innerHTML =
        '<h2 style="grid-column:1/-1">DINASTIA FC · Emblemas originais</h2>' +
        ids
          .map((id) => {
            const t = E.team(state, id);
            return `<article style="border:1px solid #35465f;border-radius:16px;padding:16px;text-align:center"><img style="width:110px;height:110px;object-fit:contain" src="${LegacyBadges.asset(t)}"><p>${t.name}</p></article>`;
          })
          .join("");
      document.body.append(gallery);
      await Promise.all(
        [...gallery.querySelectorAll("img")].map((i) => i.decode()),
      );
      return [...gallery.querySelectorAll("img")].every((i) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 96;
        const context = canvas.getContext("2d");
        context.drawImage(i, 0, 0, 96, 96);
        const pixels = context.getImageData(0, 0, 96, 96).data;
        return (
          i.naturalWidth === 96 &&
          Array.from({ length: 96 }, (_, n) => [
            n,
            95 * 96 + n,
            n * 96,
            n * 96 + 95,
          ])
            .flat()
            .every((index) => pixels[index * 4 + 3] === 0)
        );
      });
    });
    assert(artwork);
    await page.screenshot({ path: "/tmp/dinastia-v14-emblems.png" });
    await page.locator("#emblem-gallery").evaluate((e) => e.remove());
    await nav("Competições");
    await page.screenshot({ path: "/tmp/dinastia-v14-competitions.png" });
    await nav("Treinamento");
    await page.screenshot({ path: "/tmp/dinastia-v14-squad-training.png" });
    for (const width of [1024, 768, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const section of [
        "Prêmios",
        "Troféus",
        "Treinamento",
        "Olheiros",
        "Financeiro",
        "Disciplina",
      ]) {
        await nav(section);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          section + " " + width,
        );
        const selected = await page
          .locator(".workspace-tabs [aria-selected=true]")
          .boundingBox();
        assert(selected && selected.width > 0);
      }
    }
    await page.locator("#theme-toggle").click();
    await page.screenshot({ path: "/tmp/dinastia-v14-mobile-light.png" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await nav("Visão geral");
    assert.deepEqual(
      await page.evaluate(() => ({
        today: state.today,
        money: team().money,
        lineup: [...team().lineup],
      })),
      before,
    );
    await page.locator("#save").click();
    await page.reload();
    assert.equal(await page.locator("#nav button").count(), 8);
    assert.equal(await page.evaluate(() => state.profile.name), "Marina Costa");
    assert.deepEqual(errors, []);
    console.log(
      "PASS: oito menus, abas unificadas sem duplicação, atalhos e teclado, imprensa fictícia, emblemas originais, temas, celular e save preservado.",
    );
  } catch (e) {
    if (page)
      await page
        .screenshot({ path: "/tmp/dinastia-v14-navigation-failure.png" })
        .catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
