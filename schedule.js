"use strict";
(function (root) {
  const dayMS = 86400000;
  function anchor(s, season = s.season) {
    return Date.UTC(
      season,
      s.calendarProfile?.region === "eu" ? 6 : s.calendarProfile ? 0 : 1,
      1,
    );
  }
  function at(s, offset = s.today || 0) {
    return new Date(anchor(s) + offset * dayMS);
  }
  function offset(s, iso) {
    const d = Date.parse(iso + "T00:00:00Z");
    return Number.isFinite(d) ? Math.round((d - anchor(s)) / dayMS) : NaN;
  }
  function iso(s, off = s.today || 0) {
    return at(s, off).toISOString().slice(0, 10);
  }
  function configure(s, region) {
    s.calendarProfile = {
      version: 1,
      region: region === "eu" ? "eu" : "calendar",
      preseasonDays: region === "eu" ? 45 : 24,
    };
  }
  const caches = new Map();
  function calendar(profile) {
    const key = profile ? profile.region : "legacy";
    if (caches.has(key)) return caches.get(key);
    const days = [],
      cupAfter = [1, 3, 5, 7, 9, 11, 13, 15, 19, 23, 27, 31, 37];
    for (let r = 0; r < 38; r++) {
      const offset = profile
        ? profile.preseasonDays +
          r * (profile.region === "eu" ? 7 : 8) +
          (profile.region === "eu" && r >= 18 ? 14 : 0)
        : r * 7;
      days.push({ kind: "league", round: r, offset });
      if (cupAfter.includes(r))
        days.push({
          kind: "cup",
          round: cupAfter.indexOf(r),
          offset: offset + 3,
        });
    }
    const result = Object.freeze(days.map(Object.freeze));
    caches.set(key, result);
    return result;
  }
  function label(s, region = s.calendarProfile?.region) {
    return s.calendarProfile && region === "eu"
      ? s.season + "/" + String(s.season + 1).slice(-2)
      : String(s.season);
  }
  const api = { dayMS, anchor, at, offset, iso, configure, calendar, label };
  root.LegacySchedule = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
