ALTER TABLE users
  ADD CONSTRAINT fk_users_roles FOREIGN KEY (role_id) REFERENCES roles(id);

ALTER TABLE customers
  ADD CONSTRAINT fk_customers_users FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE products
  ADD CONSTRAINT fk_products_categories FOREIGN KEY (category_id) REFERENCES categories(id);

ALTER TABLE orders
  ADD CONSTRAINT fk_orders_customers FOREIGN KEY (customer_id) REFERENCES customers(id);

ALTER TABLE order_items
  ADD CONSTRAINT fk_order_items_orders FOREIGN KEY (order_id) REFERENCES orders(id),
  ADD CONSTRAINT fk_order_items_products FOREIGN KEY (product_id) REFERENCES products(id);

ALTER TABLE payments
  ADD CONSTRAINT fk_payments_orders FOREIGN KEY (order_id) REFERENCES orders(id);

ALTER TABLE customer_favorites
  ADD CONSTRAINT fk_customer_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_customer_favorites_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
