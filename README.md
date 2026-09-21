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

## Architecture

```
index.html          Formulaire + conteneur d'aperçu
css/style.css       Styles + règles d'impression A4 (@media print)
js/app.js           État, calculs, rendu de l'aperçu, persistance
scripts/serve.mjs   Serveur statique de développement
tests/app.test.html Suite de tests d'interaction
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
