"use strict";
(function (root) {
  const DATA =
    typeof module !== "undefined"
      ? require("./shirt-numbers-data.js")
      : root.LegacyShirtNumbers;
  const catalog = new Map(DATA.clubs.map((c) => [c.id, c]));
  function defaults(players) {
    const used = new Set(),
      result = new Map();
    for (const p of [...players].sort(
      (a, b) =>
        Number(b.pos === "GOL") - Number(a.pos === "GOL") || b.ovr - a.ovr,
    )) {
      const preferred =
        {
          GOL: [1, 12, 22],
          LAT: [2, 6],
          ZAG: [3, 4, 5],
          VOL: [5, 8],
          MEI: [10, 8],
          ATA: [9, 7, 11],
        }[p.pos] || [];
      const n = [
        ...preferred,
        ...Array.from({ length: 99 }, (_, i) => i + 1),
      ].find((n) => !used.has(n));
      if (n) {
        used.add(n);
        result.set(p.id, n);
      }
    }
    return result;
  }
  function reference(t) {
    const c = catalog.get(t.id);
    return c?.name === t.name ? c : null;
  }
  function apply(t, baseline = []) {
    if (t.shirtNumberRevision === DATA.revision) return;
    const players = [...t.players, ...t.youth],
      source = reference(t),
      refs = new Map((source?.players || []).map((p) => [p.id, p])),
      old = defaults(baseline),
      used = new Set();
    // Earlier versions had no provenance: preserve numbers differing from their generated baseline.
    for (const p of players) {
      if (
        p.shirtNumberCustomized ||
        (!p.shirtNumberReference &&
          p.shirtNumber &&
          old.has(p.id) &&
          p.shirtNumber !== old.get(p.id))
      ) {
        p.shirtNumberCustomized = true;
        if (p.shirtNumber) used.add(p.shirtNumber);
      }
    }
    const automatic = players.filter((p) => !p.shirtNumberCustomized),
      previous = new Map(automatic.map((p) => [p.id, p.shirtNumber]));
    for (const p of automatic) delete p.shirtNumber;
    for (const p of automatic) {
      const ref = refs.get(p.id);
      if (ref && !used.has(ref.number)) {
        p.shirtNumber = ref.number;
        used.add(ref.number);
        p.shirtNumberReference = {
          revision: DATA.revision,
          checkedAt: DATA.checkedAt,
          number: ref.number,
          url: source.url,
          season: source.season,
        };
      }
    }
    for (const p of automatic)
      if (
        !p.shirtNumber &&
        previous.get(p.id) &&
        !used.has(previous.get(p.id))
      ) {
        p.shirtNumber = previous.get(p.id);
        used.add(p.shirtNumber);
      }
    t.shirtNumberRevision = DATA.revision;
  }
  function change(t, id, number) {
    const players = [...t.players, ...t.youth],
      player = players.find((p) => p.id === id);
    if (!player || !Number.isInteger(number) || number < 1 || number > 99)
      throw Error("Escolha um número de 1 a 99 para um atleta do clube.");
    const owner = players.find((p) => p.id !== id && p.shirtNumber === number);
    const occupied = new Set(players.map((p) => p.shirtNumber));
    const replacement = owner
      ? Array.from({ length: 99 }, (_, i) => i + 1).find(
          (n) => !occupied.has(n),
        ) || player.shirtNumber
      : null;
    if (owner && (!replacement || replacement === number))
      throw Error("Não há número livre para realocar o outro atleta.");
    return {
      playerId: id,
      playerName: player.name,
      number,
      displacedId: owner?.id || null,
      displacedName: owner?.name || null,
      displacedNumber: replacement,
    };
  }
  const api = { DATA, reference, defaults, apply, change };
  root.LegacySquadNumbers = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
