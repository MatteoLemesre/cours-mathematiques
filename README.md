# Site de cours de maths — Matteo Lemesre

Site web de cours de mathématiques lycée (Seconde, Première, Terminale) et prépa (MPSI, MP).
Les élèves s'inscrivent, suivent leur progression, consultent les cours et font les exercices.
Un panel admin permet de tout gérer depuis le navigateur.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML / CSS / JS vanilla — zéro framework |
| Backend / BDD | [Supabase](https://supabase.com) (Auth + PostgreSQL + Storage) |
| Rendu maths | [KaTeX](https://katex.org) (CDN) |
| Recherche | [Fuse.js](https://fusejs.io) (CDN) |
| Graphiques admin | [Chart.js](https://chartjs.org) (CDN) |
| Hébergement | [Vercel](https://vercel.com) |
| Déploiement | GitHub → Vercel (auto sur push `main`) |

---

## Structure des dossiers

```
/
├── index.html               ← Accueil + sélection classe + démo
├── classe.html              ← Index chapitres d'une classe
├── chapitre.html            ← Cours (PDF + blocs KaTeX) / TD / Fiche
├── annales.html             ← Liste des annales avec filtres
├── annale.html              ← Un sujet PDF + corrigé PDF
├── recherche.html           ← Moteur de recherche Fuse.js
├── connexion.html           ← Login Supabase
├── inscription.html         ← Inscription + choix classe
├── reinitialiser.html       ← Mot de passe oublié
├── nouveau-mdp.html         ← Reset MDP (lien email Supabase)
├── profil.html              ← Profil élève + progression + historique
│
├── admin/
│   ├── index.html           ← Dashboard (stats + chiffres clés)
│   ├── cours.html           ← Liste des cours par classe
│   ├── chapitre.html        ← Édition chapitre (infos + PDF + blocs + exos)
│   ├── annales.html         ← Gestion sujets d'annales
│   ├── eleves.html          ← Suivi élèves + progression
│   └── stats.html           ← Statistiques (Chart.js)
│
├── css/
│   └── style.css            ← Design system complet (variables, light/dark, composants)
│
├── js/
│   ├── supabase.js          ← Config + client Supabase (⚠ à remplir avant déploiement)
│   ├── auth.js              ← Guard pages protégées élèves
│   ├── admin-guard.js       ← Guard pages /admin/* (vérifie role = 'admin')
│   ├── theme.js             ← Switch light/dark (localStorage)
│   └── chatbot.js           ← Bulle flottante (UI en place, non fonctionnel)
│
├── api/
│   └── chat.js              ← Vercel Edge Function chatbot (TODO Phase 5)
│
├── vercel.json              ← Rewrites URL propres + headers sécurité
├── .gitignore
└── README.md
```

---

## Tables Supabase

| Table | Description |
|-------|-------------|
| `profils` | id (uuid), prenom, email, classe, role (eleve/admin), created_at |
| `cours` | id, titre, slug, classe, theme, ordre, cours_pdf_url, fiche_pdf_url, est_publie, est_demo |
| `blocs` | id, cours_id, type (definition/theoreme/propriete/remarque), titre, enonce, conseil, ordre |
| `exercices` | id, cours_id, enonce, correction, difficulte (1-3), ordre |
| `progression` | id, user_id, cours_id, cours_lu, cours_lu_at, td_fait, td_fait_at |
| `events` | id, user_id, cours_id, type, created_at |
| `sujets` | id, titre, slug, type, concours, classe, annee, themes[], sujet_pdf_url, corrige_pdf_url, est_publie |
| `chat_usage` | id, user_id, date, count |

**Types d'events :** `cours_vue`, `cours_dl`, `td_vue`, `corrige_vue`, `fiche_vue`, `fiche_dl`, `annale_vue`, `annale_sujet_dl`, `annale_corrige_dl`

**Storage buckets :** `cours-pdf` (lecture publique) · `annales-pdf` (lecture publique)

---

## Instructions de déploiement

### 1. Créer le projet Supabase

1. Créer un compte sur [supabase.com](https://supabase.com) et créer un nouveau projet
2. Dans **SQL Editor**, exécuter le contenu de `supabase_tables.sql` pour créer toutes les tables et les politiques RLS
3. Dans **Storage**, créer deux buckets publics : `cours-pdf` et `annales-pdf`
4. Dans **Authentication → URL Configuration**, ajouter votre domaine Vercel en Redirect URL :
   ```
   https://votre-domaine.vercel.app/**
   ```

### 2. Configurer les clés dans `js/supabase.js`

Remplacer les valeurs dans `js/supabase.js` :

```js
const SUPABASE_URL     = 'https://VOTRE_ID.supabase.co'
const SUPABASE_ANON_KEY = 'eyJxxx...'  // clé anon publique depuis Project Settings → API
```

> **Note :** La clé `anon` est publique par nature — le RLS Supabase protège les données.
> Ne commitez jamais la clé `service_role`.

### 3. Push sur GitHub

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

### 4. Connecter Vercel

1. Créer un compte sur [vercel.com](https://vercel.com)
2. **New Project** → importer le repo GitHub
3. Framework Preset : **Other** (site statique)
4. Cliquer **Deploy** — Vercel détecte `vercel.json` automatiquement

### 5. Variables d'environnement sur Vercel

Aller dans **Project Settings → Environment Variables** et ajouter :

| Nom | Valeur | Usage |
|-----|--------|-------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Référence (la clé est en dur dans JS) |
| `SUPABASE_ANON_KEY` | `eyJxxx...` | Référence |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Chatbot IA (Phase 5, plus tard) |

> Les variables d'env Vercel ne sont utiles que pour les Edge Functions (`api/`).
> Le frontend JS utilise directement les constantes dans `js/supabase.js`.

### 6. Passer son compte en admin

Après s'être inscrit sur le site :

```sql
-- Dans Supabase SQL Editor
UPDATE profils SET role = 'admin' WHERE email = 'ton@email.com';
```

### 7. Premier cours de test

1. Se connecter sur `/connexion`
2. Aller sur `/admin/cours` → **+ Nouveau chapitre**
3. Remplir : titre "Fonctions affines", classe "Seconde", thème "Algèbre", ordre 1
4. Cocher **Accès démo** pour qu'il soit visible sans compte
5. Cliquer **Publier**
6. Aller sur `/cours/seconde` pour vérifier l'affichage élève

---

## URLs du site

| URL | Page |
|-----|------|
| `/` | Accueil |
| `/cours/seconde` | Cours Seconde |
| `/cours/terminale/limites-fonctions` | Chapitre |
| `/annales` | Liste annales |
| `/annales/bac-2023` | Un sujet |
| `/recherche` | Recherche |
| `/profil` | Profil élève |
| `/admin` | Dashboard admin |
| `/admin/cours` | Liste cours admin |
| `/admin/cours/nouveau` | Nouveau chapitre |
| `/admin/cours/:slug` | Édition chapitre |
| `/admin/annales` | Gestion annales |
| `/admin/eleves` | Suivi élèves |
| `/admin/stats` | Statistiques |

---

## Développement local

Comme le site est 100 % statique, n'importe quel serveur HTTP local fonctionne :

```bash
# Option 1 — Python
python3 -m http.server 3000

# Option 2 — Node (npx)
npx serve .

# Option 3 — Vercel CLI (recommandé, respecte les rewrites)
npx vercel dev
```

Ouvrir `http://localhost:3000`.

---

## Licence

Usage privé — © 2026 Matteo Lemesre
