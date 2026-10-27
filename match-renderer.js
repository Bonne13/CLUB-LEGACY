"use strict";
(function (root) {
  function create(element, options = {}) {
    const requested = options.quality || "auto",
      mobile = root.matchMedia?.("(max-width:700px)").matches;
    const quality =
      requested === "auto" ? (mobile ? "low" : "medium") : requested;
    const frameTime =
      quality === "low"
        ? 1000 / 24
        : quality === "high"
          ? 1000 / 45
          : 1000 / 32;
    const T = root.THREE;
    if (!T) throw Error("Visualização 3D indisponível.");
    const renderer = new T.WebGLRenderer({
      antialias: quality !== "low" || requested === "auto",
      alpha: false,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(
      Math.min(
        root.devicePixelRatio || 1,
        quality === "low"
          ? requested === "auto"
            ? 1.25
            : 1
          : quality === "high"
            ? 2
            : 1.5,
      ),
    );
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
    const camera = new T.PerspectiveCamera(42, 1, 0.1, 1200),
      players = new Map(),
      geometries = [],
      materials = [],
      textures = [],
      goalNets = [];
    scene.add(new T.HemisphereLight(0xe9f5ff, 0x314531, 2.4));
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
    const seatCount = quality === "low" ? 240 : 400,
      seatGeometry = geometry(new T.BoxGeometry(0.72, 0.7, 0.8)),
      crowds = [];
    for (const side of [-1, 1]) {
      const seatMaterial = material(0xffffff),
        seats = new T.InstancedMesh(seatGeometry, seatMaterial, seatCount),
        matrix = new T.Matrix4();
      for (let i = 0; i < seatCount; i++) {
        const row = Math.floor(i / 80);
        matrix.makeTranslation(
          -55 + (i % 80) * 1.4,
          2.2 + row * 1.5,
          side * (45 + row * 5),
        );
        seats.setMatrixAt(i, matrix);
        seats.setColorAt(
          i,
          new T.Color(
            i % 3 === 0 ? 0xf3f5ef : i % 3 === 1 ? 0x456c8b : 0x263a54,
          ),
        );
      }
      seats.instanceMatrix.needsUpdate = true;
      scene.add(seats);
      crowds.push(seats);
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
      goalNets.push({ mesh: net, x: side * 54.4 });
      for (const edge of [-3.66, 3.66]) {
        const wall = new T.Mesh(
          geometry(new T.PlaneGeometry(2, 2.5, 5, 5)),
          netMaterial,
        );
        wall.position.set(side * 53.5, 1.25, edge);
        scene.add(wall);
      }
    }
    const head = geometry(
        new T.SphereGeometry(0.32, quality === "high" ? 12 : 8, 8),
      ),
      torso = geometry(new T.CylinderGeometry(0.35, 0.31, 0.82, 10)),
      limb = geometry(new T.BoxGeometry(0.18, 0.61, 0.2));
    const ball = new T.Mesh(
      geometry(new T.IcosahedronGeometry(0.37, 1)),
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
    const markerMaterial = new T.MeshBasicMaterial({
      color: 0xffdf82,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    materials.push(markerMaterial);
    const ballMarker = new T.Mesh(
      geometry(new T.RingGeometry(0.65, 0.9, 20)),
      markerMaterial,
    );
    ballMarker.rotation.x = -Math.PI / 2;
    ballMarker.position.y = 0.16;
    scene.add(ballMarker);
    let disposed = false,
      frame = null,
      previous = 0,
      motionUntil = 0,
      ballMotion = null,
      cameraMode = "broadcast",
      zoom = 1,
      selectedId = null,
      celebrateUntil = 0,
      celebrateSide = 0;
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
    const followTarget = new T.Vector3(),
      followPosition = new T.Vector3();
    function followCamera(immediate = false) {
      const target = new T.Vector3(ball.position.x, 0, ball.position.z);
      followTarget.lerp(target, immediate ? 1 : 0.22);
      const portrait = camera.aspect < 0.9;
      const distance =
        1 / (zoom * Math.sqrt(Math.min(1, Math.max(0.5, camera.aspect))));
      followPosition
        .set(portrait ? 34 : 10, 42, portrait ? 22 : 55)
        .multiplyScalar(distance)
        .add(followTarget);
      camera.position.lerp(followPosition, immediate ? 1 : 0.18);
      camera.lookAt(followTarget);
      camera.updateMatrixWorld();
    }
    function setCamera(mode = "broadcast", scale = zoom) {
      cameraMode = ["broadcast", "tactical", "goal", "follow"].includes(mode)
        ? mode
        : "broadcast";
      zoom = Number.isFinite(scale) ? Math.max(0.75, Math.min(2.25, scale)) : 1;
      if (cameraMode === "follow") followCamera(true);
      else {
        const portrait = camera.aspect < 0.9;
        const direction = new T.Vector3(
          ...(cameraMode === "goal"
            ? [112, 60, 10]
            : cameraMode === "tactical"
              ? portrait
                ? [8, 110, 0]
                : [0, 110, 8]
              : portrait
                ? [105, 100, 8]
                : [10, 85, 112]),
        ).normalize();
        // Fit once at 100%; an explicit zoom must be allowed to move closer.
        let near = 35,
          far = 800;
        for (let pass = 0; pass < 24; pass++) {
          const distance = (near + far) / 2;
          camera.position.copy(direction).multiplyScalar(distance);
          camera.lookAt(0, 0, 0);
          camera.updateMatrixWorld();
          const fits = [
            [-54, -35],
            [-54, 35],
            [54, -35],
            [54, 35],
          ].every(([x, z]) => {
            const point = new T.Vector3(x, 0, z).project(camera);
            return (
              Math.abs(point.x) <= 0.92 &&
              Math.abs(point.y) <= 0.92 &&
              point.z >= -1 &&
              point.z <= 1
            );
          });
          if (fits) far = distance;
          else near = distance;
        }
        camera.position.copy(direction).multiplyScalar(far / zoom);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
      }
      scene.fog.near = camera.position.length() + 40;
      scene.fog.far = camera.position.length() + 240;
      render();
    }
    function setZoom(value) {
      setCamera(cameraMode, value);
      return zoom;
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
      if (now - previous < frameTime) {
        frame = requestAnimationFrame(animate);
        return;
      }
      previous = now;
      for (const player of players.values()) {
        const t = Math.min(1, (now - player.started) / player.duration),
          e = t * t * (3 - 2 * t);
        player.group.position.lerpVectors(player.from, player.to, e);
        player.legs.forEach(
          (leg, i) =>
            (leg.rotation.x =
              now - player.kickAt < 350
                ? (i ? -0.1 : -1) *
                  Math.sin(Math.min(1, (now - player.kickAt) / 350) * Math.PI)
                : player.distance > 0.1 && t < 1
                  ? Math.sin(now * 0.015 + i * Math.PI) * 0.48
                  : 0),
        );
      }
      for (const player of players.values()) {
        const cheering = now < celebrateUntil && player.side === celebrateSide;
        player.group.position.y = cheering
          ? Math.abs(Math.sin(now * 0.008 + player.phase)) * 0.25
          : 0;
        player.arms.forEach(
          (arm, i) =>
            (arm.rotation.z = cheering ? (i ? -2.5 : 2.5) : i ? 0.18 : -0.18),
        );
        const dive = (now - player.diveAt) / 750;
        player.body.rotation.z =
          dive >= 0 && dive < 1
            ? Math.sin(dive * Math.PI) * 1.1 * player.diveDirection
            : 0;
      }
      if (now < celebrateUntil)
        for (const net of goalNets)
          net.mesh.position.x =
            net.x +
            (net.x * (celebrateSide === 0 ? 1 : -1) > 0
              ? Math.sin(now * 0.025) * 0.12
              : 0);
      if (ballMotion) {
        const t = Math.min(1, (now - ballMotion.start) / ballMotion.duration);
        ball.position.lerpVectors(ballMotion.from, ballMotion.to, t);
        ball.position.y = 0.4 + Math.sin(t * Math.PI) * ballMotion.arc;
        ball.rotation.z += 0.16;
        shadow.position.x = ball.position.x;
        shadow.position.z = ball.position.z;
        if (t >= 1) ballMotion = null;
      }
      if (cameraMode === "follow") {
        followCamera(!ballMotion);
        const screen = ball.position.clone().project(camera);
        if (Math.abs(screen.x) > 0.8 || Math.abs(screen.y) > 0.8)
          followCamera(true);
      }
      ballMarker.position.set(ball.position.x, 0.16, ball.position.z);
      render();
      if (now < motionUntil || ballMotion || now < celebrateUntil)
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
      sprite.position.y = 3.0;
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
            body = new T.Group(),
            code = [...p.id].reduce((n, c) => n + c.charCodeAt(0), 0),
            keeper = p.keeper || p.index === 0,
            kit = material(
              keeper ? (p.side ? 0x32be97 : 0xe3a93e) : kits[p.side].primary,
            ),
            secondary = material(kits[p.side].secondary || 0xe9eff4),
            skin = material(
              [0xc29270, 0x965e43, 0x754a36, 0xd9ad89, 0xb67a56][code % 5],
            ),
            dark = material(0x15283c);
          group.add(body);
          const shirt = new T.Mesh(torso, kit);
          shirt.position.y = 1.25;
          body.add(shirt);
          const skull = new T.Mesh(head, skin);
          skull.position.y = 1.98;
          body.add(skull);
          const hair = new T.Mesh(head, dark);
          hair.scale.set(1.02, 0.38, 1.02);
          hair.position.y = 2.2;
          body.add(hair);
          const shorts = new T.Mesh(
            geometry(new T.BoxGeometry(0.61, 0.35, 0.42)),
            keeper ? kit : secondary,
          );
          shorts.position.y = 0.86;
          body.add(shorts);
          const legs = [-0.18, 0.18].map((x) => {
            const leg = new T.Mesh(limb, dark);
            leg.position.set(x, 0.48, 0);
            body.add(leg);
            const sock = new T.Mesh(
              geometry(new T.BoxGeometry(0.2, 0.24, 0.22)),
              secondary,
            );
            sock.position.y = -0.17;
            leg.add(sock);
            const boot = new T.Mesh(
              geometry(new T.BoxGeometry(0.25, 0.13, 0.37)),
              dark,
            );
            boot.position.set(0, -0.29, 0.09);
            leg.add(boot);
            return leg;
          });
          const arms = [-0.45, 0.45].map((x) => {
            const arm = new T.Mesh(limb, kit);
            arm.position.set(x, 1.18, 0);
            arm.rotation.z = x < 0 ? -0.18 : 0.18;
            body.add(arm);
            return arm;
          });
          const contact = new T.Mesh(
            geometry(new T.CircleGeometry(0.66, 12)),
            shadowMaterial,
          );
          contact.rotation.x = -Math.PI / 2;
          contact.position.y = 0.12;
          group.add(contact);
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
          const nameTag = label(p.name, p.shirtNumber || p.index + 1);
          group.add(nameTag);
          scene.add(group);
          player = {
            group,
            body,
            arms,
            nameTag,
            side: p.side,
            phase: code % 10,
            kickAt: -1000,
            diveAt: -1000,
            diveDirection: 1,
            distance: 0,
            duration: 650,
            keeper,
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
        player.keeper = Boolean(p.keeper || p.index === 0);
        player.kit.color.set(
          player.keeper ? (p.side ? 0x32be97 : 0xe3a93e) : kits[p.side].primary,
        );
        player.nameTag.visible = p.id === view.activeId || p.id === selectedId;
        player.ring.visible = p.id === view.activeId || p.id === selectedId;
        player.from.copy(player.group.position);
        player.to.copy(coordinate(p));
        player.to.y = 0;
        player.distance = player.from.distanceTo(player.to);
        player.duration = view.duration || 650;
        player.started = performance.now();
        if (view.action?.shot && view.action.shooterId === p.id)
          player.kickAt = player.started;
        if (view.action?.shot && view.action.keeperId === p.id) {
          player.diveAt = player.started;
          player.diveDirection =
            ((view.action.target?.y || 50) > 50 ? 1 : -1) * (p.side ? -1 : 1);
        }
        player.group.rotation.y = p.side ? -Math.PI / 2 : Math.PI / 2;
      }
      for (const [key, player] of players)
        if (!present.has(key)) {
          scene.remove(player.group);
          players.delete(key);
        }
      if (!ballMotion && point) {
        ball.position.copy(coordinate(point));
        shadow.position.x = ball.position.x;
        shadow.position.z = ball.position.z;
      }
      queue((view.duration || 650) + 100);
    }
    function moveBall(point, duration, shot = false) {
      ballMotion = {
        from: ball.position.clone(),
        to: coordinate(point),
        start: performance.now(),
        duration: Math.max(100, duration),
        arc:
          ball.position.distanceTo(coordinate(point)) < 0.1
            ? 0
            : shot
              ? 2.2
              : 0.16,
      };
      queue(duration + 100);
    }
    function celebrate(side, duration = 1700) {
      celebrateSide = side;
      celebrateUntil = performance.now() + duration;
      queue(duration + 100);
    }
    const raycaster = new T.Raycaster(),
      pointer = new T.Vector2();
    function pick(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster
        .intersectObjects(
          [...players.values()].map((p) => p.group),
          true,
        )
        .find((h) => !h.object.isSprite);
      let found = null;
      if (hit) {
        let item = hit.object;
        while (
          item.parent &&
          ![...players.values()].some((p) => p.group === item)
        )
          item = item.parent;
        found = [...players.entries()].find(([, p]) => p.group === item);
      }
      if (!found) {
        let nearest = event.pointerType === "touch" ? 22 : 12;
        for (const entry of players.entries()) {
          const v = entry[1].group.position.clone();
          v.y += 1.25;
          v.project(camera);
          const distance = Math.hypot(
            (v.x + 1) * 0.5 * rect.width + rect.left - event.clientX,
            (1 - v.y) * 0.5 * rect.height + rect.top - event.clientY,
          );
          if (distance < nearest) {
            nearest = distance;
            found = entry;
          }
        }
      }
      selectedId = found?.[0] || null;
      for (const [id, p] of players) {
        p.nameTag.visible = id === selectedId;
        p.ring.visible = id === selectedId;
      }
      render();
    }
    renderer.domElement.addEventListener("pointerup", pick);
    function dispose() {
      if (disposed) return;
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerup", pick);
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
      celebrate,
      setCamera,
      setZoom,
      dispose,
      get available() {
        return !disposed;
      },
      snapshot() {
        return {
          players: players.size,
          ball: { x: ball.position.x, y: ball.position.y, z: ball.position.z },
          camera: cameraMode,
          zoom,
          cameraDistance: camera.position.distanceTo(
            cameraMode === "follow" ? followTarget : new T.Vector3(),
          ),
          screenBall: (() => {
            const p = ball.position.clone().project(camera);
            return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
          })(),
          quality,
          selectedId,
          screenPlayers: [...players.entries()].map(([id, p]) => {
            const v = p.group.position.clone();
            v.y += 1.25;
            v.project(camera);
            return { id, x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
          }),
          labels: [...players.values()].filter((p) => p.nameTag.visible).length,
          aspect: camera.aspect,
          visiblePitch: [
            [-52.5, -34],
            [-52.5, 34],
            [52.5, -34],
            [52.5, 34],
          ].every(([x, z]) => {
            const p = new T.Vector3(x, 0, z).project(camera);
            return (
              Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && p.z >= -1 && p.z <= 1
            );
          }),
          triangles: renderer.info.render.triangles,
        };
      },
    };
  }
  root.LegacyMatch3D = { create };
})(globalThis);
