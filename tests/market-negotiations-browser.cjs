const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  let debugPage;
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const p = await b.newPage({
        viewport: { width: 1440, height: 1000 },
        ignoreHTTPSErrors: process.env.LEGACY_BROWSER_PROXY_CA === "1",
      }),
      errors = [];
    debugPage = p;
    p.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000";
    const target = process.env.LEGACY_STANDALONE
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
    const nav = async (name) =>
      name === "Começar carreira"
        ? p.locator("[data-action=begin]").click()
        : name === "Continuar carreira"
          ? p.locator("[data-action=continue]").click()
          : p.getByRole("button", { name, exact: true }).click();
    const completeToday = async () => {
      if (!(await p.evaluate(() => !!E.nextFixture(state)))) return;
      await p.locator("#match-day").click();
      if (
        await p
          .getByRole("button", { name: "Iniciar partida", exact: true })
          .count()
      )
        await nav("Iniciar partida");
      if (
        await p
          .getByRole("button", { name: "Concluir partida", exact: true })
          .count()
      )
        await nav("Concluir partida");
      await nav("Continuar carreira");
    };
    const waitResponse = async () => {
      for (let i = 0; i < 8; i++) {
        if (
          !(await p.evaluate(() =>
            ["club-pending", "player-pending", "medical-pending"].includes(
              state.negotiations[0].stage,
            ),
          ))
        )
          break;
        await completeToday();
        await nav("Visão geral");
        if (
          !(await p.evaluate(() =>
            ["club-pending", "player-pending", "medical-pending"].includes(
              state.negotiations[0].stage,
            ),
          ))
        )
          break;
        await p.locator("#simulate-amount").fill("1");
        await p.locator("#simulate-unit").selectOption("weeks");
        await nav("Simular período");
        await p.waitForFunction(() => !advancing);
      }
      await nav("Transferências");
    };
    await p.goto(target);
    await p.locator("#start-coach-name").fill("Maria Teste");
    await p.locator("#start-game-mode").selectOption("test");
    await nav("Começar carreira");
    await nav("Financeiro");
    await p.locator("#test-funds-amount").fill("500000000");
    await nav("Adicionar dinheiro");
    await nav("Transferências");
    await p.locator("#market-query").fill("messi");
    await p.locator("#market-age-min").fill("38");
    await p.locator("#market-age-max").fill("38");
    await p.locator("#market-nationality").selectOption("Argentina");
    await p
      .locator("#search-form")
      .getByRole("button", { name: "Buscar", exact: true })
      .click();
    assert.equal(await p.locator("tbody tr").count(), 1);
    assert((await p.locator("tbody tr").innerText()).includes("Leo Messi"));
    assert.equal(
      (await p.locator("tbody tr td").nth(2).innerText()).trim(),
      "38",
    );
    // Carreira antiga recebe a biografia ao recarregar.
    await p.evaluate(() => {
      const m = state.teams
        .flatMap((t) => t.players)
        .find((p) => p.name === "Leo Messi");
      m.birthDate = null;
      m.age = 22;
      m.ageUnknown = true;
      m.ageEstimated = true;
      persist();
    });
    await p.reload();
    assert.equal(
      await p.evaluate(
        () =>
          state.teams
            .flatMap((t) => t.players)
            .find((p) => p.name === "Leo Messi").age,
      ),
      38,
    );
    await nav("Transferências");
    await p.locator("[data-action=market-clear]").click();
    await p.locator("#market-overall-min").fill("60");
    await p.locator("#market-overall-max").fill("90");
    await p.locator("#market-age-min").fill("18");
    await p.locator("#market-age-max").fill("30");
    await p.locator("#market-nationality").selectOption("Brazil");
    await p.locator("#market-sort").selectOption("value-asc");
    const expected = await p.evaluate(() =>
      E.marketPlayers(state, {
        overallMin: 60,
        overallMax: 90,
        ageMin: 18,
        ageMax: 30,
        nationality: "Brazil",
        sort: "value-asc",
      })
        .slice(0, 20)
        .map((p) => p.name),
    );
    assert(expected.length);
    assert.deepEqual(
      await p.locator("tbody tr td:first-child strong").allTextContents(),
      expected,
    );
    await p.locator("#market-age-min").fill("50");
    await p
      .locator("#search-form")
      .getByRole("button", { name: "Buscar", exact: true })
      .click();
    assert((await p.locator("#notification").innerText()).includes("mínimo"));
    await p.locator("#market-age-min").fill("18");
    await p.locator("[data-action=market-clear]").click();
    await p.locator("#market-sort").selectOption("value-asc");
    const wanted = await p.evaluate(() =>
      E.marketPlayers(state, { sort: "value-asc" }).find((p) =>
        state.teams.some(
          (t) =>
            t.id !== state.clubId &&
            t.players.length > 16 &&
            t.players.some((x) => x.id === p.id),
        ),
      ),
    );
    await p.locator("#market-query").fill(wanted.name);
    await p
      .locator("#search-form")
      .getByRole("button", { name: "Buscar", exact: true })
      .click();
    await p.locator(`[data-action=buy][data-id="${wanted.id}"]`).click();
    assert.equal(await p.locator("#deal [name=salary]").count(), 0);
    await p
      .locator("#deal")
      .getByRole("button", { name: "Enviar proposta", exact: true })
      .click();
    assert.equal(
      await p.evaluate(() => state.negotiations[0].stage),
      "club-pending",
    );
    assert(
      !(await p.evaluate(
        (id) => team().players.some((p) => p.id === id),
        wanted.id,
      )),
    );
    await p.reload();
    assert.equal(
      await p.evaluate(() => state.negotiations[0].stage),
      "club-pending",
    );
    await waitResponse();
    assert.equal(
      await p.evaluate(() => state.negotiations[0].stage),
      "club-counter",
    );
    await p.locator("[data-action=counter-club]").click();
    await p
      .locator("#deal")
      .getByRole("button", { name: "Enviar proposta", exact: true })
      .click();
    await waitResponse();
    assert.equal(
      await p.evaluate(() => state.negotiations[0].stage),
      "contract-ready",
    );
    await p.locator("[data-action=offer-contract]").click();
    await p
      .locator("#deal")
      .getByRole("button", { name: "Enviar proposta", exact: true })
      .click();
    await waitResponse();
    if (
      await p.evaluate(() => state.negotiations[0].stage === "player-counter")
    ) {
      await p.locator("[data-action=offer-contract]").click();
      await p
        .locator("#deal")
        .getByRole("button", { name: "Enviar proposta", exact: true })
        .click();
      await waitResponse();
    }
    if (
      await p.evaluate(() => state.negotiations[0].stage === "medical-pending")
    )
      await waitResponse();
    assert.equal(
      await p.evaluate(() => state.negotiations[0].stage),
      "completed",
    );
    assert(
      await p.evaluate(
        (id) => team().players.some((p) => p.id === id),
        wanted.id,
      ),
    );
    await p.setViewportSize({ width: 390, height: 844 });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({
      path: "/tmp/legacy-negotiation-mobile.png",
      fullPage: true,
    });
    await nav("Salvamentos");
    await p.locator("[data-action=delete-save]").click();
    await p.locator("[data-action=confirm-delete]").click();
    await p.locator("#start-coach-name").fill("Teste Madrid");
    await p.locator("#start-league").selectOption("es");
    await p.locator("#start-club").selectOption("es-0");
    await nav("Começar carreira");
    await nav("Elenco");
    await p.locator('[data-tactic-slot="8"]').click();
    await p.locator("#slot-player").selectOption("tm-371998");
    const right = p.locator('[data-tactic-slot="8"]');
    assert(
      (await right.getAttribute("aria-label")).includes("Fora da posição"),
    );
    assert((await right.innerText()).includes("Fora"));
    const effective = await p.evaluate(
      () =>
        T.adaptation(
          team().players.find((p) => p.id === "tm-371998"),
          T.slots(team())[8],
        ).effective,
    );
    assert((await right.innerText()).includes(String(effective)));
    await p
      .locator(".tactical-board")
      .screenshot({ path: "/tmp/legacy-position-right.png" });
    await p.locator('[data-tactic-slot="10"]').click();
    await p.locator("#slot-player").selectOption("tm-371998");
    assert(
      (await p.locator('[data-tactic-slot="10"]').innerText()).includes(
        "Natural",
      ),
    );
    await p.reload();
    await nav("Elenco");
    assert(
      (await p.locator('[data-tactic-slot="10"]').innerText()).includes(
        "Vinicius",
      ),
    );
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({
      path: "/tmp/legacy-position-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: filtros combinados, nascimento corrigido em save antigo, negociação em etapas com contrapropostas e prazo, assinatura única e Vini fora da posição, desktop/celular.",
    );
  } catch (error) {
    if (debugPage)
      console.log(
        "DIAGNÓSTICO",
        await debugPage.locator("#notification").textContent(),
        await debugPage.locator("#content button").allTextContents(),
        await debugPage.evaluate(() => ({
          today: state.today,
          day: state.day,
          live: state.live && {
            done: state.live.done,
            minute: state.live.minute,
          },
          negotiations: state.negotiations.map((n) => ({
            stage: n.stage,
            message: n.message,
          })),
        })),
      );
    throw error;
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
