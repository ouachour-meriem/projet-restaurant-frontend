# API Restaurant (GP4)

API REST pour gérer un restaurant : utilisateurs / rôles, clients, catalogue, commandes, paiements et favoris (utilisateur ↔ produit).

**GitHub (backend / API) :** https://github.com/ouachour-meriem/projet-restaurant.git

**Frontend (dépôt séparé) :** https://github.com/ouachour-meriem/projet-restaurant-frontend — interface web (EJS / pages) qui consomme cette API. En local : API souvent sur `http://localhost:3002`, CORS activé côté serveur.

## Membres

| Nom | N° |
|-----|-----|
| Baha, Aniss | 2730729 |
| Labiod, Mohamed Riad | 2744366 |
| Lasla, Rayane | 2742252 |
| Ouachour, Meriem | 2726594 |

## Stack

Node.js, Express, Sequelize, MySQL, JWT, bcryptjs, express-validator, Docker (MySQL).

## Lancer le projet

Prérequis : Node.js 18+, Docker (recommandé).

```bash
git clone https://github.com/ouachour-meriem/projet-restaurant.git
cd projet-restaurant
npm install
cp .env.example .env   # Windows : copy .env.example .env
docker compose up -d
npm run dev
```

Adapter `.env` (`DB_*`, `PORT`, `JWT_SECRET`, `DEFAULT_REGISTER_ROLE_ID`, souvent `2` pour le rôle client).  
Test : `GET /` et `GET /health/db`. Sans Docker : MySQL + scripts dans `docker/mysql/init/`, ou `npm run seed:roles`.

## Structure

`config/`, `controllers/`, `middleware/`, `models/` (relations dans `associations.js`), `routes/`, `validators/`, `docker/mysql/init/`, `server.js`.

## Routes utiles

`/auth` (register, login, me), `/users`, `/roles`, `/customers`, `/categories`, `/products`, `/orders`, `/order-items`, `/payments`. Détail : fichiers dans `routes/`.

## Comptes de test

Pas d’utilisateur en base au départ ; rôles typiques : `role_id` **1** = admin, **2** = client.  
`POST /auth/register` avec `name`, `email`, `password`, `role_id`, puis `POST /auth/login` pour le token (`Authorization: Bearer …`).
