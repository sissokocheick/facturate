# Déploiement & mise en vente — Facturate

> Mode opératoire concret pour passer du dossier local à un produit qui encaisse
> tout seul. Découpe en étapes courtes. Une seule fois pour les comptes.

---

## Étape 1 — Mettre le site en ligne (GitHub Pages, 0 €)

1. Crée un dépôt public sur https://github.com/new, nomme-le `facturate`.
2. À la racine du dossier `facturate/` :

   ```bash
   git remote add origin https://github.com/VOTRE-PSEUDO/facturate.git
   git branch -M master
   git push -u origin master
   ```

3. Sur GitHub : **Settings → Pages → Build and deployment → Source** =
   **GitHub Actions**. Le workflow `.github/workflows/pages.yml` se déclenche
   tout seul à chaque `push`.
4. ~2 min plus tard, le site est sur `https://VOTRE-PSEUDO.github.io/facturate/`.

**Une fois en ligne, cherche et remplace `VOTRE-PSEUDO`** (4 fichiers) :

   ```bash
   grep -rl "VOTRE-PSEUDO" index.html merci.html sitemap.xml robots.txt
   ```

   Puis commit + push. Les liens canoniques et le sitemap deviennent corrects,
   ce qui compte pour le référencement.

---

## Étape 2 — Vendre la licence Pro (Gumroad, ~15 min)

Gumroad livre les clés **tout seul** : le client paie, Gumroad envoie une clé
par e-mail. Tu n'interviens jamais. C'est ça qui rend le revenu autonome.

1. Crée un compte sur https://gumroad.com (vérification d'identité requise,
   c'est la loi). **C'est ton ~30 minutes humaines obligatoires.**
2. **New product** → type **Digital product**, nomme-le « Facturate Pro ».
3. Prix : **19 €** (paiement unique). Description courte :
   > Licence à vie pour Facturate : suivi des paiements, tampon PAYÉE,
   > numérotation automatique, bibliothèque de documents, export comptable CSV.
   > Livraison immédiate de votre clé par e-mail.
4. Onglet **Content** → **License keys** → **Generate** → choisis
   **custom keys** (clés personnalisées), pas les clés générées par Gumroad :
   les clés doivent respecter ton format `FACT-XXXX-XXXX`.
5. Colle le contenu de `cles-a-vendre.txt` (20 clés). Sauvegarde.
6. Onglet **Settings** → **After purchase** → rediriger vers
   `https://VOTRE-PSEUDO.github.io/facturate/merci.html` (page déjà créée).
7. **Publish**. Récupère le lien `https://gumroad.com/l/facturate-pro`.

**Dans le code**, remplace les 3 occurrences du lien d'achat :

   ```bash
   grep -rn "gumroad.com/l/facturate-pro" index.html app.html
   ```

   (Si tu choisis un autre slug Gumroad, adapte.) Commit + push → le bouton
   « Obtenir la licence Pro » est actif.

> Plus tard, quand les 20 clés seront écoulées, génère un nouveau lot :
> `node scripts/gen-license.mjs 50 > cles-a-vendre.txt` et recharge-les dans
> Gumroad. `cles-a-vendre.txt` est dans `.gitignore` : jamais dans le dépôt.

---

## Étape 3 — Brancher l'affiliation comptable (optionnel, rapide)

Le pied de page de la landing contient déjà un encart « Gère ta comptabilité ».
Remplace le lien Tiime par **ton** lien d'affilié (programmes partenaires de
Tiime, Freebe, Dougs, Shine). CPA de 20 à 100 € par inscription :

- `index.html` → chercher `découvrez Tiime` et remplacer l'URL.

---

## Étape 4 — Premier trafic (la semaine 1)

Le site seul ne rapporte rien. Fais ces actions **une fois chacune** :

1. **Reddit** : r/Entreprise, r/autoentrepreneur — présente l'outil comme un
   partage, pas une pub. Message type : « J'ai codé un générateur de factures
   gratuit pour les auto-entrepreneurs, critiquez-le. »
2. **Product Hunt** : lance le jour où tu as 2-3 h pour répondre aux comments.
3. **Forums** : forum-autoentrepreneur.com, coworker.com.
4. **Fiches** : free-ebooks.fr, annuaires d'outils freelances.

Délai réaliste avant les premiers visiteurs : 1 à 4 semaines. Ne pas se décourager.

---

## Étape 5 — Suivre (chaque semaine, 10 min)

| Indicateur | Où | Fréquence |
|---|---|---|
| Visiteurs | GitHub Insights ou Plausible (gratuit) | hebdo |
| Ventes & clés restantes | Gumroad → Analytics | hebdo |
| Position Google | recherche « générateur de facture gratuit » | mensuel |

Itérer : ce que visitent les gens, pourquoi ils ne paient pas, quelle fonction
ils réclament. C'est ça qui augmente les revenus, pas le code.

---

## Ce qui ne marche pas

- Acheter du trafic bot ou des followers → bannissement + zéro revenu.
- Payer un « coach business » avant d'avoir 1 000 vrais visiteurs.
- Mettre des pubs AdSense avant 5 000 vues/mois → < 5 € et site ralenti.
- S'arrêter au mois 1, quand le compteur affiche encore 0 €. C'est le moment
  où 90 % des projets meurent ; les leurs et le tien.

---

## Sécurité — ce que tu ne commit jamais

- `cles-a-vendre.txt` (déjà dans `.gitignore`).
- Ta clé API Atria ou ton `.env` (voir `../start.bat`).
- Tes identifiants Gumroad / GitHub.

Le dépôt est **public** : tout ce qui est poussé est visible par tout le monde,
y compris l'algorithme de validation des clés. C'est délibéré (validation
100 % hors ligne), mais ça signifie qu'un utilisateur motivé peut générer sa
propre clé. C'est un frein, pas une forteresse. Le prix (19 €) reste moins cher
que l'effort de bidouille — c'est sur ça que repose le modèle.
