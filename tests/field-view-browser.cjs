const { chromium } = require("playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 800 },
    });
    const entries = require("../data/badges.json").entries.filter(
      (e) => e.name,
    );
    const failed = [];
    for (const e of entries) {
      const result = await page.evaluate(
        async (svg) => {
          document.body.innerHTML = svg;
          const text = document.querySelector("text"),
            outline = document.querySelector("clipPath path"),
            r = text.getBBox();
          // Check the complete typographic box, with a margin for the outline stroke.
          let fits = true;
          for (let x = r.x - 2; x <= r.x + r.width + 2; x += 0.5)
            for (const y of [r.y - 2, r.y + r.height + 2])
              if (!outline.isPointInFill(new DOMPoint(x, y))) fits = false;
          const image = new Image();
          image.src =
            "data:image/svg+xml;base64," +
            btoa(unescape(encodeURIComponent(svg)));
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 96;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0);
          return {
            fits,
            transparent: [
              [0, 0],
              [95, 0],
              [0, 95],
              [95, 95],
            ].every(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3] === 0),
          };
        },
        fs.readFileSync(
          path.resolve(__dirname, "../assets/badges", e.file),
          "utf8",
        ),
      );
      if (!result.fits || !result.transparent)
        failed.push({ name: e.name, ...result });
    }
    assert.deepEqual(
      failed,
      [],
      "All club lettering must fit inside its crest with a transparent background",
    );
    await page.setContent(
      '<div id="stage" style="width:1100px;height:600px"></div>',
    );
    await page.addScriptTag({
      path: path.resolve(__dirname, "../vendor/three.min.js"),
    });
    await page.addScriptTag({
      path: path.resolve(__dirname, "../match-renderer.js"),
    });
    await page.evaluate(() => {
      window.scene = LegacyMatch3D.create(document.querySelector("#stage"));
      scene.update(
        {
          positions: Array.from({ length: 22 }, (_, i) => ({
            id: "p" + i,
            index: i % 11,
            side: i < 11 ? 0 : 1,
            name: "Atleta " + i,
            x: 10 + (i % 11) * 8,
            y: 20 + Math.floor(i / 11) * 60,
          })),
        },
        [
          { primary: "#134db1", secondary: "#ffffff" },
          { primary: "#c42a3b", secondary: "#171717" },
        ],
        { x: 50, y: 50 },
      );
    });
    const initial = await page.evaluate(() => scene.snapshot());
    assert(initial.visiblePitch);
    assert.equal(initial.players, 22);
    const close = await page.evaluate(() => {
      scene.setZoom(1.75);
      return scene.snapshot();
    });
    assert(close.cameraDistance < initial.cameraDistance * 0.6);
    await page.evaluate(() => {
      document.querySelector("#stage").style.cssText =
        "width:360px;height:570px";
    });
    await page.waitForFunction(() => scene.snapshot().aspect < 0.7);
    assert.equal(await page.evaluate(() => scene.snapshot().zoom), 1.75);
    await page.evaluate(() => scene.setZoom(1));
    assert(await page.evaluate(() => scene.snapshot().visiblePitch));
    for (const mode of ["broadcast", "tactical", "goal"]) {
      await page.evaluate((mode) => scene.setCamera(mode), mode);
      assert(
        await page.evaluate(() => scene.snapshot().visiblePitch),
        mode + " portrait framing",
      );
    }
    await page.evaluate(() => {
      scene.setCamera("follow", 1.25);
      scene.moveBall({ x: 99, y: 50 }, 400, true);
    });
    await page.waitForTimeout(1100);
    const follow = await page.evaluate(() => scene.snapshot());
    assert(
      follow.screenBall.x > 0.1 &&
        follow.screenBall.x < 0.9 &&
        follow.screenBall.y > 0.1 &&
        follow.screenBall.y < 0.9,
      "follow camera must keep the finishing ball in view",
    );
    assert.equal(follow.players, 22);
    await page.screenshot({ path: "/tmp/dinastia-v16-follow-camera.png" });
    await page.evaluate(() => scene.dispose());
    console.log(
      "415 crests: lettering inside outline, transparent corners. 3D: real zoom, portrait fit, resize persistence and ball tracking passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
