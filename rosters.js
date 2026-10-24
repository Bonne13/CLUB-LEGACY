"use strict";
(function (root) {
  const DATA =
    typeof module !== "undefined"
      ? require("./roster-data.js")
      : root.LegacyRosterData;
  const weeklyEuroEstimates = {
    "Kylian Mbappé": 600000,
    "Erling Haaland": 550000,
    "Cristiano Ronaldo": 3800000,
    "Lionel Messi": 400000,
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
        dob,
        pos,
        euroValue,
        valueDate,
        contract,
        nationality,
        historicalSource,
        referenceAge,
        referenceYear,
      ] = row,
      age = dob ? ageOn(dob, season) : referenceAge + season - referenceYear,
      detail = row[11] || {},
      value =
        euroValue > 0 ? euroValue : Math.max(25000, Math.round(median * 0.35));
    const ovr = Math.min(
      94,
      Math.max(45, Math.round(40 + 10 * Math.log10(value / 1000))),
    );
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
      ageUnknown: Boolean(detail.ageUnknown),
      positionEstimated: Boolean(detail.positionEstimated),
      contractEstimated: Boolean(detail.sourceKey),
      membershipReference: detail.reference || null,
      membershipKind: detail.membership || null,
      nationalities: nationality ? nationality.split(/\s{2,}/) : [],
      nationality: nationality?.split(/\s{2,}/)[0] || null,
      dataSource: historicalSource || "transfermarkt-2025",
      pos,
      age,
      ovr,
      potential: Math.min(97, ovr + (age < 21 ? 10 : age < 25 ? 5 : 1)),
      fitness: 100,
      injury: 0,
      price: Math.round(value * DATA.eurBrl),
      salary: Math.round(salary),
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
  const api = { DATA, roster, ageOn, make };
  root.LegacyRosters = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
