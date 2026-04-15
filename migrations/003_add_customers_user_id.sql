
ALTER TABLE customers
  ADD COLUMN user_id INT NULL;

ALTER TABLE customers
  ADD CONSTRAINT uq_customers_user_id UNIQUE (user_id);

ALTER TABLE customers
  ADD CONSTRAINT fk_customers_users
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
