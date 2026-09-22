/* ============================================================
   Facturate — logique applicative
   Aucune donnée n'est envoyée nulle part : tout reste en local.
   ============================================================ */
(function () {
  "use strict";

  const STORE_KEY = "facturate.draft.v1";
  const DOCS_KEY = "facturate.docs.v1";
  const LICENSE_KEY = "facturate.license.v1";
  const SALT = "frct-2026";
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
    // --- Premium ---
    dStatus: "attente",      // attente | paye | retard
    dPaidDate: "",
    dIban: "",
    dPenalty: true,          // mention indemnité forfaitaire de retard
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
    const dueOrPaid = (iso) =>
      iso
        ? new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
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
        }${state.dPenalty ? " Indemnité forfaitaire de 40 € pour frais de recouvrement en cas de retard de paiement." : ""}`;

    const statusPill =
      state.docType === "facture"
        ? state.dStatus === "paye"
          ? `<span class="pill pill-ok">Payée${state.dPaidDate ? " le " + dueOrPaid(state.dPaidDate) : ""}</span>`
          : state.dStatus === "retard"
          ? `<span class="pill pill-late">En retard</span>`
          : `<span class="pill">À payer</span>`
        : `<span class="pill">Proposition</span>`;

    $("#preview").innerHTML = `
      ${state.dStatus === "paye" && state.docType === "facture"
        ? `<div class="stamp stamp-paid">PAYÉE</div>` : ""}
      <div class="inv-head">
        <div class="inv-emitter">
          <div class="name">${esc(state.sName) || "Votre nom ou société"}</div>
          <div class="muted">${multiline(state.sAddress)}</div>
        </div>
        <div class="inv-title">
          <h1>${title}</h1>
          <div class="meta">N° ${esc(number)}
${isFacture ? "Date : " + dateFr + "\nÉchéance : " + dueFr : "Date du devis : " + dateFr + "\nValidité : " + dueFr}</div>
          ${statusPill}
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
    const loadBtn = $("#btnLoad");
    if (loadBtn) loadBtn.addEventListener("click", () => {
      if (load()) {
        hydrateForm();
        renderItems();
        refresh();
      } else {
        alert("Aucun brouillon enregistré pour l'instant.");
      }
    });

    // ---------- Premium ----------
    $("#btnActivate").addEventListener("click", () => {
      const v = $("#licenseInput").value;
      const msg = $("#licenseMsg");
      if (setLicense(v)) {
        msg.style.color = "var(--ok)";
        msg.textContent = "Licence activée. Merci !";
        applyProState();
      } else {
        msg.style.color = "var(--danger)";
        msg.textContent = "Clé invalide. Vérifiez la saisie (format FACT-XXXX-XXXX).";
      }
    });

    $("#btnSaveDoc").addEventListener("click", () => {
      if (!isPro()) {
        showGate("Enregistrer un document");
        return;
      }
      const res = saveDocToLibrary();
      if (res.ok) {
        flashNote("Document enregistré dans la bibliothèque (n° " + res.snap.number + ")");
      } else {
        showGate("Enregistrer un document");
      }
    });

    $("#btnLibrary").addEventListener("click", () => {
      if (!isPro()) {
        showGate("La bibliothèque de documents");
        return;
      }
      renderLibrary();
      $("#libraryOverlay").classList.remove("hidden");
    });

    $("#btnCloseLib").addEventListener("click", () => {
      $("#libraryOverlay").classList.add("hidden");
    });
    $("#libraryOverlay").addEventListener("click", (e) => {
      if (e.target.id === "libraryOverlay") $("#libraryOverlay").classList.add("hidden");
    });

    $("#btnAutoNum").addEventListener("click", () => {
      if (!isPro()) { showGate("La numérotation automatique"); return; }
      state.dNumber = nextNumber(state.docType);
      hydrateForm();
      refresh();
      flashNote("Numéro attribué : " + state.dNumber);
    });

    $("#btnCsv").addEventListener("click", () => {
      if (!isPro()) { showGate("L'export comptable CSV"); return; }
      exportCsv();
      flashNote("Export CSV généré");
    });

    $("#btnBackup").addEventListener("click", () => {
      if (!isPro()) { showGate("La sauvegarde complète"); return; }
      exportBackup();
      flashNote("Sauvegarde JSON téléchargée");
    });

    // Champs Premium
    ["dStatus", "dPaidDate", "dIban"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", () => {
        state[id] = el.value;
        refresh();
      });
      el.addEventListener("change", () => {
        state[id] = el.value;
        refresh();
      });
    });
    const pen = document.getElementById("dPenalty");
    if (pen) {
      pen.addEventListener("input", () => {
        state.dPenalty = pen.checked;
        refresh();
      });
    }
  }

  function flashNote(text) {
    const note = $("#autosaveNote");
    note.textContent = text;
    note.classList.add("flash");
    setTimeout(() => note.classList.remove("flash"), 2200);
  }

  function showGate(feature) {
    $("#proGate").classList.remove("hidden");
    $("#proGate").scrollIntoView({ behavior: "smooth", block: "center" });
    $("#licenseMsg").textContent = "";
  }

  function applyProState() {
    const pro = isPro();
    const gate = $("#proGate");
    const box = $("#premiumBox");
    if (gate) gate.classList.toggle("hidden", pro);
    if (box) box.style.opacity = pro ? "1" : ".55";
    const status = $("#proStatus");
    if (status) {
      status.textContent = pro ? "Version Pro active" : "Version gratuite — fonctions Pro verrouillées";
    }
  }

  function renderLibrary() {
    const docs = loadDocs();
    const host = $("#libraryList");
    if (!docs.length) {
      host.innerHTML = `<p class="lib-empty">Aucun document enregistré pour l'instant.<br>
        Remplissez une facture puis cliquez sur « Enregistrer ».</p>`;
      return;
    }
    host.innerHTML = "";
    docs.forEach((d) => {
      const el = document.createElement("div");
      el.className = "lib-item";
      const c = CURRENCIES[d.currency] || CURRENCIES.EUR;
      const dateFr = d.date
        ? new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR")
        : "—";
      el.innerHTML = `
        <div class="lib-main">
          <div class="lib-top">
            <span class="lib-num">${esc(d.number)}</span>
            <span class="pill-sm ${esc(d.status)}">${
              d.status === "paye" ? "Payé" : d.status === "retard" ? "En retard" : "En attente"
            }</span>
          </div>
          <span class="lib-client">${esc(d.type === "facture" ? "Facture" : "Devis")} · ${esc(d.client)}</span>
          <span class="lib-meta">${dateFr}</span>
        </div>
        <div class="lib-amount">${fmt(d.totalTtc, d.currency)}</div>
        <div class="lib-actions">
          <button class="btn btn-outline" data-load="${d.id}">Charger</button>
          <button class="btn btn-danger" data-rm="${d.id}">Supprimer</button>
        </div>`;
      host.appendChild(el);
    });
  }

  // Actions de la bibliothèque (délégation)
  document.addEventListener("click", (e) => {
    const loadBtn = e.target.closest("[data-load]");
    if (loadBtn) {
      if (loadDoc(loadBtn.dataset.load)) {
        $("#libraryOverlay").classList.add("hidden");
        flashNote("Document chargé");
      }
      return;
    }
    const rmBtn = e.target.closest("[data-rm]");
    if (rmBtn) {
      deleteDoc(rmBtn.dataset.rm);
      renderLibrary();
    }
  });

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
    // Champs Premium
    ["dStatus", "dPaidDate", "dIban"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = state[id] || (id === "dStatus" ? "attente" : "");
    });
    const pen = document.getElementById("dPenalty");
    if (pen) pen.checked = state.dPenalty !== false;
  }

  // ============================================================
  //  FONCTIONNALITÉS PREMIUM
  //  Vérification de licence 100 % hors ligne (aucun serveur).
  //  La clé valide un algorithme déterministe : pas de réseau,
  //  aucune donnée transmise.
  // ============================================================

  // Hachage FNV-1a 32 bits (déterministe, hors ligne)
  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // Clés valides : FACT-XXXX-XXXX où fnv1a(partie) % 97 == 0
  function isValidLicense(key) {
    if (typeof key !== "string") return false;
    const m = key.trim().toUpperCase().match(/^FACT-([0-9A-F]{4})-([0-9A-F]{4})$/);
    if (!m) return false;
    return fnv1a(m[1] + "-" + m[2] + "|" + SALT) % 97 === 0;
  }

  function getLicense() {
    try {
      return localStorage.getItem(LICENSE_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function isPro() {
    return isValidLicense(getLicense());
  }

  function setLicense(key) {
    if (isValidLicense(key)) {
      localStorage.setItem(LICENSE_KEY, key.trim().toUpperCase());
      return true;
    }
    return false;
  }

  // Génère une clé valide (utilisé en local pour générer les clés à vendre)
  function generateLicense() {
    const chars = "0123456789ABCDEF";
    for (let attempt = 0; attempt < 20000; attempt++) {
      let p1 = "", p2 = "";
      for (let i = 0; i < 4; i++) {
        p1 += chars[Math.floor(Math.random() * 16)];
        p2 += chars[Math.floor(Math.random() * 16)];
      }
      if (fnv1a(p1 + "-" + p2 + "|" + SALT) % 97 === 0) {
        return "FACT-" + p1 + "-" + p2;
      }
    }
    return null;
  }

  // --------- Bibliothèque de documents ---------
  function loadDocs() {
    try {
      const raw = localStorage.getItem(DOCS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function persistDocs(docs) {
    try {
      localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
      return true;
    } catch (e) {
      return false;
    }
  }

  function snapshotCurrent() {
    const c = compute();
    return {
      id: "doc-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      type: state.docType,
      number: state.dNumber || "—",
      client: state.cName || "(sans client)",
      date: state.dDate,
      totalHt: c.totalHt,
      totalTva: c.totalTva,
      totalTtc: c.totalTtc,
      currency: state.dCurrency,
      status: state.dStatus,
      savedAt: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(state)),
    };
  }

  function saveDocToLibrary() {
    if (!isPro()) return { ok: false, reason: "premium" };
    const docs = loadDocs();
    const snap = snapshotCurrent();
    docs.unshift(snap);
    persistDocs(docs);
    return { ok: true, snap };
  }

  function deleteDoc(id) {
    persistDocs(loadDocs().filter((d) => d.id !== id));
  }

  function loadDoc(id) {
    const doc = loadDocs().find((d) => d.id === id);
    if (!doc || !doc.state) return false;
    state = Object.assign(defaultState(), doc.state);
    if (!Array.isArray(state.items) || !state.items.length) state.items = [blankItem()];
    hydrateForm();
    renderItems();
    refresh();
    return true;
  }

  // --------- Numérotation automatique ---------
  // Trouve le prochain numéro libre pour un type donné.
  function nextNumber(type) {
    const prefix = type === "facture" ? "FA" : "DV";
    const year = new Date().getFullYear();
    const used = new Set(loadDocs().map((d) => d.number));
    if (state.dNumber) used.add(state.dNumber);

    for (let n = 1; n <= 9999; n++) {
      const candidate = `${prefix}-${year}-${String(n).padStart(3, "0")}`;
      if (!used.has(candidate)) return candidate;
    }
    return `${prefix}-${year}-9999+`;
  }

  // --------- Export comptable CSV ---------
  // Format euro français, virgule décimale, et BOM pour Excel.
  function exportCsv() {
    const docs = loadDocs();
    const rows = [["Numéro", "Type", "Client", "Date", "Statut", "Total HT", "Total TVA", "Total TTC", "Devise"]];
    docs.forEach((d) => {
      rows.push([
        d.number,
        d.type === "facture" ? "Facture" : "Devis",
        d.client,
        d.date || "",
        d.status === "paye" ? "Payé" : d.status === "retard" ? "En retard" : "En attente",
        d.totalHt.toFixed(2).replace(".", ","),
        d.totalTva.toFixed(2).replace(".", ","),
        d.totalTtc.toFixed(2).replace(".", ","),
        d.currency,
      ]);
    });

    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");

    download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }),
      "facturate-export-comptable.csv");
    return csv;
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // --------- Export de la bibliothèque (sauvegarde) ---------
  function exportBackup() {
    const data = { exportedAt: new Date().toISOString(), docs: loadDocs() };
    download(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      "facturate-sauvegarde.json");
    return true;
  }


  load();
  hydrateForm();
  renderItems();
  bindForm();
  applyProState();
  refresh();
})();
