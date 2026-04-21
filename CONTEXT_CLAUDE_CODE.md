# Contexte projet — Site de cours de maths (Matteo Lemesre)

## Description
Site web de cours de mathématiques du lycée (Seconde, Première, Terminale) et prépa (MPSI, MP).
Les élèves s'inscrivent, suivent leur progression, consultent les cours et font les exercices.
Un panel admin permet de tout gérer depuis le site.

---

## Stack technique
- **Frontend** : HTML / CSS / JS pur (vanilla), zéro framework
- **Backend** : Supabase (Auth + PostgreSQL + Storage)
- **Rendu maths** : KaTeX (CDN) — pour les blocs déf/théorèmes et exercices
- **Recherche** : Fuse.js (CDN)
- **Hébergement** : Vercel
- **Déploiement** : GitHub → Vercel (auto)

---

## Design system

### Couleurs
```css
/* Light mode */
--bg:           #F8F8F6;
--surface:      #FFFFFF;
--border:       #E4E4E0;
--text:         #1A1A1A;
--text-muted:   #6B6B6B;
--accent:       #0066FF;
--accent-hover: #0052CC;

/* Dark mode */
--bg:           #141414;
--surface:      #1E1E1E;
--border:       #2A2A2A;
--text:         #EBEBEB;
--text-muted:   #888888;
--accent:       #3385FF;
--accent-hover: #5599FF;
```

### Typographie
- Corps : `Inter` (Google Fonts)
- Code/mono : `JetBrains Mono`
- Maths : KaTeX (ses propres polices)

