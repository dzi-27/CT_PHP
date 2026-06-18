-- =============================================================
-- SCHEMA SQL — Réseau Social PHP/AJAX
-- L2 IRT ESGIS Cotonou
-- À importer dans phpMyAdmin ou via :
-- mysql -u root -p reseau_social < schema.sql
-- =============================================================

CREATE DATABASE IF NOT EXISTS reseau_social
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE reseau_social;

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  prenom        VARCHAR(50)  NOT NULL,
  nom           VARCHAR(50)  NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  avatar        VARCHAR(255) DEFAULT 'assets/images/default-avatar.png',
  bio           TEXT         DEFAULT NULL,
  role          ENUM('user','moderator','admin') DEFAULT 'user',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── SESSIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          NOT NULL,
  token         VARCHAR(64)  NOT NULL UNIQUE,
  expires_at    DATETIME     NOT NULL,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── POSTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          NOT NULL,
  description   TEXT         NOT NULL,
  image         VARCHAR(255) DEFAULT NULL,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── LIKES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          NOT NULL,
  post_id       INT          NOT NULL,
  type          ENUM('like','dislike') NOT NULL,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_vote (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── COMMENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          NOT NULL,
  post_id       INT          NOT NULL,
  contenu       TEXT         NOT NULL,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── FRIENDSHIPS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  sender_id     INT          NOT NULL,
  receiver_id   INT          NOT NULL,
  status        ENUM('pending','accepted') DEFAULT 'pending',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_friendship (sender_id, receiver_id),
  FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── MESSAGES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  sender_id     INT          NOT NULL,
  receiver_id   INT          NOT NULL,
  contenu       TEXT         DEFAULT NULL,
  image         VARCHAR(255) DEFAULT NULL,
  type          ENUM('text','image') DEFAULT 'text',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── PASSWORD RESET TOKENS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          NOT NULL,
  token         VARCHAR(64)  NOT NULL UNIQUE,
  expires_at    DATETIME     NOT NULL,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── COMPTE ADMIN PAR DÉFAUT ─────────────────────────────────
-- Mot de passe : Admin1234! (à changer après connexion)
INSERT INTO users (prenom, nom, email, password, role)
VALUES (
  'Super', 'Admin',
  'admin@reseau-social.com',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin'
);

SELECT 'Schema importe avec succes !' AS message;
