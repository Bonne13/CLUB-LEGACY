const { chromium } = require("playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 1000 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000",
      target = process.env.LEGACY_STANDALONE
        ? base + "/standalone-test.html"
        : base;
    if (process.env.LEGACY_STANDALONE) {
      const html = fs.readFileSync(
        path.resolve(__dirname, "../../CLUB-LEGACY-jogavel.html"),
        "utf8",
      );
      await p.route("**/*", (r) =>
        r.request().url() === target
          ? r.fulfill({ contentType: "text/html", body: html })
          : r.abort(),
      );
    }
    await p.goto(target);
    await p.locator("#start-coach-name").fill("Carlos Silva");
    await p.locator("#start-calendar").selectOption("classic");
    await p.locator("[data-action=begin]").click();
    assert.equal(await p.locator('#nav [data-page="Dia de jogo"]').count(), 0);
    assert(await p.locator("#match-day").isVisible());
    await require("./navigation-helper.cjs").navigate(p, "Elenco");
    assert.equal(await p.locator("[data-tactic-slot]").count(), 11);
    assert.equal(
      await p.getByRole("button", { name: "Renovar", exact: true }).count(),
      0,
    );
    await p.getByRole("tab", { name: "Jogadores", exact: true }).click();
    assert.equal(await p.locator("[data-tactic-slot]").count(), 0);
    assert.equal(
      await p.getByRole("button", { name: "Renovar", exact: true }).count(),
      await p.evaluate(() => team().players.length),
    );
    await p
      .getByRole("tab", { name: "Jogadores", exact: true })
      .press("ArrowLeft");
    assert.equal(
      await p
        .getByRole("tab", { name: "Escalação", exact: true })
        .getAttribute("aria-selected"),
      "true",
    );
    assert.equal(await p.locator("[data-tactic-slot]").count(), 11);

    await p.locator("#formation").selectOption("4-2-3-1");
    const before = await p.evaluate(() =>
      E.tactics.positions(team()).map((p) => p.id),
    );
    await p
      .locator('[data-tactic-slot="9"]')
      .dragTo(p.locator('[data-tactic-slot="10"]'));
    const after = await p.evaluate(() =>
      E.tactics.positions(team()).map((p) => p.id),
    );
    assert.equal(after[10], before[9]);
    assert.equal(after[9], before[10]);
    assert.equal(new Set(after).size, 11);
    await p.locator('[data-action=select-tactical-slot][data-id="7"]').click();
    await p.locator("#slot-role").selectOption("Armador");
    await p.locator("#slot-duty").selectOption("Atacar");
    await p.locator("[data-instruction=style]").selectOption("Posse de bola");
    await p.locator("[data-instruction=pressing]").selectOption("Alta");
    const eleven = await p.evaluate(() => E.lineup(team()).map((p) => p.id));
    await p.locator("[data-assignment=captain]").selectOption(eleven[2]);
    await p.locator("[data-assignment=viceCaptain]").selectOption(eleven[3]);
    await p.locator("[data-assignment=penalties]").selectOption(eleven[9]);
    await p.locator("[data-assignment=freeKicks]").selectOption(eleven[8]);
    await p.locator("[data-assignment=cornersLeft]").selectOption(eleven[4]);
    await p.locator("[data-assignment=cornersRight]").selectOption(eleven[1]);
    await p.reload();
    await require("./navigation-helper.cjs").navigate(p, "Elenco");
    assert.equal(await p.locator("#formation").inputValue(), "4-2-3-1");
    assert.equal(
      await p.locator("[data-assignment=captain]").inputValue(),
      eleven[2],
    );
    assert.equal(
      await p.locator("[data-instruction=pressing]").inputValue(),
      "Alta",
    );
    await require("./navigation-helper.cjs").navigate(p, "Financeiro");
    const cash = await p.evaluate(() => team().money),
      payroll = await p.evaluate(() => E.finance.payroll(team()));
    await p.locator("#budget-transfer").fill("10000000");
    await p.locator("#budget-wage").fill(String(payroll + 50000));
    assert(
      (await p.locator("#budget-simulation").innerText()).includes(
        "R$ 10.000.000",
      ),
    );
    assert.notEqual(
      await p.locator("#current-transfer").innerText(),
      "R$ 10.000.000",
    );
    await p.locator("#apply-budget").click();
    assert.equal(
      await p.locator("#current-transfer").innerText(),
      "R$ 10.000.000",
    );
    assert.equal(
      await p.evaluate(() => team().finance.wageBudget),
      payroll + 50000,
    );
    assert.equal(await p.evaluate(() => team().money), cash);
    await p.locator("#budget-transfer").fill("999999999999");
    assert(await p.locator("#apply-budget").isDisabled());
    await p.locator("[data-action=reset-budget]").click();
    await p.locator(".budget-slider summary").click();
    await p.locator("#budget-share").fill("50");
    const preview = await p
      .locator("#budget-transfer")
      .evaluate((el) => LegacyMoney.parse(el.value));
    await p.locator("#apply-budget").click();
    assert.equal(
      await p.evaluate(() => team().finance.transferBudget),
      preview,
    );
    assert.equal(await p.evaluate(() => team().money), cash);
    await p.reload();
    assert.equal(
      await p.evaluate(() => team().finance.transferBudget),
      preview,
    );
    await p.locator("#match-day").click();
    await p.locator("#mode").selectOption("2d");
    await p.locator("[data-action=play]").click();
    await p.locator("[data-action=pause]").click();
    assert(
      await p.evaluate(() =>
        state.live.plans.some(
          (p) =>
            p.specialists.penalties?.id ===
              team().tactics.assignments.penalties &&
            p.instructions.formation === "4-2-3-1",
        ),
      ),
    );
    await p.locator("[data-action=instant]").click();
    await p.locator("[data-action=continue]").click();
    assert.equal(await p.evaluate(() => state.today), 1);
    assert(await p.locator("#match-day").isHidden());
    assert.equal(await p.locator('#nav [data-page="Dia de jogo"]').count(), 0);
    await p.reload();
    assert(await p.locator("#match-day").isHidden());
    await p.locator("#simulate-unit").selectOption("weeks");
    await p
      .getByRole("button", { name: "Simular período", exact: true })
      .click();
    await p.waitForFunction(() => !advancing);
    assert(await p.locator("#match-day").isVisible());
    assert.equal(await p.locator('#nav [data-page="Dia de jogo"]').count(), 0);
    await require("./navigation-helper.cjs").navigate(p, "Seleções");
    await p.evaluate(() => {
      const id = "nt-Brazil";
      state.national.invites.push({
        id: "browser-invite",
        selectionId: id,
        name: E.national.definitions.find((d) => d.id === id).name,
        season: state.season,
        offset: state.today,
        expires: state.today + 14,
        required: 35,
        status: "pending",
        reason: "Oferta de federação para testar convocação e persistência.",
      });
      render();
    });
    await p.locator("[data-action=assume-national]").click();
    await require("./navigation-helper.cjs").navigate(p, "Elenco");
    await p.locator("#tactical-scope").selectOption("national");
    await p.locator("#formation").selectOption("3-5-2");
    await p.reload();
    await require("./navigation-helper.cjs").navigate(p, "Elenco");
    await p.locator("#tactical-scope").selectOption("national");
    assert.equal(await p.locator("#formation").inputValue(), "3-5-2");
    await p.locator("#tactical-scope").selectOption("club");
    assert.equal(await p.locator("#formation").inputValue(), "4-2-3-1");
    await p.screenshot({
      path: "/tmp/legacy-tactics-desktop.png",
      fullPage: true,
    });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.getByRole("tab", { name: "Jogadores", exact: true }).click();
    assert.equal(await p.locator("[data-tactic-slot]").count(), 0);
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.getByRole("tab", { name: "Escalação", exact: true }).click();

    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.locator('[data-tactic-slot="4"]').click();
    const id = await p.evaluate(() => E.lineup(team())[1].id);
    await p.locator("#slot-player").selectOption(id);
    assert.equal(await p.evaluate(() => E.tactics.positions(team())[4].id), id);
    await p.screenshot({
      path: "/tmp/legacy-tactics-mobile.png",
      fullPage: true,
    });
    await require("./navigation-helper.cjs").navigate(p, "Financeiro");
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({
      path: "/tmp/legacy-budget-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: menu contextual, orçamento em reais e prévia, drag/drop e escolha móvel, táticas e cobradores, persistência, seleção e clube, desktop/celular.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
