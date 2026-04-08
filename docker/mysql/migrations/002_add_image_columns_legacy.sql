-- Bases créées avec un ancien schéma : ajoute les colonnes attendues par Sequelize (GET /categories, /products, etc.)
-- Exécuter depuis MySQL ou : docker compose exec mysql mysql -u ... -p ... restaurant_db < ce_fichier
--
-- Si une ligne renvoie "Duplicate column name", cette colonne existe déjà : commentez-la ou ignorez l'erreur.

ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512) NULL;
ALTER TABLE customers ADD COLUMN image_url VARCHAR(512) NULL;
ALTER TABLE categories ADD COLUMN image_url VARCHAR(512) NULL;
ALTER TABLE products ADD COLUMN image_url VARCHAR(512) NULL;
