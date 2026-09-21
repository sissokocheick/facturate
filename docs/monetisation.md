# Plan monétisation Facturate

> **Lecture obligatoire avant de penser « argent ».**
> Ce document est la partie qui transforme du code en revenu. Le code est fini.
> La suite demande des actions humaines que personne ne peut faire à ta place.

---

## 0. La vérité sur les « revenus automatiques »

Il n'existe **aucun** système où de l'argent arrive sans :

1. un compte de paiement **à ton nom** (vérification d'identité obligatoire),
2. un produit ou une audience,
3. du trafic (des gens qui voient le produit).

Ce que j'ai construit couvre le point 2. Les points 1 et 3 te reviennent.
C'est la loi, pas un choix d'outil. Tout ce qui promet le contraire est une arnaque.

**Ton action humaine obligatoire : ~30 minutes une seule fois.**
Tout le reste est documenté ci-dessous, exécutable étape par étape.

---

## 1. Hébergement gratuit (0 €)

L'application est statique, donc aucun serveur à payer.

| Plateforme | Coût | Domaine obtenu |
|---|---|---|
| **GitHub Pages** | 0 € | `tonpseudo.github.io/facturate` |
| **Netlify** | 0 € | `xxx.netlify.app` (+ nom de domaine offert la 1re année) |
| **Vercel** | 0 € | `xxx.vercel.app` |

Méthode la plus simple (GitHub Pages) :

```bash
git init && git add . && git commit -m "Facturate : version initiale"
# Crée un dépôt public sur github.com, puis :
git remote add origin https://github.com/TON-PSEUDO/facturate.git
git push -u origin main
# Settings → Pages → Source : branche "main" / dossier "root"
# En ligne en ~2 min.
```

---

## 2. Les 5 façons de gagner de l'argent avec cet outil

Classées par effort / rapidité de retour.

### A. Freemium — le plus durable
Garder la facture simple gratuite. Metre derrière un paiement unique (Stripe,
15-29 €) les fonctionnalités utiles aux pros :

- Numérotation automatique des factures
- Suivi des paiements + relances
- Export comptable (CSV / FEC)
- Charte graphique personnalisée (logo, couleurs)
- Factures récurrentes

**Code à ajouter** : une page `/merci` + un lien de paiement Stripe.
Stripe prend ~1,4 % + 0,25 € par transaction, sans abonnement.

### B. Affiliation comptable — le plus rapide
Recommander des outils qui paient pour chaque client amené :

- **Tiime**, **Freebe**, **Dougs**, **Shine** (comptabilité / pro)
- **Mailchimp**, **Notion**, **Zoho**

Intégration : encart « Gère ta comptabilité sans effort » dans le pied de page
et la page de remerciement après impression. CPA de 20 € à 100 € par inscription.

### C. Régie publicitaire — le plus passif
**Google AdSense** (validation manuelle du site, ~1 000 visiteurs/mois minimum
réaliste) ou **Ezoic**. Recommandé seulement à partir de ~5 000 vues/mois,
sinon le retour est négligeable (< 5 €).

### D. Vente du code aux non-technos
Le même produit, conditionné pour ceux qui veulent leur propre outil sans le
coder :

- **Gumroad** / **Lemon Squeezy** : « Script de générateur de factures » à 19-49 €
- **Fiverr** : installer et personnaliser l'outil pour 30-80 € la prestation

### E. Prestation service — le cash le plus rapide
C'est **ça** qui rapporte vite, pas le SaaS. Tu vends sur **Malt, Upwork, Fiverr** :

- « Je crée votre générateur de factures brandé »
- « Je facture vos devis, je les mets au format pro »

Le code est déjà fait → ta prestation coûte 1 h de personnalisation.
Prix constaté sur ces plateformes : 40-150 € par mission.

---

## 3. Comment obtenir du trafic (sans payer)

L'outil ne sert à rien si personne n'en entend parler. Ordre d'efficacité :

1. **Référencement** — c'est un site statique rapide, donc Google l'aime.
   Cibler : « générateur de facture gratuit », « faire un devis auto-entrepreneur ».
   Concurrence forte, mais le prix (0 €) est un argument qui marche.
2. **Reddit / forums** — r/Entreprise, r/autoentrepreneur, forums France
   INDEPENDANT, Coworkers. Présenter l'outil comme un partage, pas une pub.
3. **Groupes WhatsApp/Telegram** d'auto-entrepreneurs.
4. **ProductHunt** — bon pic de trafic au lancement.
5. **Site de livres blancs** : poster sur free-ebooks.fr, etc.

Délai réaliste avant les premiers visiteurs : **1 à 4 semaines**.

---

## 4. Chronologie réaliste des revenus

| Période | Ce qui se passe | Revenu attendu |
|---|---|---|
| Jour 1 | Mise en ligne, comptes créés | **0 €** |
| Semaines 1-2 | Premiers visiteurs, bouche-à-oreille | **0 - 10 €** |
| Mois 1 | Trafic + premières conversions affiliation | **10 - 80 €** |
| Mois 3 | SEO qui démarre + premimum qui se vend | **80 - 400 €** |
| Mois 6+ | Effet cumulé, presta en parallèle | **300 - 1 000 €+** |

Ce sont des **ordres de grandeur**, pas des promesses. La quasi-totalité des
projets qui échouent le font parce que leur créateur s'arrête au mois 1,
quand le compteur est encore à 0.

---

## 5. Ce qui ne se fait pas

- Ne pas payer un « coach business » pour vendre ce produit.
- Ne pas acheter de followers ni de trafic bot.
- Ne pas investir en publicité avant de savoir que le produit plaît
  (sinon tu brûles du cash pour rien).
- Ne pas copier les CGU d'un autre outil : rédige les tiennes ou fais valider.

---

## 6. Ton plan d'action immédiat (ordre strict)

1. **Créer un compte GitHub** (gratuit, 5 min) → `github.com/join`
2. **Mettre le site en ligne** (commandes section 1, 10 min)
3. **Créer un compte Stripe** (vérif d'identité, 30 min)
4. **Brancher un lien de paiement** sur une page premium
5. **Créer un compte Gumroad** comme alternative sans abonnement
6. **Poster l'outil** sur un forum d'auto-entrepreneurs
7. Revenir chaque semaine regarder les chiffres et itérer

**Au total : 45 minutes de travail humain, une seule fois.**
Après, je peux t'aider à écrire les prochains morceaux de code
(premium, tracking, SEO) à chaque étape.
