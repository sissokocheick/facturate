/* ============================================================
   Facturate — logique applicative
   Aucune donnée n'est envoyée nulle part : tout reste en local.
   ============================================================ */
(function () {
  "use strict";

  const STORE_KEY = "facturate.draft.v1";
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const CURRENCIES = {
    EUR: { symbol: "€", locale: "fr-FR" },
    USD: { symbol: "$", locale: "en-US" },
    GBP: { symbol: "£", locale: "en-GB" },
    CHF: { symbol: "CHF", locale: "fr-CH" },
  };

  // --------- État par défaut ---------
  const todayISO = new Date().toISOString().slice(0, 10);
  const dueISO = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const blankItem = () => ({
    desc: "",
    detail: "",
    qty: 1,
    unit: "h",
    price: "",
    tva: null, // null = hérite de la TVA par défaut
  });

  const defaultState = () => ({
    docType: "facture",
    sName: "", sSiret: "", sAddress: "", sEmail: "", sPhone: "",
    sAutoEnt: false, sTvaIntra: "",
    cName: "", cContact: "", cAddress: "",
    dNumber: "", dDate: todayISO, dDue: dueISO,
    dCurrency: "EUR", dTva: "20", dNotes: "",
    items: [blankItem()],
  });

  let state = defaultState();

  // --------- Formatage ---------
  function fmt(value, currencyCode, withSymbol) {
    const c = CURRENCIES[currencyCode] || CURRENCIES.EUR;
    const n = Number(value) || 0;
    const out = n.toLocaleString(c.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return withSymbol === false ? out : `${out} ${c.symbol}`;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function multiline(s) {
    return esc(s).replace(/\n/g, "<br>");
  }

  // --------- Items ---------
  function addItem() {
    state.items.push(blankItem());
    renderItems();
    refresh();
  }

  function removeItem(i) {
    if (state.items.length <= 1) {
      state.items = [blankItem()];
    } else {
      state.items.splice(i, 1);
    }
    renderItems();
    refresh();
  }

  function renderItems() {
    const host = $("#items");
    host.innerHTML = "";
    state.items.forEach((it, i) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div class="row">
          <div>
            <label>Description</label>
            <input class="desc" data-f="desc" data-i="${i}" value="${esc(it.desc)}"
                   placeholder="Développement site vitrine">
          </div>
          <div>
            <label>Qté</label>
            <input type="number" step="any" min="0" data-f="qty" data-i="${i}" value="${esc(it.qty)}">
          </div>
          <div>
            <label>Prix unit. HT</label>
            <input type="number" step="any" min="0" data-f="price" data-i="${i}" value="${esc(it.price)}"
                   placeholder="450">
          </div>
          <div>
            <label>Total HT</label>
            <input class="line-total" data-lt="${i}" readonly value="">
          </div>
          <div>
            <button class="btn-danger" data-del="${i}" title="Supprimer">✕</button>
          </div>
        </div>
        <div class="grid-2 desc-label" style="margin-top:8px">
          <div>
            <label>Détail (facultatif)</label>
            <input class="detail" data-f="detail" data-i="${i}" value="${esc(it.detail)}"
                   placeholder="Cahier des charges, intégration, mise en ligne">
          </div>
          <div>
            <label>TVA ligne</label>
            <select data-f="tva" data-i="${i}">
              ${["20", "10", "5.5", "2.1", "0"].map(
                (v) =>
                  `<option value="${v}"${it.tva === v ? " selected" : ""}>${
                    v === "0" ? "0 %" : Number(v).toLocaleString("fr-FR") + " %"
                  }</option>`
              ).join("")}
              <option value=""${it.tva == null || it.tva === "" ? " selected" : ""}>
                TVA par défaut (${fmtPct(state.dTva)})
              </option>
            </select>
          </div>
        </div>`;
      host.appendChild(el);
    });
  }

  function fmtPct(v) {
    return String(v).replace(".", ",") + " %";
  }

  // --------- Calculs ---------
  // Renvoie un total par taux de TVA + totaux globaux.
  function compute() {
    const defaultTva = state.dTva === "" ? 0 : Number(state.dTva);
    const lines = [];
    let totalHt = 0;
    let totalTva = 0;

    state.items.forEach((it) => {
      const qty = Number(it.qty) || 0;
      const price = Number(it.price) || 0;
      const ht = qty * price;
      const tvaRate =
        it.tva === null || it.tva === "" || it.tva === undefined
          ? defaultTva
          : Number(it.tva);
      totalHt += ht;
      totalTva += ht * (tvaRate / 100);
      lines.push({ ht, tvaRate });
    });

    const buckets = new Map();
    lines.forEach((l) => {
      const k = String(l.tvaRate);
      if (!buckets.has(k)) buckets.set(k, { base: 0, tva: 0, rate: l.tvaRate });
      const b = buckets.get(k);
      b.base += l.ht;
      b.tva += l.ht * (l.tvaRate / 100);
    });

    return {
      lines,
      buckets: Array.from(buckets.values()).sort((a, b) => b.rate - a.rate),
      totalHt,
      totalTva,
      totalTtc: totalHt + totalTva,
    };
  }

  // --------- Aperçu ---------
  function renderPreview() {
    const c = compute();
    const isFacture = state.docType === "facture";
    const title = isFacture ? "Facture" : "Devis";
    const number = state.dNumber || (isFacture ? "FA-" + todayISO.slice(0, 4) + "-001" : "DV-" + todayISO.slice(0, 4) + "-001");

    const dateFr = state.dDate
      ? new Date(state.dDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
      : "—";
    const dueFr = state.dDue
      ? new Date(state.dDue + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
      : "—";

    const parties = `
      <div class="inv-party">
        <h3>Émetteur</h3>
        <div class="who">${esc(state.sName) || "Votre nom ou société"}</div>
        <div class="addr">${multiline(state.sAddress) || "Votre adresse"}</div>
        ${state.sSiret ? `<div class="addr" style="margin-top:4px">SIRET : ${esc(state.sSiret)}</div>` : ""}
        ${state.sEmail ? `<div class="addr">${esc(state.sEmail)}</div>` : ""}
        ${state.sPhone ? `<div class="addr">${esc(state.sPhone)}</div>` : ""}
      </div>
      <div class="inv-party">
        <h3>Client</h3>
        <div class="who">${esc(state.cName) || "Nom de votre client"}</div>
        ${state.cContact ? `<div class="addr">À l'attention de ${esc(state.cContact)}</div>` : ""}
        <div class="addr">${multiline(state.cAddress) || "Adresse de votre client"}</div>
      </div>`;

    const rows = state.items
      .map((it) => {
        const qty = Number(it.qty) || 0;
        const price = Number(it.price) || 0;
        const ht = qty * price;
        const tvaRate =
          it.tva === null || it.tva === "" || it.tva === undefined
            ? state.dTva === "" ? 0 : Number(state.dTva)
            : Number(it.tva);
        return `<tr>
          <td class="desc">${esc(it.desc) || "<span style='color:#a5aab5'>Description</span>"}
            ${it.detail ? `<div class="sub">${esc(it.detail)}</div>` : ""}</td>
          <td class="num">${esc(it.qty) || "1"} ${esc(it.unit)}</td>
          <td class="num">${fmt(price, state.dCurrency)}</td>
          <td class="num">${fmtPct(tvaRate)}</td>
          <td class="num"><strong>${fmt(ht, state.dCurrency)}</strong></td>
        </tr>`;
      })
      .join("");

    const tvaBreakdown = c.buckets.length > 1
      ? c.buckets
          .map(
            (b) =>
              `<div class="line"><span>TVA ${fmtPct(b.rate)}</span><span class="v">${fmt(b.tva, state.dCurrency)}</span></div>`
          )
          .join("")
      : "";

    const legal = state.sAutoEnt
      ? `Micro-entreprise — Entreprise individuelle relevant du régime des micro-entreprises.
Dispensé d'immatriculation au RCS et au RM. TVA non applicable, art. 293 B du CGI.
${state.sTvaIntra ? "TVA intracommunautaire : " + esc(state.sTvaIntra) : ""}`
      : `TVA appliquée selon les taux en vigueur. ${
          state.sSiret ? "SIRET : " + esc(state.sSiret) + "." : ""
        }`;

    $("#preview").innerHTML = `
      <div class="inv-head">
        <div class="inv-emitter">
          <div class="name">${esc(state.sName) || "Votre nom ou société"}</div>
          <div class="muted">${multiline(state.sAddress)}</div>
        </div>
        <div class="inv-title">
          <h1>${title}</h1>
          <div class="meta">N° ${esc(number)}
${isFacture ? "Date : " + dateFr + "\nÉchéance : " + dueFr : "Date du devis : " + dateFr + "\nValidité : " + dueFr}</div>
          <span class="pill">${isFacture ? "À payer" : "Proposition"}</span>
        </div>
      </div>

      <div class="inv-parties">${parties}</div>

      <table class="inv-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="num">Qté</th>
            <th class="num">Prix unit. HT</th>
            <th class="num">TVA</th>
            <th class="num">Total HT</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="inv-totals">
        <div class="line"><span>Total HT</span><span class="v">${fmt(c.totalHt, state.dCurrency)}</span></div>
        ${tvaBreakdown}
        <div class="line"><span>Total TVA</span><span class="v">${fmt(c.totalTva, state.dCurrency)}</span></div>
        <div class="line total"><span>Total ${isFacture ? "à payer" : "du devis"} TTC</span>
          <span class="v">${fmt(c.totalTtc, state.dCurrency)}</span></div>
      </div>

      ${state.dNotes ? `<div class="inv-notes">${multiline(state.dNotes)}</div>` : ""}

      <div class="inv-legal">${legal}</div>

      <div class="inv-foot">
        <span>${esc(state.sName) || ""}${state.sSiret ? " — SIRET " + esc(state.sSiret) : ""}</span>
        <span class="inv-thanks">${isFacture ? "Merci de votre confiance." : "Devis valable jusqu'au " + dueFr + "."}</span>
      </div>`;
  }

  // --------- Mise à jour des totaux de ligne + aperçu ---------
  function refresh() {
    state.items.forEach((it, i) => {
      const node = document.querySelector(`.item [data-lt="${i}"]`);
      const ht = (Number(it.qty) || 0) * (Number(it.price) || 0);
      if (node) node.value = fmt(ht, state.dCurrency, false);
    });
    renderPreview();
    save();
  }

  // --------- Persistance locale ---------
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
        const note = $("#autosaveNote");
        note.textContent = "Brouillon enregistré à " +
          new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        note.classList.add("flash");
        setTimeout(() => note.classList.remove("flash"), 1200);
      } catch (e) {
        /* localStorage indisponible : on continue sans persister */
      }
    }, 350);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      state = Object.assign(defaultState(), parsed);
      if (!Array.isArray(state.items) || !state.items.length) state.items = [blankItem()];
      return true;
    } catch (e) {
      return false;
    }
  }

  // --------- Liaison formulaire -> état ---------
  function bindForm() {
    const fieldMap = {
      sName: "sName", sSiret: "sSiret", sAddress: "sAddress", sEmail: "sEmail",
      sPhone: "sPhone", sAutoEnt: "sAutoEnt", sTvaIntra: "sTvaIntra",
      cName: "cName", cContact: "cContact", cAddress: "cAddress",
      dNumber: "dNumber", dDate: "dDate", dDue: "dDue",
      dCurrency: "dCurrency", dTva: "dTva", dNotes: "dNotes",
    };

    Object.keys(fieldMap).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const key = fieldMap[id];
      el.addEventListener("input", () => {
        state[key] = el.type === "checkbox" ? el.checked : el.value;
        if (id === "sAutoEnt") {
          $("#autoEntOptions").classList.toggle("hidden", !state.sAutoEnt);
        }
        if (id === "dTva") renderItems(); // le libellé "TVA par défaut" change
        refresh();
      });
    });

    $$('input[name="docType"]').forEach((r) =>
      r.addEventListener("change", () => {
        state.docType = r.value;
        refresh();
      })
    );

    // Items : délégation d'événements
    $("#items").addEventListener("input", (e) => {
      const t = e.target;
      if (!t.dataset || t.dataset.f === undefined || t.dataset.i === undefined) return;
      const i = Number(t.dataset.i);
      const f = t.dataset.f;
      if (!state.items[i]) return;
      if (f === "qty" || f === "price") {
        state.items[i][f] = t.value;
      } else {
        state.items[i][f] = t.value;
      }
      refresh();
    });
    $("#items").addEventListener("change", (e) => {
      const t = e.target;
      if (!t.dataset || t.dataset.f === undefined || t.dataset.i === undefined) return;
      const i = Number(t.dataset.i);
      if (!state.items[i]) return;
      if (t.dataset.f === "tva") {
        state.items[i].tva = t.value === "" ? null : t.value;
        refresh();
      }
    });
    $("#items").addEventListener("click", (e) => {
      const b = e.target.closest("[data-del]");
      if (b) removeItem(Number(b.dataset.del));
    });

    $("#btnAddItem").addEventListener("click", addItem);
    $("#btnPrint").addEventListener("click", () => window.print());
    $("#btnNew").addEventListener("click", () => {
      if (confirm("Effacer le document courant et recommencer ?")) {
        state = defaultState();
        hydrateForm();
        renderItems();
        refresh();
      }
    });
    $("#btnLoad").addEventListener("click", () => {
      if (load()) {
        hydrateForm();
        renderItems();
        refresh();
      } else {
        alert("Aucun brouillon enregistré pour l'instant.");
      }
    });
  }

  function hydrateForm() {
    const map = {
      sName: "sName", sSiret: "sSiret", sAddress: "sAddress", sEmail: "sEmail",
      sPhone: "sPhone", sAutoEnt: "sAutoEnt", sTvaIntra: "sTvaIntra",
      cName: "cName", cContact: "cContact", cAddress: "cAddress",
      dNumber: "dNumber", dDate: "dDate", dDue: "dDue",
      dCurrency: "dCurrency", dTva: "dTva", dNotes: "dNotes",
    };
    Object.keys(map).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const v = state[map[id]];
      el.value = v == null ? "" : v;
      if (el.type === "checkbox") el.checked = !!v;
    });
    $("#autoEntOptions").classList.toggle("hidden", !state.sAutoEnt);
    const radio = document.querySelector(`input[name="docType"][value="${state.docType}"]`);
    if (radio) radio.checked = true;
  }

  // --------- Démarrage ---------
  load();
  hydrateForm();
  renderItems();
  bindForm();
  refresh();
})();
