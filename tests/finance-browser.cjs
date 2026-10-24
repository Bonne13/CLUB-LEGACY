const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const E = require("../engine.js");
const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000";
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator("#start-league").selectOption("ve");
    assert(
      (await page.locator("#start-club option:disabled").count()) > 0,
    );
    assert(
      (await page.locator("#career-entry").innerText()).includes("incompleto"),
    );
    await page.locator("#start-league").selectOption("br");
    await page.locator("#start-coach-name").fill("Carlos Silva");
    await page.getByRole("button", { name: "Começar carreira" }).click();
    assert(
      await page.evaluate(() =>
        state.teams
          .flatMap((t) => [...t.players, ...t.youth])
          .every((p) => p.real && p.sourceId),
      ),
    );
    await page.getByRole("button", { name: "Financeiro", exact: true }).click();
    const before = await page.evaluate(() => ({
      money: team().money,
      wage: team().finance.wageBudget,
      transfer: team().finance.transferBudget,
    }));
    await page.locator(".budget-slider summary").click();
    await page.locator("#budget-share").fill("25");
    await page
      .getByRole("button", { name: "Aplicar distribuição", exact: true })
      .click();
    const after = await page.evaluate(() => ({
      money: team().money,
      wage: team().finance.wageBudget,
      transfer: team().finance.transferBudget,
    }));
    assert.equal(after.money, before.money);
    assert(after.wage > before.wage);
    assert(after.transfer < before.transfer);
    await page
      .getByRole("button", { name: "Assinar contrato", exact: true })
      .nth(1)
      .click();
    assert(
      await page.evaluate(() =>
        team().finance.sponsors.some((c) => c.slot === "kit"),
      ),
    );
    await page.getByRole("button",{name:"Visão geral",exact:true}).click();
    await page.locator("#simulate-unit").selectOption("weeks");
    await page
      .getByRole("button", { name: "Simular período", exact: true })
      .click();
    assert.equal(await page.evaluate(() => state.today), 0);
    assert.equal(
      await page.locator('#nav [data-page="Dia de jogo"]').count(),
      0,
    );
    async function play() {
      await page
        .getByRole("button", { name: "Dia de jogo", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Iniciar partida", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Concluir partida", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Continuar carreira", exact: false })
        .click();
    }
    await play();
    assert.equal(await page.evaluate(() => state.today), 1);
    assert.equal(
      await page.locator('#nav [data-page="Dia de jogo"]').count(),
      0,
    );
    await page.locator("#simulate-unit").selectOption("days");
    await page
      .getByRole("button", { name: "Simular período", exact: true })
      .click();
    assert.equal(await page.evaluate(() => state.today), 2);
    await page.getByRole("button",{name:"Visão geral",exact:true}).click();
    await page.locator("#simulate-unit").selectOption("weeks");
    await page
      .getByRole("button", { name: "Simular período", exact: true })
      .click();
    assert.equal(await page.evaluate(() => state.today), 7);
    assert.equal(
      await page.locator('#nav [data-page="Dia de jogo"]').count(),
      0,
    );
    assert.equal(
      await page.evaluate(
        () =>
          team().finance.ledger.filter((r) => r.category === "wages").length,
      ),
      1,
    );
    while (await page.evaluate(() => state.today < 30)) {
      if (await page.evaluate(() => !!Legacy.nextFixture(state))) await play();
      else
        await page
          .getByRole("button", { name: "Simular período", exact: true })
          .click();
    }
    await page.getByRole("button", { name: "Financeiro", exact: true }).click();
    await page.locator("#ledger-category").selectOption("wages");
    assert(
      (await page.locator("#content").innerText()).includes(
        "Folha salarial semanal",
      ),
    );
    await page.locator("#ledger-category").selectOption("sponsors");
    assert(
      (await page.locator("#content").innerText()).includes("Parcela mensal"),
    );
    assert(
      await page.evaluate(
        () =>
          team().money ===
          team().finance.openingBalance +
            team().finance.ledger.reduce((n, r) => n + r.amount, 0),
      ),
    );
    const savedToday = await page.evaluate(() => state.today);
    await page.reload();
    assert.equal(await page.evaluate(() => state.today), savedToday);
    assert.equal(
      await page.evaluate(() => state.advancePreference.unit),
      "weeks",
    );
    assert(
      await page.evaluate(() =>
        localStorage.getItem("club-legacy-v2").startsWith("CL3:"),
      ),
    );
    await page.getByRole("button", { name: "Financeiro", exact: true }).click();
    await page.screenshot({ path: "/tmp/legacy-finance.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "/tmp/legacy-finance-mobile.png",
      fullPage: true,
    });
    const prior = E.fresh();
    E.start(prior, "br-0");
    const opening = E.team(prior).money;
    prior.version = 2;
    prior.day = 1;
    delete prior.today;
    for (const t of prior.teams) {
      delete t.finance;
      t.money = 18000000 + (7 - Number(t.id.split("-")[1])) * 500000;
      t.players = [
        {
          id: "fiction-" + t.id,
          name: "Falso Gerado",
          real: false,
          ovr: 65,
          pos: "ATA",
          fitness: 100,
        },
      ];
      t.youth = [];
    }
    prior.teams[0].money += 123456;
    const ctx = await browser.newContext();
    await ctx.addInitScript((s) => {
      if (!localStorage.getItem("migration-seeded")) {
        localStorage.setItem("club-legacy-v2", JSON.stringify(s));
        localStorage.setItem("migration-seeded", "1");
      }
    }, prior);
    const migrated = await ctx.newPage();
    migrated.on("pageerror", (e) => errors.push(e.message));
    await migrated.goto(base);
    assert.equal(await migrated.evaluate(() => state.version), 3);
    assert.equal(await migrated.evaluate(() => state.today), 7);
    assert.equal(await migrated.evaluate(() => team().money), opening + 123456);
    assert(
      await migrated.evaluate(
        () => !!localStorage.getItem("club-legacy-v2-backup"),
      ),
    );
    assert(
      await migrated.evaluate(() =>
        state.teams
          .flatMap((t) => [...t.players, ...t.youth])
          .every((p) => p.real),
      ),
    );
    assert(!(await migrated.evaluate(() => loadError)));
    await migrated.reload();
    assert.equal(await migrated.evaluate(() => state.version), 3);
    await ctx.close();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: financeiro no Chromium — orçamentos, patrocínio, cobranças, extrato, dias/semanas, menu condicionado, persistência comprimida, migração v2 e celular.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
