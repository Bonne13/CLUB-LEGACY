"use strict";
(function (root) {
  const POSITION_REVISION = "positions-2026-10-v2";
  const DATA =
    typeof module !== "undefined"
      ? require("./roster-data.js")
      : root.LegacyRosterData;
  const weeklyEuroEstimates = {
    "Kylian Mbappé": 600000,
    "Erling Haaland": 550000,
    "Cristiano Ronaldo": 3800000,
    "Lionel Messi": 400000,
    "Leo Messi": 400000,
    Neymar: 180000,
    "Mohamed Salah": 450000,
    "Giorgian de Arrascaeta": 70000,
    Pedro: 60000,
    "Bruno Henrique": 70000,
    Jorginho: 70000,
    "Memphis Depay": 110000,
    "Raphael Veiga": 50000,
    "Gustavo Gómez": 50000,
    "Robert Lewandowski": 450000,
    "Harry Kane": 450000,
    "Vinicius Junior": 400000,
    "Jude Bellingham": 400000,
  };
  function ageOn(dob, season) {
    const birth = new Date(dob + "T00:00:00Z"),
      today = new Date(Date.UTC(season, 1, 1));
    return (
      today.getUTCFullYear() -
      birth.getUTCFullYear() -
      Number(
        today.getUTCMonth() < birth.getUTCMonth() ||
          (today.getUTCMonth() === birth.getUTCMonth() &&
            today.getUTCDate() < birth.getUTCDate()),
      )
    );
  }
  function make(row, season, leagueId, median = 250000) {
    const [
        sourceId,
        name,
        originalDob,
        pos,
        euroValue,
        valueDate,
        contract,
        nationality,
        historicalSource,
        referenceAge,
        referenceYear,
      ] = row,
      bio =
        DATA.playerBios?.players?.[
          /^\d+$/.test(sourceId) ? "tm-" + sourceId : sourceId
        ],
      positionProfile =
        DATA.playerPositions?.players?.[
          /^\d+$/.test(sourceId) ? "tm-" + sourceId : sourceId
        ],
      dob = originalDob || bio?.birthDate || null,
      citizenship = nationality || bio?.nationalities?.join("  ") || null,
      age = dob ? ageOn(dob, season) : referenceAge + season - referenceYear,
      detail = row[11] || {},
      value =
        euroValue > 0 ? euroValue : Math.max(25000, Math.round(median * 0.35));
    const legacyOverall = Math.min(
      94,
      Math.max(45, Math.round(40 + 10 * Math.log10(value / 1000))),
    );
    const id = /^\d+$/.test(sourceId) ? "tm-" + sourceId : sourceId;
    const reference = DATA.playerRatings?.players?.[id];
    const benchmarks = {
      "tm-68290": 84,
      "tm-248410": 84,
      "tm-432895": 83,
      "tm-80562": 82,
      "tm-77100": 81,
      "ss-1150391": 80,
      "ss-954888": 81,
      "ss-611876": 82,
      "tm-588989": 82,
      "ss-358554": 79,
    };
    const mature = age >= 27 && age <= 34 ? 2 : age < 21 ? -2 : 0;
    const estimate = Math.max(
      50,
      Math.min(85, Math.round(46 + 8 * Math.log10(value / 1000) + mature)),
    );
    const ovr = reference?.overall || benchmarks[id] || estimate;
    const potential =
      reference?.potential ||
      Math.min(90, ovr + (age < 20 ? 9 : age < 23 ? 6 : age < 27 ? 3 : 0));
    const seed = [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
    const stamina =
      reference?.stamina ||
      Math.max(
        50,
        Math.min(
          90,
          Math.round(
            78 -
              Math.max(0, age - 29) * 0.9 +
              (seed % 13) -
              6 +
              (["VOL", "LAT"].includes(pos) ? 3 : 0),
          ),
        ),
      );
    const natural = positionProfile?.natural?.length
      ? positionProfile.natural
      : reference?.positions?.slice(0, 1) || [];
    const secondary = [
      ...new Set([
        ...(positionProfile?.secondary || []),
        ...(reference?.positions || []).filter(
          (code) => !natural.includes(code),
        ),
      ]),
    ];
    const wageFactor = ["en", "es", "it", "de", "fr", "sa"].includes(leagueId)
      ? 1.2
      : leagueId === "br"
        ? 1.7
        : 0.65;
    const annualFraction = age > 30 ? 0.17 : age < 21 ? 0.055 : 0.105;
    const salary = weeklyEuroEstimates[name]
      ? weeklyEuroEstimates[name] * DATA.eurBrl
      : Math.max(
          1500,
          (value * DATA.eurBrl * annualFraction * wageFactor) / 52,
        );
    return {
      id: /^\d+$/.test(sourceId) ? "tm-" + sourceId : sourceId,
      sourceId,
      name,
      birthDate: dob,
      ageEstimated: !dob,
      ageUnknown: !dob && Boolean(detail.ageUnknown),
      birthSource: bio?.source || null,
      positionEstimated: Boolean(detail.positionEstimated),
      naturalPositions: [...natural],
      secondaryPositions: secondary,
      preferredFoot: positionProfile?.foot || bio?.foot || null,
      positionSource: positionProfile?.source || null,
      positionRevision: POSITION_REVISION,
      contractEstimated: Boolean(detail.sourceKey),
      membershipReference: detail.reference || null,
      membershipKind: detail.membership || null,
      nationalities: citizenship ? citizenship.split(/\s{2,}/) : [],
      nationality: citizenship?.split(/\s{2,}/)[0] || null,
      dataSource: historicalSource || "transfermarkt-2025",
      pos,
      age,
      ovr,
      potential: Math.max(ovr, potential),
      stamina,
      ratingBase: ovr,
      legacyRatingBase: legacyOverall,
      ratingRevision: DATA.playerRatings?.revision || "balanced-2026-v1",
      ratingSource: reference
        ? "FC26 · " + reference.reference
        : "Estimativa do jogo",
      ratingEstimated: !reference,
      referenceOverall: reference?.overall || null,
      fitness: 100,
      fatigue: 0,
      trainingPlan: "auto",
      restDays: 0,
      injury: 0,
      price: Math.round(value * DATA.eurBrl),
      salary: Math.round(salary),
      marketSalary: Math.max(Math.round(salary),Math.round(Math.pow(Math.max(0,ovr-50),3)*(["en","es","it","de","fr"].includes(leagueId)?5:leagueId==="br"?4:["us","mx","sa","pt","nl"].includes(leagueId)?2.6:1.2))),
      contract: Math.max(season, Number(contract?.slice(0, 4)) || season + 2),
      real: true,
      referenceValueEuro: historicalSource?.startsWith("sofifa-")
        ? null
        : euroValue || null,
      valueDate,
      priceEstimated:
        Boolean(historicalSource) ||
        !euroValue ||
        !valueDate ||
        valueDate < "2024-01-01",
    };
  }
  function roster(id, season) {
    const rows = DATA.teams[id]?.players || [],
      values = rows
        .map((r) => r[4])
        .filter(Boolean)
        .sort((a, b) => a - b),
      median = values[Math.floor(values.length / 2)] || 250000;
    return rows.map((r) => make(r, season, id.split("-")[0], median));
  }
  const api = { DATA, roster, ageOn, make, POSITION_REVISION };
  root.LegacyRosters = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
