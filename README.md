# Frontend — projet restaurant (partie 2, EJS)

Projet séparé du **backend** (autre dépôt GitHub), conformément au sujet : interface utilisateur avec **Express** et **EJS**.

## Prérequis

- Node.js **18+** (pour `node --watch` en dev)
- Backend API démarrée si vous testez les appels HTTP (souvent `http://localhost:3002`)

## Installation

```bash
cp .env.example .env
npm install
```

## Lancer le site

```bash
npm run dev
```

Puis ouvrir **http://localhost:3000** (voir `PORT` dans `.env`).

## Structure actuelle (configuration générale)

- `app.js` — serveur Express, moteur EJS, fichiers statiques `public/`
- `views/` — pages et **partials** (`header`, `footer`)
- `views/index.ejs` — page d’accueil + menus de navigation
- `views/login.ejs` — placeholder connexion (à compléter)
- `migrations/`, `docker/mysql/` — scripts SQL de référence (alignés avec la base)

## Travail d’équipe (rappel sujet)

- CRUD minimum par table, validations, authentification / autorisations
- **Deux branches minimum par personne** avec commits et fusions sur GitHub
- Donner accès au dépôt au professeur

## Production

```bash
npm start
```
