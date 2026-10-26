"use strict";
(function (root) {
  function create(element) {
    const T = root.THREE;
    if (!T) throw Error("Visualização 3D indisponível.");
    const renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x14233a);
    renderer.outputColorSpace = T.SRGBColorSpace;
    element.append(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Campo de futebol 3D com jogadores e bola animados",
    );
    renderer.domElement.setAttribute("role", "img");
    const scene = new T.Scene();
    scene.fog = new T.Fog(0x14233a, 120, 240);
    const camera = new T.PerspectiveCamera(42, 1, 0.1, 300),
      players = new Map(),
      geometries = [],
      materials = [],
      textures = [];
    scene.add(new T.HemisphereLight(0xe9f5ff, 0x253624, 2.4));
    const sun = new T.DirectionalLight(0xffffff, 2.1);
    sun.position.set(-35, 70, 20);
    scene.add(sun);
    const material = (color, opts = {}) => {
      const m = new T.MeshStandardMaterial({ color, roughness: 0.85, ...opts });
      materials.push(m);
      return m;
    };
    const geometry = (g) => {
      geometries.push(g);
      return g;
    };
    const box = (w, h, d, color, x, y, z) => {
      const mesh = new T.Mesh(
        geometry(new T.BoxGeometry(w, h, d)),
        material(color),
      );
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    };
    box(124, 0.8, 88, 0x173326, 0, -0.55, 0);
    for (let i = 0; i < 10; i++)
      box(10.5, 0.08, 68, i % 2 ? 0x28744a : 0x246943, -47.25 + i * 10.5, 0, 0);
    for (let i = 0; i < 5; i++) {
      box(120, 2, 6, 0x243b56, 0, 1 + i * 1.5, 45 + i * 5);
      box(120, 2, 6, 0x243b56, 0, 1 + i * 1.5, -45 - i * 5);
      box(6, 2, 78, 0x243b56, 64 + i * 5, 1 + i * 1.5, 0);
      box(6, 2, 78, 0x243b56, -64 - i * 5, 1 + i * 1.5, 0);
    }
    function line(points, color = 0xdceee0) {
      const g = geometry(
        new T.BufferGeometry().setFromPoints(
          points.map((p) => new T.Vector3(p[0], 0.11, p[1])),
        ),
      );
      const m = new T.LineBasicMaterial({ color });
      materials.push(m);
      scene.add(new T.Line(g, m));
    }
    line([
      [-52.5, -34],
      [52.5, -34],
      [52.5, 34],
      [-52.5, 34],
      [-52.5, -34],
    ]);
    line([
      [0, -34],
      [0, 34],
    ]);
    line(
      Array.from({ length: 65 }, (_, i) => [
        Math.cos((i / 64) * Math.PI * 2) * 9.15,
        Math.sin((i / 64) * Math.PI * 2) * 9.15,
      ]),
    );
    for (const side of [-1, 1]) {
      line([
        [side * 52.5, -20.16],
        [side * 36, -20.16],
        [side * 36, 20.16],
        [side * 52.5, 20.16],
      ]);
      line([
        [side * 52.5, -9.16],
        [side * 47, -9.16],
        [side * 47, 9.16],
        [side * 52.5, 9.16],
      ]);
      box(0.18, 2.5, 0.18, 0xffffff, side * 52.5, 1.25, -3.66);
      box(0.18, 2.5, 0.18, 0xffffff, side * 52.5, 1.25, 3.66);
      box(0.18, 0.18, 7.5, 0xffffff, side * 52.5, 2.5, 0);
      const netMaterial = new T.MeshBasicMaterial({
        color: 0xc5d8e7,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
        side: T.DoubleSide,
      });
      materials.push(netMaterial);
      const net = new T.Mesh(
        geometry(new T.PlaneGeometry(7.5, 2.5, 15, 5)),
        netMaterial,
      );
      net.rotation.y = Math.PI / 2;
      net.position.set(side * 54.4, 1.25, 0);
      scene.add(net);
      for (const edge of [-3.66, 3.66]) {
        const wall = new T.Mesh(
          geometry(new T.PlaneGeometry(2, 2.5, 5, 5)),
          netMaterial,
        );
        wall.position.set(side * 53.5, 1.25, edge);
        scene.add(wall);
      }
    }
    const head = geometry(new T.SphereGeometry(0.36, 8, 6)),
      torso = geometry(new T.CylinderGeometry(0.38, 0.32, 0.95, 8)),
      limb = geometry(new T.BoxGeometry(0.19, 0.65, 0.21));
    const ball = new T.Mesh(
      geometry(new T.IcosahedronGeometry(0.32, 1)),
      material(0xffffff),
    );
    scene.add(ball);
    const stripe = new T.Mesh(
      geometry(new T.TorusGeometry(0.322, 0.025, 4, 16)),
      material(0x24324a),
    );
    ball.add(stripe);
    const stripe2 = stripe.clone();
    stripe2.rotation.x = Math.PI / 2;
    ball.add(stripe2);
    const shadowMaterial = new T.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    materials.push(shadowMaterial);
    const shadow = new T.Mesh(
      geometry(new T.CircleGeometry(0.48, 12)),
      shadowMaterial,
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.15;
    scene.add(shadow);
    let disposed = false,
      frame = null,
      previous = 0,
      motionUntil = 0,
      ballMotion = null,
      cameraMode = "broadcast",
      zoom = 1;
    const coordinate = (p) =>
      new T.Vector3(
        p.x >= 98 ? 53.6 : p.x <= 2 ? -53.6 : (p.x - 50) * 1.05,
        0.4,
        (p.y - 50) * 0.68,
      );
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    function resize() {
      if (disposed) return;
      const w = Math.max(1, element.clientWidth),
        h = Math.max(230, element.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      setCamera(cameraMode, zoom);
    }
    function setCamera(mode = "broadcast", scale = 1) {
      cameraMode = mode;
      zoom = scale;
      const narrow = element.clientWidth < 500,
        extra = narrow ? 1.35 : 1;
      const p =
        mode === "goal"
          ? [112, 60, 10]
          : mode === "tactical"
            ? [0, 105, 5]
            : [10, 85, 112];
      camera.position.set(...p.map((n) => (n * extra) / scale));
      camera.lookAt(0, 0, 0);
      render();
    }
    function render() {
      if (!disposed) renderer.render(scene, camera);
    }
    function queue(duration = 700) {
      motionUntil = Math.max(motionUntil, performance.now() + duration);
      if (frame === null) frame = requestAnimationFrame(animate);
    }
    function animate(now) {
      frame = null;
      if (disposed) return;
      if (!element.isConnected) {
        dispose();
        return;
      }
      if (now - previous < 28) {
        frame = requestAnimationFrame(animate);
        return;
      }
      previous = now;
      for (const player of players.values()) {
        const t = Math.min(1, (now - player.started) / 650),
          e = t * t * (3 - 2 * t);
        player.group.position.lerpVectors(player.from, player.to, e);
        player.legs.forEach(
          (leg, i) =>
            (leg.rotation.x =
              t < 1 ? Math.sin(now * 0.015 + i * Math.PI) * 0.5 : 0),
        );
      }
      if (ballMotion) {
        const t = Math.min(1, (now - ballMotion.start) / ballMotion.duration);
        ball.position.lerpVectors(ballMotion.from, ballMotion.to, t);
        ball.position.y = 0.4 + Math.sin(t * Math.PI) * ballMotion.arc;
        ball.rotation.z += 0.16;
        shadow.position.x = ball.position.x;
        shadow.position.z = ball.position.z;
        if (t >= 1) ballMotion = null;
      }
      render();
      if (now < motionUntil || ballMotion)
        frame = requestAnimationFrame(animate);
    }
    function label(name, number) {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 64;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "rgba(8,20,37,.8)";
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 23px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(number + " · " + name.split(" ").slice(-1)[0], 128, 41, 245);
      const texture = new T.CanvasTexture(c);
      textures.push(texture);
      const mat = new T.SpriteMaterial({ map: texture, depthTest: false });
      materials.push(mat);
      const sprite = new T.Sprite(mat);
      sprite.position.y = 3.1;
      sprite.scale.set(7, 1.75, 1);
      return sprite;
    }
    function update(view, kits, point) {
      const present = new Set();
      for (const p of view.positions) {
        const key = p.id || p.side + ":" + p.index;
        present.add(key);
        let player = players.get(key);
        if (!player) {
          const group = new T.Group(),
            kit = material(kits[p.side].primary),
            skin = material(0xb88562),
            dark = material(0x15283c);
          const shirt = new T.Mesh(torso, kit);
          shirt.position.y = 1.3;
          group.add(shirt);
          const skull = new T.Mesh(head, skin);
          skull.position.y = 2.1;
          group.add(skull);
          const legs = [-0.19, 0.19].map((x) => {
            const leg = new T.Mesh(limb, dark);
            leg.position.set(x, 0.55, 0);
            group.add(leg);
            return leg;
          });
          for (const x of [-0.5, 0.5]) {
            const arm = new T.Mesh(limb, kit);
            arm.position.set(x, 1.3, 0);
            arm.rotation.z = x < 0 ? -0.18 : 0.18;
            group.add(arm);
          }
          const ringGeometry = geometry(new T.RingGeometry(0.65, 0.8, 16)),
            ringMaterial = new T.MeshBasicMaterial({
              color: 0xffd263,
              side: T.DoubleSide,
            });
          materials.push(ringMaterial);
          const ring = new T.Mesh(ringGeometry, ringMaterial);
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.16;
          group.add(ring);
          group.add(label(p.name, p.shirtNumber || p.index + 1));
          scene.add(group);
          player = {
            group,
            legs,
            kit,
            ring,
            from: new T.Vector3(),
            to: new T.Vector3(),
            started: performance.now(),
          };
          players.set(key, player);
          const pos = coordinate(p);
          pos.y = 0;
          group.position.copy(pos);
        }
        player.kit.color.set(kits[p.side].primary);
        player.ring.visible = p.id === view.activeId;
        player.from.copy(player.group.position);
        player.to.copy(coordinate(p));
        player.to.y = 0;
        player.started = performance.now();
        player.group.rotation.y = p.side ? -Math.PI / 2 : Math.PI / 2;
      }
      for (const [key, player] of players)
        if (!present.has(key)) {
          scene.remove(player.group);
          players.delete(key);
        }
      if (!ballMotion) {
        ball.position.copy(coordinate(point || view.ball));
        shadow.position.x = ball.position.x;
        shadow.position.z = ball.position.z;
      }
      queue();
    }
    function moveBall(point, duration, shot = false) {
      ballMotion = {
        from: ball.position.clone(),
        to: coordinate(point),
        start: performance.now(),
        duration: Math.max(100, duration),
        arc: shot ? 2.7 : 0.25,
      };
      queue(duration + 100);
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
    resize();
    return {
      element,
      update,
      moveBall,
      setCamera,
      dispose,
      get available() {
        return !disposed;
      },
      snapshot() {
        return {
          players: players.size,
          ball: { x: ball.position.x, y: ball.position.y, z: ball.position.z },
          camera: cameraMode,
          triangles: renderer.info.render.triangles,
        };
      },
    };
  }
  root.LegacyMatch3D = { create };
})(globalThis);
