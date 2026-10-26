"use strict";
(function (root) {
  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
  const seed = (p) =>
    (p.id.charCodeAt(p.id.length - 1) +
      p.id.charCodeAt(Math.max(0, p.id.length - 2))) %
    5;
  function loss(p, minutes = 90, extra = 0) {
    return Math.max(
      0,
      Math.round(
        ((12 +
          (100 - (p.stamina || 70)) * 0.24 +
          Math.max(0, (p.age || 24) - 30) * 0.2 +
          extra * 1.1 +
          seed(p) * 0.5) *
          (p.pos === "GOL" ? 0.32 : 1) *
          minutes) /
          90,
      ),
    );
  }
  function plan(p, globalMode = "Técnica") {
    if (p.restDays > 0 || p.injury) return "rest";
    if (p.trainingPlan && p.trainingPlan !== "auto") return p.trainingPlan;
    if (p.fitness < 78 || (p.fatigue || 0) > 60) return "rest";
    return globalMode === "Recuperação"
      ? "light"
      : globalMode === "Intensivo"
        ? "intense"
        : "normal";
  }
  function preview(p, globalMode = "Técnica", facility = 1) {
    const current = plan(p, globalMode),
      ageCost = Math.max(0, Math.floor(((p.age || 24) - 30) / 4)),
      resistance = ((p.stamina || 70) - 70) / 15,
      staff = (facility - 1) * 0.4;
    const gains = {
      rest: [15, 11],
      light: [10, 7],
      normal: [6, 3],
      intense: [2, -3],
    }[current];
    const energy = Math.max(
      1,
      Math.round(gains[0] + resistance + staff - ageCost + (seed(p) % 3) - 1),
    );
    const fatigueChange =
      -Math.max(1, Math.round(Math.abs(gains[1]) + staff - ageCost * 0.3)) *
      (gains[1] > 0 ? 1 : -1);
    const fatigue = clamp((p.fatigue || 0) + fatigueChange, 0, 100),
      cap = p.injury ? 88 : 100 - Math.floor(fatigue * 0.08);
    return {
      plan: current,
      energy: clamp(p.fitness + energy, 40, cap),
      fatigue,
      energyGain: clamp(p.fitness + energy, 40, cap) - p.fitness,
      fatigueChange: fatigue - (p.fatigue || 0),
    };
  }
  function apply(
    p,
    { minutes = 0, extra = 0, globalMode = "Técnica", facility = 1 } = {},
  ) {
    const before = p.fitness,
      oldFatigue = p.fatigue || 0,
      current = plan(p, globalMode);
    if (minutes) {
      p.fitness = clamp(p.fitness - loss(p, minutes, extra), 40, 100);
      p.fatigue = clamp(
        oldFatigue +
          Math.round(
            ((14 +
              (100 - (p.stamina || 70)) * 0.12 +
              extra +
              Math.max(0, (p.age || 24) - 30) * 0.2) *
              minutes) /
              90,
          ),
        0,
        100,
      );
    } else {
      const next = preview(p, globalMode, facility);
      p.fitness = next.energy;
      p.fatigue = next.fatigue;
    }
    if (p.restDays > 0) p.restDays--;
    return {
      minutes,
      plan: minutes ? "match" : current,
      energyChange: p.fitness - before,
      fatigueChange: p.fatigue - oldFatigue,
    };
  }
  function restEstimate(p, facility = 1) {
    let copy = { ...p, trainingPlan: "auto", restDays: 7, injury: 0 };
    for (let day = 0; day <= 7; day++) {
      if (copy.fitness >= 98 && (copy.fatigue || 0) <= 15) return day;
      apply(copy, { globalMode: "Recuperação", facility });
    }
    return 8;
  }
  const api = { loss, plan, preview, apply, restEstimate };
  root.LegacyPhysical = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
