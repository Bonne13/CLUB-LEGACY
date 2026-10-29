"use strict";
(function (root) {
  const F = typeof module !== "undefined" ? require("./finance.js") : root.LegacyFinance;
  const D = typeof module !== "undefined" ? require("./schedule.js") : root.LegacySchedule;
  const T = typeof module !== "undefined" ? require("./tactics.js") : root.LegacyTactics;
  const date = (s, days = 0) => new Date(D.at(s).getTime() + days * 86400000).toISOString().slice(0, 10);
  const team = (s, id = s.clubId) => s.teams.find(t => t.id === id);
  function ensure(s) {
    return s.outgoingMarket ??= { sequence: 0, listings: [], offers: [] };
  }
  function editable(s) {
    if (!s.clubId) throw Error("Comece uma carreira primeiro.");
    if (s.live && !s.live.done) throw Error("Conclua a partida antes de alterar a lista.");
  }
  function player(t, id) { return [...t.players, ...t.youth].find(p => p.id === id); }
  function closeOffers(data, listingId, status = "cancelled") {
    for (const o of data.offers) if (o.listingId === listingId && o.status === "pending") o.status = status;
  }
  function list(s, playerId, kind, terms = {}) {
    editable(s);
    const t = team(s), p = player(t, playerId), data = ensure(s);
    if (!p || p.loan || !["sale", "loan"].includes(kind)) throw Error("Atleta indisponível para esta lista.");
    const fee = Number(terms.fee ?? Math.ceil(p.price * (kind === "sale" ? 1 : .1)));
    const years = kind === "loan" ? Number(terms.years ?? 1) : 0;
    const option = kind === "loan" && terms.option != null ? Number(terms.option) : null;
    if (!Number.isSafeInteger(fee) || fee < (kind === "sale" ? 1 : 0) || fee > 1e13 ||
        (kind === "loan" && ![1, 2].includes(years)) ||
        (option !== null && (!Number.isSafeInteger(option) || option < 1 || option > 1e13)))
      throw Error("Revise o valor, o prazo e a opção de compra.");
    if (kind === "loan" && p.contract < s.season + years) throw Error("O contrato precisa cobrir todo o empréstimo.");
    const existing = data.listings.find(l => l.playerId === playerId && l.ownerId === t.id && l.status === "active");
    if (!existing && data.listings.filter(l => l.status === "active").length >= 30) throw Error("A lista comporta até 30 atletas ativos.");
    if (existing) { existing.status = "replaced"; closeOffers(data, existing.id); }
    const listing = { id: "listing-" + ++data.sequence, ownerId: t.id, playerId, playerName: p.name, kind, fee, years, option, status: "active", createdOn: date(s), nextOn: date(s, 3) };
    data.listings.unshift(listing);
    data.listings = data.listings.filter((l, i) => l.status === "active" || i < 80);
    return listing;
  }
  function remove(s, id) {
    editable(s);
    const data = ensure(s), l = data.listings.find(l => l.id === id && l.ownerId === s.clubId && l.status === "active");
    if (!l) throw Error("Anúncio indisponível.");
    l.status = "removed";
    closeOffers(data, id);
  }
  function decline(s, id) {
    editable(s);
    const o = ensure(s).offers.find(o => o.id === id && o.ownerId === s.clubId && o.status === "pending");
    if (!o) throw Error("Proposta indisponível.");
    o.status = "rejected";
  }
  function process(s, windowOpen, announce = () => {}) {
    const data = ensure(s), today = date(s), received = [];
    for (const o of data.offers) if (o.status === "pending" && o.expiresOn < today) o.status = "expired";
    for (const l of data.listings.filter(l => l.status === "active")) {
      const owner = team(s, l.ownerId), p = owner && player(owner, l.playerId);
      if (!p || p.loan) { l.status = "unavailable"; closeOffers(data, l.id); continue; }
      if (!windowOpen || l.ownerId !== s.clubId || l.nextOn > today) continue;
      l.nextOn = date(s, 7);
      if (data.offers.filter(o => o.listingId === l.id && o.status === "pending").length >= 6) continue;
      if (l.kind === "loan" && p.contract < s.season + l.years) continue;
      const reasonable = l.kind === "sale" ? p.price*1.35 : p.price*.25*l.years;
      if (l.fee > reasonable) continue;
      const seed = Date.parse(today) / 86400000 + data.sequence;
      const candidates = s.teams.filter(t => t.id !== owner.id && t.players.length >= 11 && t.players.length < 30 &&
        !data.offers.some(o => o.listingId === l.id && o.buyerId === t.id && o.status === "pending"))
        .map((t, i) => {
          const peers = t.players.filter(q => q.pos === p.pos);
          const reference = peers.length ? peers.reduce((n,q) => n + q.ovr, 0) / peers.length : 50;
          const factor = .85 + ((i + seed) % 5) * .04;
          const fee = l.kind === "sale" ? Math.max(1, Math.round(l.fee * factor)) : l.fee;
          return {t, fee, score: p.ovr - reference + (peers.length < 3 ? 8 : 0) + ((i + seed) % 7)};
        }).filter(({t, fee, score}) => score >= -12 && t.money >= fee + (l.kind === "sale" ? p.salary * 4 : 0) && t.finance.transferBudget >= fee && F.payroll(t) + p.salary <= t.finance.wageBudget)
        .sort((a,b) => b.score-a.score || a.t.id.localeCompare(b.t.id)).slice(0,3);
      for (const {t, fee} of candidates) {
        const offer = { id: "out-offer-" + ++data.sequence, listingId: l.id, playerId: p.id, playerName: p.name, ownerId: owner.id, buyerId: t.id, kind: l.kind, fee, years: l.years, option: l.option, salary: p.salary, status: "pending", createdOn: today, expiresOn: date(s, 10) };
        data.offers.unshift(offer);
        received.push(offer);
      }
      if (candidates.length) announce(`${p.name}: ${candidates.length} proposta(s) recebida(s).`, {category: "market", clubIds: [owner.id], body: "Compare as ofertas na Lista de saídas, em Transferências. O atleta continua no seu clube até você aceitar uma proposta."});
    }
    data.offers = data.offers.filter((o,i) => o.status === "pending" || i < 150);
    if (received.length) s.negotiationRevision = (s.negotiationRevision || 0) + 1;
    return received;
  }
  function accept(s, id, { windowOpen, sell, announce = () => {}, numberSquad = () => {} }) {
    editable(s);
    if (!windowOpen) throw Error("Aguarde a abertura da janela de transferências.");
    const data = ensure(s), o = data.offers.find(o => o.id === id && o.ownerId === s.clubId && o.status === "pending" && o.expiresOn >= date(s));
    const l = o && data.listings.find(l => l.id === o.listingId && l.status === "active");
    const owner = team(s), p = l && player(owner, l.playerId), buyer = o && team(s, o.buyerId);
    if (!o || !l || !p || !buyer || p.loan) throw Error("A proposta não está mais disponível.");
    if (owner.players.includes(p) && owner.players.length <= 16) throw Error("Mantenha pelo menos 16 profissionais no elenco.");
    if (buyer.players.length >= 30) throw Error("O clube interessado já completou seu elenco.");
    if (p.salary !== o.salary) throw Error("O salário mudou. Recuse esta proposta e aguarde uma nova.");
    if (o.kind === "sale") sell(s, p.id, buyer.id, o.fee, o);
    else {
      if (p.contract < s.season + o.years) throw Error("O contrato termina antes do empréstimo.");
      F.canHire(buyer, p, o.fee, p.salary, s, 0);
      F.post(buyer, s, -o.fee, "transfer", `Empréstimo · ${p.name}`);
      F.post(owner, s, o.fee, "transfer", `Empréstimo cedido · ${p.name}`);
      buyer.finance.transferBudget -= o.fee;
      owner.finance.transferBudget += o.fee;
      const academy = owner.youth.includes(p), source = academy ? owner.youth : owner.players;
      source.splice(source.indexOf(p), 1);
      owner.lineup = owner.lineup.map(x => x === p.id ? "" : x);
      p.loan = {ownerId: owner.id, borrowerId: buyer.id, endSeason: s.season + o.years, option: o.option, academy, aiPurchaseAllowed: true};
      delete p.shirtNumber;
      buyer.players.push(p);
      numberSquad(buyer);
      T.ensure(owner);
      announce(`${p.name} emprestado ao ${buyer.name}.`, {category: "market", clubIds: [owner.id,buyer.id], body: `Retorno no início de ${p.loan.endSeason}. O destino assume o salário integral.${o.option ? ` Opção de compra: R$ ${o.option.toLocaleString("pt-BR")}.` : " Sem opção de compra."}`});
    }
    o.status = "accepted";
    l.status = "completed";
    closeOffers(data, l.id);
    return o;
  }
  const api = { ensure, list, remove, decline, process, accept };
  root.LegacyOutgoingMarket = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
