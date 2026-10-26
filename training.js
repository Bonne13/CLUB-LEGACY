"use strict";
(function (root) {
  const focuses = {
    balanced: "Desenvolvimento geral",
    technical: "Passe e criação",
    finishing: "Finalização",
    defending: "Marcação e defesa",
    setpieces: "Bolas paradas",
    physical: "Resistência",
    leadership: "Liderança",
  };
  const sessions = {
    auto: "Automático",
    technical: "Técnica",
    tactical: "Organização tática",
    physical: "Condicionamento",
    setpieces: "Bolas paradas",
    recovery: "Recuperação",
    rest: "Folga",
  };
  const own = (s) => s.teams.find((t) => t.id === s.clubId);
  function ensure(s) {
    s.trainingSchedule ??= Array(7).fill("auto");
    s.trainingHistory ??= [];
    return s.trainingSchedule;
  }
  function weekday(s) {
    return (new Date(Date.UTC(s.season, 1, 1 + s.today)).getUTCDay() + 6) % 7;
  }
  function session(s, daysToMatch = null) {
    const choice = ensure(s)[weekday(s)];
    if (daysToMatch === 0)
      return {
        key: "match",
        label: "Dia de jogo",
        mode: "Recuperação",
        focus: "balanced",
      };
    if (choice === "auto" && daysToMatch === 1)
      return {
        key: "recovery",
        label: "Ativação pré-jogo",
        mode: "Recuperação",
        focus: "balanced",
      };
    const key = choice === "auto" ? "technical" : choice;
    return {
      key,
      label: sessions[key],
      mode:
        key === "recovery" || key === "rest"
          ? "Recuperação"
          : key === "physical"
            ? "Intensivo"
            : s.training,
      focus:
        key === "setpieces"
          ? "setpieces"
          : key === "physical"
            ? "physical"
            : "balanced",
    };
  }
  function allowed(s) {
    if (!s.clubId) throw Error("Comece uma carreira primeiro.");
    if (s.live && !s.live.done)
      throw Error("Conclua a partida antes de alterar o treinamento.");
  }
  function setDay(s, day, key) {
    allowed(s);
    if (
      !Number.isInteger(day) ||
      day < 0 ||
      day > 6 ||
      !Object.hasOwn(sessions, key)
    )
      throw Error("Sessão inválida.");
    ensure(s)[day] = key;
  }
  function setFocus(s, id, key) {
    allowed(s);
    if (!Object.hasOwn(focuses, key)) throw Error("Foco inválido.");
    const t = own(s),
      p = [...t.players, ...t.youth].find((p) => p.id === id);
    if (!p) throw Error("Jogador não pertence ao clube.");
    p.trainingFocus = key;
  }
  function process(s, t, p, physical, session) {
    if (
      t.id !== s.clubId ||
      physical.minutes ||
      physical.plan === "rest" ||
      p.injury ||
      ["rest", "recovery", "match"].includes(session.key)
    )
      return null;
    const focus =
      p.trainingFocus && p.trainingFocus !== "balanced"
        ? p.trainingFocus
        : session.focus;
    p.trainingXP ??= {};
    p.trainingBonuses ??= {};
    const increment = Math.max(
      1,
      Math.round(
        (p.age < 24 ? 9 : 5) *
          (physical.plan === "intense"
            ? 1.25
            : physical.plan === "light"
              ? 0.6
              : 1) *
          (1 + (t.facility - 1) * 0.12) *
          (1 - (p.fatigue || 0) * 0.004),
      ),
    );
    p.trainingXP[focus] = (p.trainingXP[focus] || 0) + increment;
    let improved = false;
    if (p.trainingXP[focus] >= 100) {
      p.trainingXP[focus] -= 100;
      if (focus === "physical") {
        const before = p.stamina || 70;
        p.stamina = Math.max(before, Math.min(99, before + 1));
        improved = p.stamina > before;
      } else {
        const before = p.trainingBonuses[focus] || 0;
        p.trainingBonuses[focus] = Math.min(
          8,
          (p.trainingBonuses[focus] || 0) + 1,
        );
        improved = p.trainingBonuses[focus] > before;
      }
    }
    return { focus, increment, improved };
  }
  function record(s, session, trained, improved) {
    ensure(s);
    s.trainingHistory.unshift({
      season: s.season,
      offset: s.today,
      key: session.key,
      label: session.label,
      trained,
      improved,
    });
    s.trainingHistory = s.trainingHistory.slice(0, 21);
  }
  const api = {
    focuses,
    sessions,
    ensure,
    weekday,
    session,
    setDay,
    setFocus,
    process,
    record,
  };
  root.LegacyTraining = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