### Ambiance
- Minimaliste, gris neutre + accent bleu électrique (#0066FF)
- Switch light/dark (préférence sauvegardée en localStorage)
- Quelques animations légères (transitions, fade-in au scroll)
- Pas de frameworks CSS — tout en CSS custom properties

---

## Structure des fichiers

```
/
├── index.html               ← Accueil + démo
├── connexion.html
├── inscription.html
├── reinitialiser.html       ← MDP oublié
├── nouveau-mdp.html         ← Reset MDP (lien email Supabase)
├── profil.html
├── classe.html              ← Index chapitres d'une classe
├── chapitre.html            ← Cours (PDF + blocs) / TD (exos) / Fiche
├── annales.html             ← Liste annales avec filtres
├── annale.html              ← Un sujet (PDF + corrigé)
├── recherche.html
│
├── admin/
│   ├── index.html           ← Dashboard (stats + chiffres clés)
│   ├── cours.html           ← Liste des cours + bouton nouveau
│   ├── chapitre.html        ← Édition d'un chapitre (infos + PDF + blocs + exos)
│   ├── annales.html         ← Upload sujets + corrigés
│   ├── eleves.html          ← Suivi élèves
│   └── stats.html           ← Statistiques détaillées
│
├── css/
│   └── style.css            ← Design system complet
│
├── js/
│   ├── supabase.js          ← Config + client Supabase
│   ├── auth.js              ← Guard pages protégées
│   ├── admin-guard.js       ← Guard pages /admin/*
│   ├── theme.js             ← Switch light/dark
│   └── chatbot.js           ← Bulle flottante (UI en place, non fonctionnel)
│
├── api/
│   └── chat.js              ← Vercel Edge Function (non fonctionnel pour l'instant)
│
└── vercel.json              ← URLs propres + headers sécurité
```

---

## URLs (vercel.json rewrites)

| URL | Fichier |
|-----|---------|
| `/` | `index.html` |
| `/connexion` | `connexion.html` |
| `/inscription` | `inscription.html` |
| `/reinitialiser` | `reinitialiser.html` |
| `/nouveau-mdp` | `nouveau-mdp.html` |
| `/profil` | `profil.html` |
| `/cours/:classe` | `classe.html` |
| `/cours/:classe/:slug` | `chapitre.html` |
| `/annales` | `annales.html` |
| `/annales/:slug` | `annale.html` |
| `/recherche` | `recherche.html` |
| `/admin` | `admin/index.html` |
| `/admin/cours` | `admin/cours.html` |
| `/admin/cours/:slug` | `admin/chapitre.html` |
| `/admin/annales` | `admin/annales.html` |
| `/admin/eleves` | `admin/eleves.html` |
| `/admin/stats` | `admin/stats.html` |

---

## Base de données Supabase

### Tables
- `profils` — id (uuid, lié auth), prenom, email, classe, role (eleve/admin), created_at
- `cours` — id, titre, slug, classe, theme, ordre, cours_pdf_url, fiche_pdf_url, est_publie, est_demo
- `blocs` — id, cours_id, type (definition/theoreme/propriete/remarque), titre, enonce, conseil, ordre
- `exercices` — id, cours_id, enonce, correction, difficulte (1-3), ordre
- `progression` — id, user_id, cours_id, cours_lu, cours_lu_at, td_fait, td_fait_at
- `events` — id, user_id, cours_id, type, created_at
- `sujets` — id, titre, slug, type (bac/concours), concours, classe, annee, themes[], sujet_pdf_url, corrige_pdf_url, est_publie
- `chat_usage` — id, user_id, date, count

### Types d'events
cours_vue, cours_dl, td_vue, corrige_vue, fiche_vue, fiche_dl,
annale_vue, annale_sujet_dl, annale_corrige_dl

### Sécurité
- RLS activé sur toutes les tables
- Chaque élève lit uniquement ses données (profil, progression)
- Blocs et exercices : lecture si cours publié, écriture admin seulement
- Storage buckets : `cours-pdf` et `annales-pdf` (lecture publique, upload admin)

---

## Logique métier

### Page chapitre élève (/cours/:classe/:slug)
3 onglets :
- **Cours** : PDF du cours affiché en iframe + blocs (déf/théorèmes/propriétés/remarques) rendus avec KaTeX en dessous. Chaque bloc a un champ `conseil` affiché en grisé sous l'énoncé.
- **TD** : liste des exercices avec énoncé visible et correction cachée (révélée au clic → event `corrige_vue`)
- **Fiche** : PDF fiche résumé affiché en iframe + bouton télécharger

### Page admin chapitre (/admin/cours/:slug)
Interface en deux colonnes :
- Colonne gauche : infos (titre, classe, thème, ordre, slug) + upload PDF cours + upload PDF fiche
- Colonne droite, deux onglets :
  - **Cours — blocs** : liste de blocs réordonnables (drag & drop), chaque bloc a type/titre/énoncé/conseil. Boutons : + Définition, + Théorème, + Propriété, + Remarque
  - **TD — exercices** : liste d'exercices réordonnables, chaque exo a énoncé + correction côte à côte + difficulté (1-3 points). Bouton + Ajouter un exercice

### Accès démo (sans compte)
- L'élève choisit sa classe sur l'accueil
- Il voit uniquement le cours avec `est_demo = true` (ordre = 1) de sa classe
- Tout le reste → redirect vers `/inscription`

### Guards
```js
// auth.js — toutes les pages sauf index, connexion, inscription
const { data: { session } } = await supabase.auth.getSession()
if (!session) window.location.href = '/connexion'

// admin-guard.js — toutes les pages /admin/*
const { data: profil } = await supabase
  .from('profils').select('role').eq('id', session.user.id).single()
if (profil?.role !== 'admin') window.location.href = '/'
```

### Passer un compte en admin
```sql
UPDATE profils SET role = 'admin' WHERE email = 'ton@email.com';
```

---

## Page profil élève (/profil)
- Section infos : prénom, classe (modifiable), email (confirmation si changé), MDP
- Section progression : barre globale, par thème, dernier cours consulté
- Section historique : 10 derniers cours vus (depuis table events)
- Section sécurité : bouton "déconnecter partout", supprimer compte

---

## Panel admin

- `/admin` — stats clés : nb élèves, actifs 7j/30j, cours les + vus, exos les + consultés
- `/admin/cours` — liste de tous les cours par classe, bouton "Nouveau chapitre"
- `/admin/cours/:slug` — édition complète (voir section "Page admin chapitre" ci-dessus)
- `/admin/annales` — upload sujet PDF + corrigé PDF, infos (titre, type, concours, année, thèmes)
- `/admin/eleves` — liste élèves par classe, progression %, dernière connexion, fiche détail
- `/admin/stats` — graphiques events : cours les + vus, corrections les + consultées, inscriptions

---

## Chatbot IA (non fonctionnel pour l'instant)
- Bulle flottante présente sur toutes les pages (UI seulement, bouton visible)
- `js/chatbot.js` : ouvre une fenêtre chat, affiche "Bientôt disponible" au clic
- `api/chat.js` : fichier vide avec commentaire TODO
- À activer plus tard avec ANTHROPIC_API_KEY sur Vercel

---

## Roadmap de développement

### Phase 1 — Fondations
1. Structure dossiers + tous les fichiers HTML vides (head + nav + footer)
2. `vercel.json` — tous les rewrites + headers sécurité admin
3. `css/style.css` — design system complet (variables, light/dark, composants)
4. `js/supabase.js` — client Supabase
5. `js/theme.js` — switch light/dark

### Phase 2 — Auth
6. `connexion.html` + login Supabase
7. `inscription.html` + choix classe + trigger profil auto
8. `reinitialiser.html` + `nouveau-mdp.html`
9. `profil.html` — 4 sections
10. `js/auth.js` + `js/admin-guard.js`

### Phase 3 — Contenu élève
11. `index.html` — accueil + sélection classe + démo
12. `classe.html` — index chapitres + barre progression
13. `chapitre.html` — 3 onglets (Cours/TD/Fiche) + KaTeX + tracking events
14. `annales.html` — filtres type/classe/année/thème
15. `annale.html` — PDF sujet + PDF corrigé
16. `recherche.html` — Fuse.js sur titres/thèmes

### Phase 4 — Admin
17. `admin/index.html` — dashboard stats
18. `admin/cours.html` — liste cours par classe
19. `admin/chapitre.html` — formulaire complet (infos + PDF + blocs + exos)
20. `admin/annales.html` — upload annales
21. `admin/eleves.html` — suivi élèves
22. `admin/stats.html` — graphiques

### Phase 5 — Chatbot (plus tard)
23. Activer `api/chat.js` avec Claude API
24. Activer `js/chatbot.js` avec streaming + KaTeX
25. Ajouter `ANTHROPIC_API_KEY` sur Vercel

---

## Variables d'environnement (Vercel)
```
SUPABASE_URL      = https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY = eyJxxx...
ANTHROPIC_API_KEY = sk-ant-... (plus tard, pour le chatbot)
```

La clé anon Supabase est publique par nature — le RLS protège les données.
