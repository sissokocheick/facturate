# Facturate — Générateur de factures & devis gratuits

Application 100 % statique (HTML/CSS/JS, aucune dépendance, aucun backend).
Crée des factures et devis professionnels conformes à la législation française,
avec export PDF intégré (impression navigateur). Aucune inscription, aucune donnée
envoyée sur un serveur : tout reste dans le navigateur.

## Démarrage rapide

```bash
# Tester en local (nécessite Node.js 18+)
node scripts/serve.mjs 5173
# → http://127.0.0.1:5173/
```

Pour tester sans serveur, il suffit d'ouvrir `index.html` dans un navigateur.

## Lancer les tests

Les tests sont une page HTML qui charge l'application dans un iframe et pilote
le DOM. Avec un navigateur Chromium/Brave headless :

```bash
# 1. Démarrer le serveur
node scripts/serve.mjs 5173 &
# 2. Exécuter la suite
brave --headless=new --disable-gpu --no-sandbox \
      --virtual-time-budget=8000 \
      --dump-dom http://127.0.0.1:5173/tests/app.test.html | grep -E 'PASS|FAIL'
```

Tous les tests doivent afficher `PASS`. Couverture actuelle :

- Calculs HT / TVA / TTC (taux 20 %, 10 %, 5,5 %, par ligne et par défaut)
- Ajout / suppression de lignes
- Bascule facture ↔ devis
- Mentions légales micro-entreprise (art. 293 B du CGI)
- Sauvegarde automatique (localStorage) et réinitialisation
- Formatage multidevise
- **Premium** : activation de licence (clés valides/rejetées), suivi de paiement,
  tampon « PAYÉE », numérotation automatique, bibliothèque de documents,
  export comptable CSV (BOM, séparateur `;`, guillemets), sauvegarde JSON

## Fonctionnalités Premium

Réservées à une licence, validées **100 % hors ligne** (aucun appel réseau) :

| Fonction | Description |
|---|---|
| Suivi de paiement | Statut (attente / payée / retard), date de règlement, tampon « PAYÉE » |
| Numérotation auto | Prochain numéro libre de la forme `FA-2026-003` |
| Bibliothèque | Enregistre et recharge plusieurs documents |
| Export comptable | CSV (Excel FR : `;`, virgule décimale, BOM UTF-8) |
| Sauvegarde | Export JSON complet de la bibliothèque |
| Pénalité de retard | Mention indemnité forfaitaire de 40 € (art. L441-10 c. com.) |

### Générer des clés à vendre

```bash
node scripts/gen-license.mjs 20 > cles-a-vendre.txt
```

Les clés respectent le format `FACT-XXXX-XXXX`. L'algorithme (FNV-1a + sel,
modulo 97) est le même que celui que le navigateur vérifie, donc une clé
générée ici fonctionne toujours chez l'utilisateur — c'est testé
(`tests/license.test.html`). Chaque clé est auto-vérifiée à la génération.
Le fichier `cles-a-vendre.txt` est dans `.gitignore` : **ne jamais le commité**,
les clés seraient publiques. Voir `docs/deploiement.md` pour les charger dans
Gumroad, qui les livre automatiquement par e-mail après chaque achat.

## Architecture

```
index.html          Landing page (présentation + tarifs)
app.html            Formulaire + conteneur d'aperçu
merci.html          Page post-achat : activation de la licence
css/style.css       Styles + règles d'impression A4 (@media print)
js/app.js           État, calculs, rendu de l'aperçu, persistance
scripts/serve.mjs   Serveur statique de développement
scripts/gen-license.mjs  Génère les clés à vendre (jamais commité)
cles-a-vendre.txt   Lot de clés pour Gumroad (jamais commité)
.github/workflows/pages.yml  Déploiement GitHub Pages
tests/              Suites de tests d'interaction
docs/monetisation.md     Les 5 façons de gagner de l'argent
docs/deploiement.md      Mise en ligne + paramétrage Gumroad
```

Points notables du `js/app.js` :

- **Aucune fuite de données** : pas d'appel réseau, `localStorage` uniquement.
- **Préview live** : l'aperçu A4 est régénéré à chaque frappe.
- **TVA par ligne** : chaque ligne peut avoir son propre taux, sinon elle hérite
  du taux par défaut du document.
- **Export PDF** : `window.print()` + règles `@media print` qui masquent
  l'interface pour n'imprimer que la feuille A4. Aucune librairie externe.

## Mentions légales françaises

L'aperçu intègre automatiquement :

- SIRET de l'émetteur
- Pour les micro-entreprises : « Dispensé d'immatriculation au RCS et au RM,
  TVA non applicable, art. 293 B du CGI »
- Numéro de TVA intracommunautaire (facultatif)

> **Attention** : ce modèle est une aide, pas un conseil juridique ou comptable.
> Vérifie les obligations propres à ton activité (assurance professionnelle,
> mentions obligatoires spécifiques, etc.).
