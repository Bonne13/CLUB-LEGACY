const { chromium } = require("playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const path = require("node:path");
const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000";
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let target = base;
    if (process.env.LEGACY_STANDALONE) {
      target = base + "/standalone-test.html";
      const html = fs.readFileSync(
        path.resolve(__dirname, "../../CLUB-LEGACY-jogavel.html"),
        "utf8",
      );
      await page.route("**/*", (r) =>
        r.request().url() === target
          ? r.fulfill({ contentType: "text/html", body: html })
          : r.abort(),
      );
    }
    await page.goto(target);
    assert(await page.locator("#career-entry").isVisible());
    assert(await page.locator("#sidebar").isHidden());
    assert(await page.locator("#game").isHidden());
    assert.equal(await page.locator("#nav button").count(), 0);
    assert.equal(
      await page.getByRole("button", { name: "Salvar carreira" }).count(),
      0,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "dark",
    );
    const initialColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue(
        "--club-primary",
      ),
    );
    await page.screenshot({
      path: "/tmp/legacy-entry-dark.png",
      fullPage: true,
    });
    await page.locator("#start-club").selectOption("br-1");
    assert.notEqual(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue(
          "--club-primary",
        ),
      ),
      initialColor,
    );
    await page
      .getByRole("button", { name: "Ativar modo claro", exact: true })
      .click();
    assert.equal(await page.locator("#start-club").inputValue(), "br-1");
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "light",
    );
    await page.screenshot({
      path: "/tmp/legacy-entry-light.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "/tmp/legacy-entry-mobile.png",
      fullPage: true,
    });
    await page.reload();
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "light",
    );
    await page.locator("#start-club").selectOption("br-1");
    await page.locator("#start-coach-name").fill("Carlos Silva");
    await page
      .getByRole("button", { name: "Começar carreira", exact: false })
      .click();
    assert(await page.locator("#career-entry").isHidden());
    assert(await page.locator("#sidebar").isVisible());
    assert.equal(await page.evaluate(() => state.clubId), "br-1");
    assert(
      (await page.locator("#sidebar-club").innerText()).includes("Palmeiras"),
    );
    await page.getByRole("button", { name: "Jornal", exact: true }).click();
    const allOwn = await page
      .locator("[data-article]")
      .evaluateAll((els) =>
        els.every((e) => e.dataset.clubs.split(" ").includes("br-1")),
      );
    assert(allOwn);
    assert((await page.locator("[data-article]").count()) > 0);
    await page.getByRole("button", { name: "Minha liga", exact: true }).click();
    assert(
      await page
        .locator("[data-article]")
        .evaluateAll((els) =>
          els.some((e) => !e.dataset.clubs.split(" ").includes("br-1")),
        ),
    );
    assert(
      await page
        .locator("[data-article]")
        .evaluateAll((els) =>
          els.every((e) =>
            e.dataset.clubs.split(" ").every((id) => id.startsWith("br-")),
          ),
        ),
    );
    await page
      .getByRole("button", { name: "Meu continente", exact: true })
      .click();
    assert(
      await page
        .locator("[data-article]")
        .evaluateAll((els) => els.some((e) => e.dataset.clubs.includes("ar-"))),
    );
    await page.locator("#news-category").selectOption("market");
    assert(await page.locator(".news-empty").isVisible());
    await page.getByRole("button", { name: "Financeiro", exact: true }).click();
    await page.locator(".budget-slider summary").click();
    await page.locator("#budget-share").fill("50");
    await page
      .getByRole("button", { name: "Aplicar distribuição", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Transferências", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Negociar", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Enviar proposta", exact: true })
      .click();
    await page.getByRole("button", { name: "Jornal", exact: true }).click();
    await page.getByRole("button", { name: "Meu clube", exact: true }).click();
    assert((await page.locator("[data-article]").count()) > 0);
    assert(
      (await page.locator(".news-grid").innerText()).includes("Proposta enviada"),
    );
    await page.locator("#news-category").selectOption("all");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: "/tmp/legacy-paper-light.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Ativar modo escuro", exact: true })
      .click();
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "dark",
    );
    const background = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    assert.equal(background, "rgb(11, 20, 38)");
    await page.screenshot({
      path: "/tmp/legacy-paper-dark.png",
      fullPage: true,
    });
    await page.reload();
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "dark",
    );
    assert.equal(await page.evaluate(() => state.clubId), "br-1");
    await page
      .getByRole("button", { name: "Dia de jogo", exact: true })
      .click();
    await page.locator("#mode").selectOption("2d");
    await page
      .getByRole("button", { name: "Iniciar partida", exact: true })
      .click();
    await page.getByRole("button", { name: "Pausar", exact: true }).click();
    await page
      .getByRole("button", { name: "Ativar modo claro", exact: true })
      .click();
    assert.equal(await page.locator(".dot").count(), 23);
    await page
      .getByRole("button", { name: "Concluir partida", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Continuar carreira", exact: false })
      .click();
    await page.getByRole("button", { name: "Jornal", exact: true }).click();
    await page.locator("#news-category").selectOption("results");
    assert((await page.locator("[data-article]").count()) > 0);
    // Uma proposta entre temporadas permite conferir que a identidade visual acompanha o destino.
    await page.evaluate(() => {
      state.live = null;
      state.day = Legacy.calendar().length;
      state.offers = [{ clubId: "es-0", expires: state.season, years: 2 }];
    });
    await page.getByRole("button", { name: "Carreira", exact: true }).click();
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Aceitar proposta", exact: true })
      .click();
    assert.equal(await page.evaluate(() => document.body.dataset.club), "es-0");
    assert.equal(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue(
          "--club-primary",
        ),
      ),
      "#f5f7fb",
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "light",
    );
    await page.getByRole("button", { name: "Jornal", exact: true }).click();
    await page.locator("#news-category").selectOption("all");
    assert(
      await page
        .locator("[data-article]")
        .evaluateAll((els) =>
          els.every((e) => e.dataset.clubs.split(" ").includes("es-0")),
        ),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "/tmp/legacy-paper-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: " +
        (process.env.LEGACY_STANDALONE
          ? "HTML único sem recursos externos"
          : "interface") +
        " — entrada isolada, seleção, cores por clube, temas e persistência, jornal e filtros, mercado, resultados, mudança de clube e celular.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
