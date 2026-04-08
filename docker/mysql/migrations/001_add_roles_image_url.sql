-- Voir commentaire dans le fichier : colonne manquante sur table roles (GET /roles).

ALTER TABLE roles
  ADD COLUMN image_url VARCHAR(512) NULL;
