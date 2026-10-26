"use strict";
(function (root) {
  const palettes = {
    rb: ["#c6283d", "#111827"],
    rw: ["#c5233c", "#f5f7fb"],
    bw: ["#1764b5", "#f5f7fb"],
    kw: ["#171923", "#f5f7fb"],
    gw: ["#16804b", "#f5f7fb"],
    yb: ["#f5c63d", "#171923"],
    by: ["#174e9b", "#f7cf44"],
    nr: ["#172f64", "#e33f4f"],
    sw: ["#68bce4", "#f5f7fb"],
    pw: ["#6c3f9f", "#f5f7fb"],
    ob: ["#e47c25", "#131d31"],
    wg: ["#f5f7fb", "#1f8b62"],
    wr: ["#f5f7fb", "#bf2340"],
    wb: ["#f5f7fb", "#215eb9"],
    wk: ["#f5f7fb", "#1a2132"],
    rg: ["#bb293b", "#198354"],
    yr: ["#f5c63d", "#bd2c38"],
    ny: ["#122f65", "#ffd34d"],
    gb: ["#17744b", "#182333"],
    ry: ["#b92836", "#f5c83e"],
    bg: ["#1360b5", "#2da46a"],
    pk: ["#f19fc1", "#1a2030"],
    br: ["#1e56a5", "#d03046"],
  };
  // Cores por identidade estável do clube, na ordem de world.js.
  const rows = {
    br: "rb gw bw gw rg kw br rw sw wk kw wk kw kw rb rw wk rb gw rb",
    ar: "wr by sw rw nr rw wb by rb bw sw rw wk rw gw bw rw br wb gw sw wk rw bw wk rw kw gw wr yb",
    en: "rw sw rw bw rw wk kw br bw rw br rb rw wk nr bw yb wk br rw",
    es: "wk br rw rw yb gw sw wr br rb bw wk bw bw bw rw rw br gw bw",
    it: "bw sw rb kw bw ry sw pw br bw ry kw br by br ry by gb bw rw",
    de: "rw rb yb rb rw rw rw rw gw kw gw rw rw kw bw br wk rw",
    fr: "nr sw rw rb rw rb bw yr rw rb bw pw yb kw nr ob bw ry",
    pt: "gw rw bw rw wk rw bw yb wk gw gw by rw wk rw rb rg ry",
    nl: "rw rw rw rw rw rw yr rg bw bw yb kw gw kw yr rb ob wk",
    co: "gw bw rw rb rw rw ry wk gw yr br yr gw rb yr rg br ob bw rb",
    cl: "wk br wb rg yb gw sw ob bw rb rw by rw sw rb rb",
    uy: "yb wr kw pw kw rg gw kw bw bw yr wr kw gw bw sw",
    ec: "rw bw yr bw yr bw rb rw by rg rw sw gw gw bw nr",
    pe: "ry bw sw rb rw sw ry by wk bw yr ry yr rb pk bw rw yb br",
    py: "wk br kw yr rw by gw bw rb bw yr rb",
    bo: "sw rw yb bw gw rb rb rb rw bw gw bw yb rb rw br",
    ve: "yb rb bw br rg bw pw br rb kw rw br br br",
    us: "pk wk kw rb gb sw rb br br yb br kw ob bw sw br ny br sw rw pw bw gw rb nr br gw rb rb bw",
    mx: "ny rw bw ny by ry bw gw gw rb rw br bw rb rb br gw pw",
    sa: "bw by yb gw kw rw gw yb gw ob yr rb rw pw ry br rw yr",
    jp: "nr yr pw pw rb bw rb sw bw pk br ob br ry ob ob gb bw gw bw",
  };
  const rgb = (hex) =>
    hex
      .slice(1)
      .match(/../g)
      .map((n) => parseInt(n, 16));
  const hex = (channels) =>
    "#" +
    channels.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
  function luminance(color) {
    const c = rgb(color).map((n) => {
      const v = n / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  }
  function contrast(a, b) {
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function readable(background) {
    return contrast(background, "#ffffff") >= contrast(background, "#101827")
      ? "#ffffff"
      : "#101827";
  }
  function accent(primary, secondary, background, minimum = 4.5) {
    let color = primary;
    if (
      contrast(color, background) < minimum &&
      contrast(secondary, background) >= minimum
    )
      color = secondary;
    const target = luminance(background) > 0.4 ? "#101827" : "#ffffff";
    for (let n = 0; contrast(color, background) < minimum && n < 30; n++)
      color = hex(rgb(color).map((v, i) => v * 0.9 + rgb(target)[i] * 0.1));
    return color;
  }
  function clubColors(club) {
    if (club?.isNational || club?.id?.startsWith("nt-"))
      return nationalColors(club.country || club.id.slice(3));
    if (!club) return { primary: "#2875c8", secondary: "#8ed7ff" };
    const updated = {
      "Athletico Paranaense": ["#cf102d", "#111111"],
      Chapecoense: ["#08783e", "#ffffff"],
      Coritiba: ["#087846", "#ffffff"],
      Remo: ["#122348", "#ffffff"],
      "Coventry City": ["#65b4df", "#ffffff"],
      "Hull City": ["#f3a220", "#101010"],
      "Ipswich Town": ["#1753b8", "#ffffff"],
      "Deportivo La Coruña": ["#1163b4", "#ffffff"],
      Málaga: ["#69bfe5", "#ffffff"],
      "Racing Santander": ["#11794b", "#ffffff"],
      Frosinone: ["#f4d52b", "#235aaf"],
      Monza: ["#c62132", "#ffffff"],
      Venezia: ["#e36b28", "#125a46"],
      Elversberg: ["#181818", "#ffffff"],
      Paderborn: ["#1259a5", "#111111"],
      "Schalke 04": ["#1759bb", "#ffffff"],
      "Le Mans": ["#c5212d", "#f2d22e"],
      Troyes: ["#2256a0", "#ffffff"],
    }[club.name];
    if (updated) return { primary: updated[0], secondary: updated[1] };
    const parts = club.id.split("-");
    const code = rows[parts[0]]?.split(" ")[Number(parts[1])];
    const [primary, secondary] = palettes[code] || palettes.bw;
    return { primary, secondary };
  }
  const nationalPalettes = {
    Brazil: ["#f5cc35", "#168452"],
    Argentina: ["#77bce6", "#ffffff"],
    Uruguay: ["#79c5ec", "#102442"],
    Colombia: ["#f9d230", "#184a91"],
    Chile: ["#d82838", "#184185"],
    Ecuador: ["#f6ce33", "#184485"],
    Peru: ["#c3263c", "#ffffff"],
    Paraguay: ["#c62a3c", "#214c96"],
    Bolivia: ["#188754", "#ffffff"],
    Venezuela: ["#821d3b", "#e9c779"],
    England: ["#ffffff", "#cf3049"],
    Spain: ["#c82e3b", "#f4c548"],
    Italy: ["#1765bd", "#ffffff"],
    Germany: ["#ffffff", "#242b36"],
    France: ["#2346a2", "#e9384b"],
    Portugal: ["#c52a39", "#187752"],
    Netherlands: ["#ef8027", "#143667"],
    Belgium: ["#c92b3d", "#f5cb42"],
    Croatia: ["#cf3042", "#ffffff"],
    Denmark: ["#c52c42", "#ffffff"],
    Switzerland: ["#d52c3c", "#ffffff"],
    Sweden: ["#f5d036", "#2262ad"],
    Norway: ["#cc3041", "#23488c"],
    Poland: ["#ffffff", "#ce304c"],
    Serbia: ["#c72d42", "#ffffff"],
    Scotland: ["#1d3f85", "#ffffff"],
    Wales: ["#c92b3c", "#ffffff"],
    Türkiye: ["#d62a3e", "#ffffff"],
    Ukraine: ["#f3d239", "#2775c6"],
    Austria: ["#d72f42", "#ffffff"],
    Greece: ["#2777c5", "#ffffff"],
    Ireland: ["#158253", "#ffffff"],
    "Czech Republic": ["#c62f42", "#2763a6"],
    "United States": ["#ffffff", "#214a89"],
    Canada: ["#d62d41", "#ffffff"],
    Mexico: ["#14774f", "#ffffff"],
    "Costa Rica": ["#cd2c3d", "#25488d"],
    Jamaica: ["#f2cc3d", "#178451"],
    Japan: ["#2151b6", "#ffffff"],
    "South Korea": ["#e34c63", "#183c78"],
    "Saudi Arabia": ["#147a50", "#ffffff"],
    Australia: ["#f4ca35", "#177c57"],
    Iran: ["#ffffff", "#1b8557"],
    Morocco: ["#c72e40", "#17774e"],
    Senegal: ["#ffffff", "#1c8752"],
    Nigeria: ["#209458", "#ffffff"],
    Ghana: ["#ffffff", "#d02e43"],
    Algeria: ["#ffffff", "#1a8050"],
    Cameroon: ["#1a8151", "#efc837"],
    "Cote d'Ivoire": ["#ed7d32", "#ffffff"],
    Egypt: ["#cf2c3e", "#ffffff"],
    "South Africa": ["#edc933", "#1a7d54"],
    "New Zealand": ["#ffffff", "#253143"],
  };
  function nationalColors(country) {
    const [primary, secondary] = nationalPalettes[country] || palettes.bw;
    return { primary, secondary };
  }
  function mix(a, b, weight) {
    return hex(rgb(a).map((v, i) => v * (1 - weight) + rgb(b)[i] * weight));
  }
  function themeTokens(colors, mode = "dark") {
    const dark = mode !== "light",
      p = colors.primary;
    const panel = mix(dark ? "#13233b" : "#ffffff", p, dark ? 0.035 : 0.012);
    return {
      "--bg": mix(dark ? "#0b1425" : "#f0f4f9", p, 0.018),
      "--panel": panel,
      "--surface": mix(dark ? "#1b2d47" : "#f4f7fb", p, 0.035),
      "--soft": mix(dark ? "#0f1d32" : "#eaf0f7", p, 0.025),
      "--hero": mix(dark ? "#1b304d" : "#f8fafd", p, 0.065),
      "--nav-bg": mix(dark ? "#0e1c30" : "#ffffff", p, 0.035),
      "--border": mix(dark ? "#30435d" : "#cfdae7", p, 0.06),
      "--text": dark ? "#edf3fc" : "#172b45",
      "--muted": dark ? "#a9bbd3" : "#53657c",
      "--accent": accent(p, colors.secondary, panel, 5.8),
      "--club-primary": p,
      "--club-secondary": colors.secondary,
      "--club-on-primary": readable(p),
      "--action-border":
        contrast(p, panel) >= 3 ? p : accent(p, colors.secondary, panel, 3),
      "--success": dark ? "#71dbb0" : "#126b48",
      "--warning": dark ? "#f0c779" : "#82550c",
      "--error": dark ? "#f4a5ae" : "#b12e45",
      "--info": dark ? "#94c7f5" : "#245d9f",
    };
  }
  const api = {
    palettes,
    rows,
    clubColors,
    nationalColors,
    nationalPalettes,
    themeTokens,
    contrast,
    readable,
    accent,
  };
  root.LegacyAppearance = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
