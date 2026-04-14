CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url VARCHAR(500) NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  CONSTRAINT fk_users_roles FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(150),
  user_id INT NULL,
  CONSTRAINT uq_customers_user_id UNIQUE (user_id),
  CONSTRAINT fk_customers_users FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url VARCHAR(500) NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL,
  category_id INT NOT NULL,
  image_url VARCHAR(500) NULL,
  CONSTRAINT fk_products_categories FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_date DATETIME NOT NULL,
  status VARCHAR(50) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  customer_id INT NOT NULL,
  CONSTRAINT fk_orders_customers FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  CONSTRAINT fk_order_items_orders FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_items_products FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL,
  CONSTRAINT fk_payments_orders FOREIGN KEY (order_id) REFERENCES orders(id)
);

INSERT INTO roles (name, description)
SELECT 'admin', 'Administrateur'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE name = 'admin'
);

INSERT INTO roles (name, description)
SELECT 'client', 'Client standard'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE name = 'client'
);
