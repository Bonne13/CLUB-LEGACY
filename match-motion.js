"use strict";
(function (root) {
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function frame(m, play, phase = 0) {
    phase = clamp(phase, 0, play.path.length - 1);
    const path = play.path,
      point = path[clamp(phase, 0, path.length - 1)],
      last = phase === path.length - 1,
      initial = play.initialPositions || play.positions || [],
      progress = clamp((phase + 1) / Math.max(1, path.length - 1), 0, 1),
      shot = play.type !== "build-up",
      keeper = m.plans[1 - play.side].starters.find(
        (p, i) => !p.sentOff && i === 0,
      ),
      isSaved =
        play.type === "shot" &&
        (play.outcome === "save" ||
          (m.lastShot?.minute === play.minute && m.lastShot?.saved));
    const positions = initial
      .filter((p) => !m.discipline?.reds.includes(p.id))
      .map((p) => {
        const goalKeeper = p.index === 0,
          attacking = p.side === play.side,
          carrier = p.id === point.playerId;
        let x = p.x,
          y = p.y;
        if (goalKeeper) {
          x = p.side === 0 ? 6 : 94;
          y = clamp(50 + (point.y - 50) * 0.24, 40, 60);
          if (!attacking && last && shot) {
            x = isSaved ? point.x : p.side === 0 ? 4 : 96;
            y = clamp(point.y, 40, 60);
          }
        } else if (p.id === play.playerId && shot) {
          x = p.x + (play.from.x - p.x) * progress;
          y = p.y + (play.from.y - p.y) * progress;
        } else if (attacking) {
          const weight = p.index > 4 ? 0.16 : 0.055;
          x += (point.x - p.x) * weight;
          y += (point.y - p.y) * 0.09;
        } else {
          const near = Math.hypot(p.x - play.from.x, p.y - play.from.y) < 30;
          x += (play.from.x - p.x) * (near ? 0.18 : 0.045);
          y += (play.from.y - p.y) * (near ? 0.2 : 0.08);
        }
        if (carrier) {
          x = point.x;
          y = point.y;
        }
        return {
          ...p,
          keeper: goalKeeper,
          x: clamp(x, 3, 97),
          y: clamp(y, 5, 95),
        };
      });
    return {
      positions,
      ball: { x: point.x, y: point.y },
      side: play.side,
      activeId: point.playerId || play.playerId,
      duration: 650,
      action: {
        type: play.type,
        shooterId: play.playerId,
        keeperId: keeper?.id || null,
        shot: last && shot,
        saved: Boolean(isSaved && last),
        goal: play.type === "goal" && last,
        target: play.target,
        side: play.side,
      },
    };
  }
  const api = { frame };
  root.LegacyMatchMotion = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
