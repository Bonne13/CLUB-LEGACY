"use strict";
(function (root) {
  const fullFormat = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
  const numberFormat = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  });
  function full(value) {
    return value !== null && value !== "" && Number.isFinite(Number(value))
      ? fullFormat.format(Number(value)).replace(/\u00a0/g, " ")
      : "—";
  }
  function compact(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    const a = Math.abs(n),
      unit =
        a >= 1e9
          ? [1e9, "bi"]
          : a >= 1e6
            ? [1e6, "mi"]
            : a >= 1e4
              ? [1e3, "mil"]
              : null;
    return unit
      ? "R$ " +
          (n / unit[0]).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) +
          " " +
          unit[1]
      : full(n);
  }
  function parse(value) {
    let text = String(value ?? "")
      .trim()
      .replace(/R\$|\s|\u00a0/g, "");
    if (!text) return NaN;
    if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
    return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
  }
  const api = {
    full,
    compact,
    parse,
    number: (value) => numberFormat.format(value),
  };
  root.LegacyMoney = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
