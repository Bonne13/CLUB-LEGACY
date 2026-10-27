"use strict";
(function (root) {
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const names = {
    possession: "Troca de passes",
    left: "Ataque pela esquerda",
    right: "Ataque pela direita",
    counter: "Contra-ataque",
    switch: "Inversão de jogo",
    through: "Passe em profundidade",
    dribble: "Condução e drible",
    recycle: "Recuo e saída de bola",
    interception: "Interceptação",
    clearance: "Corte da defesa",
    overlap: "Ultrapassagem",
    long: "Finalização de longe",
    corner: "Escanteio",
    freeKick: "Falta direta",
    penalty: "Pênalti",
  };
  function build(m, type, side, actor, detail, view) {
    const own = view.positions.filter((p) => p.side === side),
      opponent = view.positions.filter((p) => p.side !== side),
      outfield = own.filter((p) => p.index !== 0);
    const seed = m.minute * 13 + side * 7,
      pick = (pool, n = 0) =>
        pool[(seed + n) % pool.length] ||
        own[0] || {
          id: null,
          name: "Autoria não disponível na base",
          x: 50,
          y: 50,
        };
    const keeper = own.find((p) => p.index === 0) || pick(own),
      defense = outfield.filter((p) => p.index <= 4),
      midfield = outfield.filter((p) => p.index > 4 && p.index < 8),
      forwards = outfield.filter((p) => p.index >= 8);
    const cb = pick(defense),
      mid = pick(midfield),
      mid2 = pick(midfield, 1),
      forward = pick(forwards),
      left = [...outfield].sort((a, b) => a.y - b.y)[0] || mid,
      right = [...outfield].sort((a, b) => b.y - a.y)[0] || mid;
    const shooter = own.find((p) => p.id === actor?.id) || pick(forwards),
      assist = own.find((p) => p.id === m.lastShot?.assistId) || mid2;
    const instructions = m.plans[side].instructions;
    let pool = [
      "possession",
      "left",
      "right",
      "counter",
      "switch",
      "through",
      "dribble",
      "recycle",
      "interception",
      "clearance",
      "overlap",
      "long",
    ];
    if (instructions.style === "Posse de bola")
      pool = [
        "possession",
        "switch",
        "through",
        "recycle",
        "dribble",
        "possession",
        "left",
        "right",
      ];
    if (instructions.style === "Contra-ataque")
      pool = [
        "counter",
        "through",
        "left",
        "right",
        "interception",
        "counter",
        "dribble",
      ];
    if (instructions.style === "Jogo direto")
      pool = [
        "left",
        "right",
        "counter",
        "switch",
        "long",
        "overlap",
        "clearance",
      ];
    let pattern = pool[seed % pool.length];
    const shot = type !== "build-up";
    if (detail === "pênalti") pattern = "penalty";
    else if (detail === "falta direta") pattern = "freeKick";
    else if (detail.startsWith("escanteio")) pattern = "corner";
    const x = (n) => (side ? 100 - n : n);
    const point = (p, ax, y, caption, action = "pass") => ({
      x: clamp(ax, 2, 98),
      y: clamp(y, 5, 95),
      playerId: p?.id || null,
      name: p?.name || "Autoria não disponível na base",
      caption,
      action,
    });
    let from = {
      x: x(
        pattern === "penalty"
          ? 89.5
          : pattern === "freeKick"
            ? 76
            : pattern === "long"
              ? 72
              : 82 + (seed % 7),
      ),
      y: pattern === "penalty" ? 50 : 28 + ((seed * 3) % 44),
    };
    const at = (p, caption) => point(p, p.x, p.y, caption);
    let path;
    switch (pattern) {
      case "left":
        path = [
          at(cb, "abre a jogada pela esquerda."),
          point(mid, x(44), 34, "aproxima para tabelar."),
          point(left, x(66), 12, "avança pela ponta esquerda.", "carry"),
          point(forward, x(80), 39, "recebe o cruzamento."),
        ];
        break;
      case "right":
        path = [
          at(cb, "aciona o corredor direito."),
          point(mid, x(44), 66, "oferece apoio por dentro."),
          point(right, x(66), 88, "avança pela ponta direita.", "carry"),
          point(forward, x(80), 61, "recebe a bola na área."),
        ];
        break;
      case "counter":
        path = [
          at(cb, "recupera a bola e acelera."),
          point(mid, x(42), 45, "encontra espaço no meio."),
          point(forward, x(70), 35, "dispara em contra-ataque.", "carry"),
          point(mid2, x(82), 57, "chega para apoiar."),
        ];
        break;
      case "switch":
        path = [
          at(left, "prende a marcação de um lado."),
          point(mid, x(46), 35, "recicla a posse."),
          point(mid2, x(51), 58, "enxerga o lado livre."),
          point(right, x(68), 87, "recebe a inversão de jogo."),
          point(forward, x(81), 65, "aproxima para a tabela."),
        ];
        break;
      case "through":
        path = [
          at(cb, "inicia a saída de bola."),
          point(mid, x(43), 47, "recebe entre as linhas."),
          point(mid2, x(58), 52, "prepara o passe em profundidade."),
          point(forward, x(83), 42, "ataca as costas da defesa.", "carry"),
        ];
        break;
      case "dribble":
        path = [
          at(mid, "encontra o ponta livre."),
          point(left, x(58), 20, "domina e encara a marcação."),
          point(left, x(67), 29, "supera o marcador no drible.", "carry"),
          point(left, x(75), 38, "conduz para dentro.", "carry"),
          point(forward, x(82), 55, "recebe o passe de apoio."),
        ];
        break;
      case "recycle":
        path = [
          at(mid, "prefere recomeçar a jogada."),
          at(cb, "recua para o goleiro."),
          point(keeper, x(7), 50, "domina e procura a saída curta."),
          point(pick(defense, 1), x(26), 70, "recebe na saída da defesa."),
          point(mid2, x(44), 59, "retoma a construção pelo meio."),
        ];
        break;
      case "interception":
      case "clearance":
        path = [
          at(cb, "procura o passe vertical."),
          point(mid, x(54), 46, "tenta romper a linha defensiva."),
          point(
            pick(opponent.filter((p) => p.index > 0)),
            x(64),
            49,
            pattern === "interception"
              ? "antecipa o passe e recupera a posse."
              : "corta a bola e afasta o perigo.",
            "turnover",
          ),
        ];
        break;
      case "overlap":
        path = [
          at(mid, "atrai o marcador pelo meio."),
          point(right, x(56), 80, "segura a bola no corredor."),
          point(pick(defense, 1), x(74), 91, "faz a ultrapassagem.", "carry"),
          point(forward, x(83), 60, "recebe o passe para trás."),
        ];
        break;
      default:
        path = [
          at(cb, "começa a construção."),
          point(mid, x(42), 38, "recebe e toca de primeira."),
          point(mid2, x(55), 58, "faz a tabela pelo meio."),
          point(
            forward,
            x(72),
            48,
            pattern === "long"
              ? "abre espaço para bater de longe."
              : "recebe entre os defensores.",
          ),
        ];
    }
    let target = path.at(-1),
      outcome =
        pattern === "interception" || pattern === "clearance"
          ? "turnover"
          : "possession";
    if (shot) {
      // A shot always ends with its actual assistant, shooter and recorded outcome.
      if (pattern === "penalty" || pattern === "freeKick") path = [];
      else if (pattern === "corner") {
        const taker = own.find((p) => p.id === m.lastShot?.assistId) || assist;
        path = [
          point(
            taker,
            x(98),
            seed % 2 ? 5 : 95,
            "prepara a cobrança do escanteio.",
          ),
        ];
        from = { x: x(88), y: 44 + (seed % 13) };
      } else if (
        pattern === "interception" ||
        pattern === "clearance" ||
        pattern === "recycle"
      ) {
        pattern = "through";
        path = [
          at(cb, "recupera e inicia um novo ataque."),
          point(mid, x(48), 42, "acelera a transição."),
        ];
      } else path = path.slice(0, m.minute === 1 ? 1 : 2 + (seed % 2));
      if (pattern !== "penalty" && pattern !== "freeKick")
        path.push(
          point(
            assist,
            x(68),
            from.y + (seed % 2 ? 9 : -9),
            "prepara o último passe para a finalização.",
          ),
        );
      path.push(
        point(
          shooter,
          from.x,
          from.y,
          pattern === "corner"
            ? "sobe para finalizar na área."
            : "domina e prepara a finalização.",
        ),
      );
      target =
        type === "goal"
          ? { x: side ? 1 : 99, y: 46 + (m.minute % 9) }
          : m.lastShot?.saved
            ? { x: side ? 5 : 95, y: 44 + (m.minute % 13) }
            : { x: side ? 3 : 97, y: m.minute % 2 ? 26 : 74 };
      outcome = type === "goal" ? "goal" : m.lastShot?.saved ? "save" : "wide";
      path.push({
        ...target,
        action: "shot",
        caption:
          outcome === "goal"
            ? "A bola entra! Gol!"
            : outcome === "save"
              ? "O goleiro faz a defesa!"
              : "A finalização sai para fora.",
      });
    }
    const previousPoint = m.lastPlay?.path?.at(-1);
    const previousCarrier =
      previousPoint && own.find((p) => p.id === previousPoint.playerId);
    if (previousCarrier && m.lastPlay?.outcome !== "goal") {
      path.unshift(
        point(
          previousCarrier,
          previousPoint.x,
          previousPoint.y,
          "mantém a bola e dá sequência à jogada.",
        ),
      );
    }
    return {
      pattern,
      label: names[pattern],
      outcome,
      from,
      target,
      path,
      playerId: shot ? shooter.id : target.playerId,
      playerName: shot
        ? actor?.name || shooter.name
        : target.name || shooter.name,
    };
  }
  const api = { build, names };
  root.LegacyMatchPlays = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
