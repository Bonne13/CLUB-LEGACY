const { chromium } = require("playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
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
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.CLUB_LEGACY_URL || "http://127.0.0.1:3000",
      url = process.env.LEGACY_STANDALONE ? base + "/single.html" : base;
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
    const nav = async (name) =>
      page.getByRole("button", { name, exact: true }).click();
    const idle = () => page.waitForFunction(() => !advancing);
    const advance = async (amount = 1, unit = "days") => {
      await nav("Visão geral");
      await page.locator("#simulate-amount").fill(String(amount));
      await page.locator("#simulate-unit").selectOption(unit);
      await nav("Simular período");
      await idle();
    };
    await page.goto(url);
    await page.locator("#start-coach-name").fill("Camila Santos");
    await page.locator("#start-game-mode").selectOption("test");
    await page.locator("[data-action=begin]").click();
    await page.waitForFunction(
      () => document.querySelector("#save-status").textContent === "Salvo",
    );
    assert(await page.evaluate(() => autosaver.background));
    await page.evaluate(() => {
      window.mainCompressions = 0;
      const original = LZString.compressToUTF16;
      LZString.compressToUTF16 = function (...args) {
        window.mainCompressions++;
        return original.apply(this, args);
      };
    });
    await nav("Elenco");
    const durations = await page.evaluate(() => {
      const times = [];
      for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        const start = performance.now();
        document.querySelector(`[data-tactic-slot="${i}"]`).click();
        times.push(performance.now() - start);
      }
      return times;
    });
    assert(Math.max(...durations) < 500);
    assert.equal(await page.evaluate(() => window.mainCompressions), 0);
    await nav("Financeiro");
    await page.locator("#test-funds-amount").fill("500000000");
    await nav("Adicionar dinheiro");
    await page.locator("#match-day").click();
    await page
      .locator("#speed")
      .count()
      .then(async (n) => {
        if (n) await page.locator("#speed").selectOption("400");
      });
    await page.evaluate(() => {
      const original = E.minute;
      let once = true;
      E.minute = function (s, m, rng) {
        if (once) {
          once = false;
          E.minute = original;
          let values = [0, 0, 0.5, 0, 0];
          return original(s, m, () => values.shift() ?? 0);
        }
        return original(s, m, rng);
      };
    });
    await page.locator("[data-action=play]").click();
    await page.locator("#speed").selectOption("400");
    await page.waitForFunction(() => state.live.minute === 1 && animatingPlay);
    assert.deepEqual(await page.evaluate(() => state.live.goals), [1, 0]);
    assert((await page.locator(".score").innerText()).includes("0 × 0"));
    await page.waitForFunction(
      () =>
        document
          .querySelector("#event-announcement")
          ?.classList.contains("visible"),
      { timeout: 15000 },
    );
    const play = await page.evaluate(() => state.live.lastPlay);
    assert.equal(play.type, "goal");
    assert(
      (await page.locator("#event-announcement").innerText()).includes(
        play.playerName,
      ),
    );
    assert.equal(
      await page.locator("#ball").evaluate((el) => parseFloat(el.style.left)),
      play.target.x,
    );
    assert((await page.locator(".score").innerText()).includes("1 × 0"));
    await page.screenshot({ path: "/tmp/v07-goal-desktop.png" });
    await page.locator("[data-action=pause]").click();
    await page.waitForFunction(() => !animatingPlay);
    await page.evaluate(() => {
      state.live.minute = 44;
    });
    await page.locator("[data-action=pause]").click();
    await page.locator("[data-action=second-half]").waitFor({ timeout: 15000 });
    assert(await page.evaluate(() => paused && state.live.minute === 45));
    const out = await page
      .locator("#substitution-form [name=out] option")
      .nth(7)
      .getAttribute("value");
    await page.locator("#substitution-form [name=out]").selectOption(out);
    await page.locator("#substitution-form button").click();
    assert.equal(await page.evaluate(() => state.live.substitutions.length), 1);
    await page.locator("[data-action=second-half]").click();
    await page.locator("[data-action=pause]").click();
    assert(await page.evaluate(() => state.live.secondHalfStarted));
    await page.locator("[data-action=instant]").click();
    await page.locator("[data-action=continue]").click();
    const recoveryId = await page.evaluate(() => {
      const p = team().players.find((p) => p.pos !== "GOL");
      p.fitness = 62;
      p.fatigue = 70;
      return p.id;
    });
    await nav("Treinamento");
    await page
      .locator(`[data-recovery-player="${recoveryId}"]`)
      .selectOption("rest3");
    assert.equal(
      await page.evaluate(
        (id) => team().players.find((p) => p.id === id).restDays,
        recoveryId,
      ),
      3,
    );
    await page.screenshot({ path: "/tmp/v07-recovery-desktop.png" });
    await nav("Olheiros");
    await page.locator("#scouting-form [name=maxFee]").fill("20000000");
    await page.locator("#scouting-form button").click();
    await nav("Base e jovens");
    await page.locator("#scouting-form button").click();
    await nav("Calendário");
    const before = await page.evaluate(() => state.today);
    await page.locator('[data-action=calendar-select][data-id="7"]').click();
    assert.equal(await page.evaluate(() => state.today), before);
    assert(
      (await page.locator(".calendar-details").innerText()).includes(
        "Brasileirão",
      ),
    );
    await nav("Agenda");
    assert((await page.locator(".fixture-card").count()) > 0);
    await nav("Mês");
    await page.screenshot({ path: "/tmp/v07-calendar-final.png" });
    await advance(1, "weeks");
    assert.equal(await page.evaluate(() => state.scouting.reports.length), 1);
    assert.equal(
      await page.evaluate(() => state.scouting.reports[0].scope),
      "market",
    );
    const condition = await page.evaluate((id) => {
      const p = team().players.find((p) => p.id === id);
      return { fitness: p.fitness, fatigue: p.fatigue, rest: p.restDays };
    }, recoveryId);
    assert(
      condition.fitness > 62 && condition.fatigue < 70 && condition.rest === 0,
    );
    await advance(1, "weeks");
    assert.equal(await page.evaluate(() => state.scouting.reports.length), 2);
    await nav("Olheiros");
    await nav("Mercado");
    assert((await page.locator(".scout-player").count()) > 0);
    await page.locator(".scout-player [data-action=buy]").first().click();
    assert(
      (await page.locator(".offer-advice").innerText()).includes(
        "Abertura prudente",
      ),
    );
    assert(
      (await page.locator("#offer-estimate").innerText()).includes(
        "Saída na assinatura",
      ),
    );
    await page.locator("#deal [name=fee]").fill("1");
    assert(
      (await page.locator("#offer-risk").innerText())
        .toLowerCase()
        .includes("muito baixa"),
    );
    await page.locator("[data-offer-preset=recommended]").click();
    assert(
      /\d\.\d{3}/.test(await page.locator("#deal [name=fee]").inputValue()),
    );
    await page.screenshot({ path: "/tmp/v07-offer-final.png" });
    await page.locator("[data-action=close-dialog]").click();
    await nav("Seleções");
    assert.equal(await page.locator("#national-choice").count(), 0);
    assert.equal(
      await page.locator("[data-action=assume-national]").count(),
      0,
    );
    await page.evaluate(() => {
      state.reputation = 90;
      const r = E.league(state, team().leagueId).table.find(
        (r) => r.id === state.clubId,
      );
      r.w = 8;
      r.p = 24;
      state.today = 55;
      state.day = E.calendar().findIndex((d) => d.offset >= 55);
      state.national.nextReview = 56;
    });
    await advance(1);
    await nav("Seleções");
    assert((await page.locator(".national-invite").count()) > 0);
    await page.locator("[data-action=assume-national]").first().click();
    assert(await page.evaluate(() => !!state.national.job));
    await page.evaluate(() => {
      state.trophies.push({
        id: "ui-title",
        clubId: state.clubId,
        competitionId: team().leagueId,
        name: "Título de teste visual",
        kind: "league",
        season: state.season,
        offset: state.today,
        coachId: "you",
        celebrated: false,
      });
      render();
    });
    assert(await page.locator("#trophy-dialog").isVisible());
    assert.equal(await page.locator("#trophy-dialog .confetti").count(), 24);
    await page.screenshot({ path: "/tmp/v07-trophy.png" });
    await page.locator("[data-action=close-celebration]").click();
    await nav("Troféus");
    assert(
      (await page.locator(".trophy-grid").innerText()).includes(
        "Título de teste visual",
      ),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await nav("Calendário");
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "/tmp/v07-calendar-mobile.png",
      fullPage: true,
    });
    await nav("Treinamento");
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await nav("Transferências");
    await page.locator("[data-action=buy]").first().click();
    assert(
      await page.evaluate(
        () =>
          document.querySelector("#deal").getBoundingClientRect().width <=
          innerWidth,
      ),
    );
    await page.screenshot({
      path: "/tmp/v07-offer-mobile.png",
      fullPage: true,
    });
    await page.locator("[data-action=close-dialog]").click();
    await nav("Elenco");
    await page
      .getByRole("tab", { name: "Jogadores e contratos", exact: true })
      .click();
    const shirtPlayer = await page
      .locator("[data-action=edit-shirt]")
      .first()
      .getAttribute("data-id");
    await page
      .locator(`[data-action=edit-shirt][data-id="${shirtPlayer}"]`)
      .click();
    await page.locator("#deal [name=shirt]").fill("99");
    await page
      .getByRole("button", { name: "Confirmar número", exact: true })
      .click();
    assert.equal(
      await page.evaluate(
        (id) => team().players.find((p) => p.id === id).shirtNumber,
        shirtPlayer,
      ),
      99,
    );
    await page.locator(`[data-action=renew][data-id="${shirtPlayer}"]`).click();
    assert.equal(await page.locator("#deal [name=role] option").count(), 5);
    await page.locator("#deal [name=role]").selectOption("key");
    const oldSalary = await page.evaluate(
      (id) => team().players.find((p) => p.id === id).salary,
      shirtPlayer,
    );
    await page.locator("#deal .primary").click();
    assert.equal(
      await page.evaluate(() => state.negotiations[0].kind),
      "renewal",
    );
    assert.equal(
      await page.evaluate(() => state.negotiations[0].stage),
      "player-pending",
    );
    assert.equal(
      await page.evaluate(
        (id) => team().players.find((p) => p.id === id).salary,
        shirtPlayer,
      ),
      oldSalary,
    );
    await nav("Transferências");
    await page.locator("[data-action=cancel-negotiation]").first().click();
    await page.locator("#save").click();
    await page.reload();
    assert(await page.evaluate(() => !!state.national.job));
    assert.equal(
      await page.evaluate(
        () => state.trophies.filter((t) => t.id === "ui-title").length,
      ),
      1,
    );
    assert(await page.locator("#trophy-dialog").isHidden());
    assert.deepEqual(errors, []);
    console.log(
      `PASS: worker e cliques (máximo ${Math.round(Math.max(...durations))} ms), gols com origem/autor/animação, intervalo e substituição, recuperação individual, olheiros, agenda mensal, propostas orientadas, convites por mérito e troféus; desktop/celular.`,
    );
  } catch (e) {
    if (page)
      console.log(
        "DIAGNÓSTICO",
        await page.locator("#notification").textContent(),
        await page.locator("#title").textContent(),
      );
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
