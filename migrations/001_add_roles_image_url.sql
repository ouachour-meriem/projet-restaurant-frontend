-- Image optionnelle pour un rôle (affichage UI, etc.)
ALTER TABLE roles
  ADD COLUMN image_url VARCHAR(500) NULL;
