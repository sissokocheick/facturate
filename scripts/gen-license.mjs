#!/usr/bin/env node
/**
 * Générateur de licences Facturate.
 *
 * Les clés suivent le même algorithme que celui vérifié dans js/app.js :
 *   FACT-XXXX-XXXX  où  fnv1a("XXXX-XXXX|frct-2026") % 97 === 0
 *
 * Tout est hors ligne : aucune clé n'est consultée chez un tiers, et la
 * validation dans le navigateur ne fait jamais d'appel réseau.
 *
 * Usage :
 *   node scripts/gen-license.mjs              -> 1 clé
 *   node scripts/gen-license.mjs 10           -> 10 clés
 *   node scripts/gen-license.mjs 10 > cles.txt
 */

const SALT = "frct-2026";

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function isValid(key) {
  const m = String(key).toUpperCase().match(/^FACT-([0-9A-F]{4})-([0-9A-F]{4})$/);
  if (!m) return false;
  return fnv1a(m[1] + "-" + m[2] + "|" + SALT) % 97 === 0;
}

function generate() {
  const chars = "0123456789ABCDEF";
  for (let attempt = 0; attempt < 200000; attempt++) {
    let p1 = "", p2 = "";
    for (let i = 0; i < 4; i++) {
      p1 += chars[Math.floor(Math.random() * 16)];
      p2 += chars[Math.floor(Math.random() * 16)];
    }
    const key = "FACT-" + p1 + "-" + p2;
    if (isValid(key)) return key;
  }
  throw new Error("Aucune clé trouvée (improbable)");
}

function main() {
  const count = Math.min(Number(process.argv[2]) || 1, 1000);
  const keys = new Set();
  while (keys.size < count) keys.add(generate());

  for (const k of keys) console.log(k);

  // Auto-vérification : toute clé générée doit être valide.
  for (const k of keys) {
    if (!isValid(k)) {
      console.error("ERREUR : clé invalide générée -> " + k);
      process.exit(1);
    }
  }
  process.stderr.write(`${count} clé(s) générée(s), toutes vérifiées valides.\n`);
}

main();
