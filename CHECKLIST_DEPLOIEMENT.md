# Checklist de déploiement — Matteo Lemesre

Suivre ces étapes dans l'ordre pour mettre le site en production.

---

## Étape 1 — Préparer Supabase

### 1.1 Créer le projet
- [ ] Créer un compte sur [supabase.com](https://supabase.com)
- [ ] Nouveau projet : choisir une région proche (Europe West)
- [ ] Noter l'**URL** et la **clé anon** dans *Project Settings → API*

### 1.2 Créer les tables
- [ ] Ouvrir **SQL Editor** dans Supabase
- [ ] Exécuter le SQL suivant pour créer toutes les tables :

```sql
-- Table profils (liée à auth.users via trigger)
CREATE TABLE profils (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prenom text,
  email text,
  classe text CHECK (classe IN ('seconde','premiere','terminale','mpsi','mp')),
  role text DEFAULT 'eleve' CHECK (role IN ('eleve','admin')),
  created_at timestamptz DEFAULT now()
);

-- Trigger : crée automatiquement un profil à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profils (id, email, prenom, classe)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'prenom',
    NEW.raw_user_meta_data->>'classe'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Table cours
CREATE TABLE cours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  slug text UNIQUE NOT NULL,
  classe text NOT NULL,
  theme text,
  ordre int DEFAULT 1,
  cours_pdf_url text,
  fiche_pdf_url text,
  est_publie boolean DEFAULT false,
  est_demo boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Table blocs (contenu d'un cours)
CREATE TABLE blocs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cours_id uuid REFERENCES cours(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('definition','theoreme','propriete','remarque')),
  titre text,
  enonce text,
  conseil text,
  ordre int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Table exercices
CREATE TABLE exercices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cours_id uuid REFERENCES cours(id) ON DELETE CASCADE,
  enonce text,
  correction text,
  difficulte int DEFAULT 1 CHECK (difficulte BETWEEN 1 AND 3),
  ordre int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Table progression (une ligne par user × cours)
CREATE TABLE progression (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  cours_id uuid REFERENCES cours(id) ON DELETE CASCADE,
  cours_lu boolean DEFAULT false,
  cours_lu_at timestamptz,
  td_fait boolean DEFAULT false,
  td_fait_at timestamptz,
  UNIQUE (user_id, cours_id)
);

-- Table events (tracking)
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  cours_id uuid REFERENCES cours(id) ON DELETE SET NULL,
  type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table sujets (annales)
CREATE TABLE sujets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  slug text UNIQUE NOT NULL,
  type text CHECK (type IN ('bac','concours')),
  concours text,
  classe text,
  annee int,
  themes text[],
  sujet_pdf_url text,
  corrige_pdf_url text,
  est_publie boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Table chat_usage (limite chatbot)
CREATE TABLE chat_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date DEFAULT CURRENT_DATE,
  count int DEFAULT 0,
  UNIQUE (user_id, date)
);
```

### 1.3 Activer RLS et créer les politiques
- [ ] Exécuter le SQL suivant pour sécuriser toutes les tables :

```sql
-- RLS sur toutes les tables
ALTER TABLE profils    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cours      ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sujets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;

-- Profils : lecture/écriture de son propre profil
CREATE POLICY "profils_own" ON profils FOR ALL USING (auth.uid() = id);

-- Cours : lecture si publié ou si admin
CREATE POLICY "cours_read" ON cours FOR SELECT USING (
  est_publie = true OR
  EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "cours_admin" ON cours FOR ALL USING (
  EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin')
);

-- Blocs : lecture si cours publié, écriture si admin
CREATE POLICY "blocs_read" ON blocs FOR SELECT USING (
  EXISTS (SELECT 1 FROM cours WHERE cours.id = blocs.cours_id AND cours.est_publie = true) OR
  EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "blocs_admin" ON blocs FOR ALL USING (
  EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin')
);

-- Exercices : même logique que blocs
CREATE POLICY "exercices_read" ON exercices FOR SELECT USING (
  EXISTS (SELECT 1 FROM cours WHERE cours.id = exercices.cours_id AND cours.est_publie = true) OR
  EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "exercices_admin" ON exercices FOR ALL USING (
  EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin')
);

-- Progression : lecture/écriture de sa propre progression + admin
CREATE POLICY "progression_own" ON progression FOR ALL USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin')
);

-- Events : insertion + lecture de ses propres events + admin lit tout
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "events_own"    ON events FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin')
);

-- Sujets : lecture si publié ou admin
CREATE POLICY "sujets_read" ON sujets FOR SELECT USING (
  est_publie = true OR
  EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "sujets_admin" ON sujets FOR ALL USING (
  EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin')
);

-- Chat usage : son propre
CREATE POLICY "chat_own" ON chat_usage FOR ALL USING (auth.uid() = user_id);
```

### 1.4 Créer les Storage buckets
- [ ] Dans **Storage → New bucket** : créer `cours-pdf`
  - Public : **oui**
- [ ] Dans **Storage → New bucket** : créer `annales-pdf`
  - Public : **oui**

### 1.5 Configurer l'auth
- [ ] Dans **Authentication → URL Configuration** :
  - Site URL : `https://votre-domaine.vercel.app`
  - Redirect URLs : ajouter `https://votre-domaine.vercel.app/**`
- [ ] Dans **Authentication → Email Templates** :
  - Vérifier que les emails de réinitialisation redirigent bien vers `/nouveau-mdp`
  - Modifier le lien dans le template "Reset Password" :
    ```
    {{ .SiteURL }}/nouveau-mdp?token_hash={{ .TokenHash }}&type=recovery
    ```

---

## Étape 2 — Configurer le projet local

- [ ] Ouvrir `js/supabase.js` et remplacer les valeurs :
  ```js
  const SUPABASE_URL     = 'https://VOTRE_ID.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJxxx...'
  ```
- [ ] Vérifier que `.gitignore` est bien présent (ne pas committer de secrets)

---

## Étape 3 — Push GitHub

```bash
git add .
git commit -m "Initial deployment — Phase 1-5 complètes"
git push origin main
```

- [ ] Push effectué
- [ ] Vérifier sur GitHub que tous les fichiers sont bien présents

---

## Étape 4 — Connecter Vercel

- [ ] Créer un compte sur [vercel.com](https://vercel.com)
- [ ] **Add New → Project** → importer le repo GitHub
- [ ] Framework Preset : **Other**
- [ ] Root Directory : `/` (racine)
- [ ] Cliquer **Deploy**
- [ ] Attendre le build (< 1 min pour un site statique)
- [ ] Vérifier l'URL de déploiement générée (ex: `https://cours-maths-xyz.vercel.app`)

---

## Étape 5 — Variables d'environnement sur Vercel

*(Utiles uniquement pour les futures Edge Functions api/)*

- [ ] Dans **Project → Settings → Environment Variables** :

| Nom | Valeur |
|-----|--------|
| `SUPABASE_URL` | `https://VOTRE_ID.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJxxx...` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` *(plus tard, chatbot)* |

---

## Étape 6 — Test du flow complet

- [ ] Ouvrir `https://votre-domaine.vercel.app`
- [ ] Vérifier l'affichage de la page d'accueil (hero, grille des 5 classes)
- [ ] Cliquer sur "S'inscrire" → créer un compte test
- [ ] Vérifier la réception de l'email de confirmation Supabase
- [ ] Se connecter → vérifier la redirection vers `/cours/seconde`
- [ ] Aller sur `/profil` → vérifier l'affichage
- [ ] Aller sur `/annales` → vérifier le chargement (vide au départ)
- [ ] Aller sur `/recherche` → taper quelque chose → vérifier Fuse.js
- [ ] Vérifier le switch light/dark (bouton ☽/☀ dans la navbar)
- [ ] Vérifier la bulle chatbot (clic → "Bientôt disponible")
- [ ] Vérifier que `/admin` redirige bien vers `/connexion` si non admin

---

## Étape 7 — Passer son compte en admin

- [ ] Dans **Supabase → SQL Editor**, exécuter :
  ```sql
  UPDATE profils SET role = 'admin' WHERE email = 'ton@email.com';
  ```
- [ ] Rafraîchir la page, aller sur `/admin`
- [ ] Vérifier l'affichage du dashboard admin (stats à 0, c'est normal)
- [ ] Vérifier les 5 liens de la sidebar : Dashboard, Cours, Annales, Élèves, Stats

---

## Étape 8 — Uploader le premier cours de test

- [ ] Aller sur `/admin/cours` → **+ Nouveau chapitre**
- [ ] Remplir :
  - Titre : `Fonctions affines`
  - Classe : `Seconde`
  - Thème : `Algèbre`
  - Ordre : `1`
  - ☑ Accès démo (pour test sans compte)
- [ ] Cliquer **Publier**
- [ ] Sur la page cours, cliquer **Éditer** → onglet "Cours — blocs"
- [ ] Ajouter un bloc Définition avec un exemple LaTeX : `$f(x) = ax + b$`
- [ ] Onglet "TD — exercices" → ajouter un exercice
- [ ] Vérifier sur `/cours/seconde` (connecté) : le chapitre apparaît
- [ ] Vérifier en navigation privée (non connecté) : mode démo visible

---

## Vérifications finales

- [ ] La grille des classes affiche bien le nb de chapitres depuis Supabase
- [ ] La page `/cours/seconde/fonctions-affines` s'affiche avec KaTeX
- [ ] Le bouton "Marquer comme lu" enregistre la progression en BDD
- [ ] La sidebar chapitre affiche le point bleu après marquage comme lu
- [ ] Les events sont bien enregistrés (vérifier table `events` dans Supabase)
- [ ] Le panel `/admin/stats` affiche les graphiques Chart.js
- [ ] Le panel `/admin/eleves` liste le compte test avec sa progression

---

## Domaine personnalisé (optionnel)

- [ ] Dans **Vercel → Project → Settings → Domains**
- [ ] Ajouter votre domaine (ex: `cours.matteolemesre.fr`)
- [ ] Suivre les instructions DNS (CNAME ou A record)
- [ ] Mettre à jour **Supabase → Auth → URL Configuration** avec le nouveau domaine
- [ ] Mettre à jour le Redirect URL dans Supabase

---

*Checklist générée le 20 avril 2026 — Site Matteo Lemesre*
