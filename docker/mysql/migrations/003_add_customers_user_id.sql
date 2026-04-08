-- Fix : "Duplicate entry '0' for key 'customers.user_id'" si des lignes existaient déjà dans customers.
-- En dev : on vide les tables liées, puis customers, puis on ajoute user_id.
--
-- À exécuter dans MySQL (Docker) une fois.

SET FOREIGN_KEY_CHECKS = 0;

-- Au besoin, enlever une colonne user_id "cassée" d’un essai précédent :
-- ALTER TABLE customers DROP FOREIGN KEY fk_customers_users;
-- ALTER TABLE customers DROP COLUMN user_id;

TRUNCATE TABLE order_items;
TRUNCATE TABLE payments;
TRUNCATE TABLE orders;
TRUNCATE TABLE customers;

SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE customers ADD COLUMN user_id INT NOT NULL UNIQUE;

ALTER TABLE customers
  ADD CONSTRAINT fk_customers_users FOREIGN KEY (user_id) REFERENCES users(id);
