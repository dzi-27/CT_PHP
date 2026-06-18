#!/bin/bash

# =============================================================
#  SETUP ARBORESCENCE — Réseau Social PHP/AJAX
#  L2 IRT ESGIS Cotonou — Groupe : Sean, Nice, Siska, Divine
#  À exécuter UNE SEULE FOIS à la racine du repo cloné
#  Usage : bash setup_project.sh
# =============================================================

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Setup arborescence — Réseau Social         ║"
echo "║   L2 IRT ESGIS — Groupe Sean/Nice/Siska/Divine║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Couleurs pour les logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ──────────────────────────────────────────────
# FONCTION : créer un fichier avec contenu vide
# ──────────────────────────────────────────────
make_php() {
  cat > "$1" << PHPEOF
<?php
// [$1]
// TODO : à implémenter
?>
PHPEOF
}

make_html() {
  cat > "$1" << HTMLEOF
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réseau Social</title>
</head>
<body>
  <!-- [$1] — TODO -->
</body>
</html>
HTMLEOF
}

make_css() {
  cat > "$1" << CSSEOF
/* [$1] — TODO */
CSSEOF
}

make_js() {
  cat > "$1" << JSEOF
// [$1]
// TODO : à implémenter
JSEOF
}

make_empty() {
  touch "$1"
}

# ──────────────────────────────────────────────
# 1. CRÉATION DES DOSSIERS
# ──────────────────────────────────────────────
echo -e "${BLUE}[1/4] Création des dossiers...${NC}"

mkdir -p assets/css
mkdir -p assets/js
mkdir -p assets/images/uploads

mkdir -p vues/clients
mkdir -p vues/back-office

mkdir -p config

mkdir -p api/auth
mkdir -p api/posts
mkdir -p api/profile
mkdir -p api/friends
mkdir -p api/chat
mkdir -p api/admin

mkdir -p templates

echo -e "${GREEN}    ✓ Dossiers créés${NC}"

# ──────────────────────────────────────────────
# 2. FICHIERS RACINE (Divine)
# ──────────────────────────────────────────────
echo -e "${BLUE}[2/4] Création des fichiers racine...${NC}"

make_html "index.html"

# .gitignore
cat > .gitignore << 'GITEOF'
# Variables d'environnement — NE JAMAIS committer
.env

# Fichiers uploadés par les utilisateurs
assets/images/uploads/

# Fichiers système
.DS_Store
Thumbs.db

# Logs
*.log

# Dépendances
/vendor/
node_modules/
GITEOF

# .env.example (modèle sans données sensibles)
cat > .env.example << 'ENVEOF'
# Copier ce fichier en .env et remplir avec vos valeurs locales
DB_HOST=localhost
DB_NAME=reseau_social
DB_USER=root
DB_PASS=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_app
SMTP_FROM=noreply@reseau-social.com

APP_SECRET=changez_cette_cle_secrete_aleatoire
ENVEOF

# schema.sql
cat > schema.sql << 'SQLEOF'
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
SQLEOF

echo -e "${GREEN}    ✓ Fichiers racine créés (index.html, .gitignore, .env.example, schema.sql)${NC}"

# ──────────────────────────────────────────────
# 3. ASSETS
# ──────────────────────────────────────────────
echo -e "${BLUE}[3/4] Création des assets...${NC}"

# CSS (Divine)
make_css "assets/css/main.css"
make_css "assets/css/components.css"
make_css "assets/css/auth.css"
make_css "assets/css/feed.css"
make_css "assets/css/chat.css"
make_css "assets/css/profile.css"
make_css "assets/css/admin.css"

# JS (Sean + Nice + Siska)
make_js "assets/js/app.js"
make_js "assets/js/api.js"
make_js "assets/js/auth.js"
make_js "assets/js/navbar.js"
make_js "assets/js/admin.js"
make_js "assets/js/feed.js"
make_js "assets/js/profile.js"
make_js "assets/js/friends.js"
make_js "assets/js/chat.js"

# Placeholder pour garder le dossier uploads dans git
make_empty "assets/images/uploads/.gitkeep"

echo -e "${GREEN}    ✓ Assets CSS et JS créés${NC}"

# ──────────────────────────────────────────────
# 4. VUES HTML
# ──────────────────────────────────────────────

# Clients (Sean + Nice + Siska)
make_html "vues/clients/navbar.html"
make_html "vues/clients/login.html"
make_html "vues/clients/register.html"
make_html "vues/clients/reset-password.html"
make_html "vues/clients/home.html"
make_html "vues/clients/profile.html"
make_html "vues/clients/friends.html"
make_html "vues/clients/chat.html"

# Back-office (Sean)
make_html "vues/back-office/login.html"
make_html "vues/back-office/dashboard.html"
make_html "vues/back-office/users.html"
make_html "vues/back-office/posts.html"
make_html "vues/back-office/moderators.html"

echo -e "${GREEN}    ✓ Vues HTML créées${NC}"

# ──────────────────────────────────────────────
# 5. CONFIG PHP (Sean)
# ──────────────────────────────────────────────
make_php "config/database.php"
make_php "config/cors.php"
make_php "config/auth-check.php"
make_php "config/mailer.php"
make_php "config/upload.php"

echo -e "${GREEN}    ✓ Config PHP créé${NC}"

# ──────────────────────────────────────────────
# 6. API PHP
# ──────────────────────────────────────────────

# Auth (Sean)
make_php "api/auth/register.php"
make_php "api/auth/login.php"
make_php "api/auth/logout.php"
make_php "api/auth/check-session.php"
make_php "api/auth/forgot-password.php"
make_php "api/auth/reset-password.php"

# Posts (Nice)
make_php "api/posts/get-feed.php"
make_php "api/posts/create.php"
make_php "api/posts/delete.php"
make_php "api/posts/like.php"
make_php "api/posts/dislike.php"
make_php "api/posts/get-comments.php"
make_php "api/posts/add-comment.php"

# Profile (Nice)
make_php "api/profile/get-profile.php"
make_php "api/profile/update-info.php"
make_php "api/profile/update-avatar.php"
make_php "api/profile/update-password.php"

# Friends (Siska)
make_php "api/friends/list-users.php"
make_php "api/friends/send-invite.php"
make_php "api/friends/respond.php"
make_php "api/friends/list-friends.php"
make_php "api/friends/remove-friend.php"

# Chat (Siska)
make_php "api/chat/get-conversations.php"
make_php "api/chat/get-messages.php"
make_php "api/chat/send-message.php"
make_php "api/chat/upload-image.php"

# Admin (Sean)
make_php "api/admin/login.php"
make_php "api/admin/get-stats.php"
make_php "api/admin/get-users.php"
make_php "api/admin/delete-user.php"
make_php "api/admin/get-posts.php"
make_php "api/admin/delete-post.php"
make_php "api/admin/manage-roles.php"

echo -e "${GREEN}    ✓ Endpoints API PHP créés${NC}"

# ──────────────────────────────────────────────
# 7. TEMPLATES EMAIL (Divine)
# ──────────────────────────────────────────────
make_html "templates/email-welcome.html"
make_html "templates/email-reset.html"

echo -e "${GREEN}    ✓ Templates email créés${NC}"

# ──────────────────────────────────────────────
# RÉSUMÉ FINAL
# ──────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────────"
TOTAL=$(find . -type f ! -path './.git/*' | wc -l)
echo -e "${GREEN}✓ Setup terminé ! ${TOTAL} fichiers créés.${NC}"
echo ""
echo -e "${YELLOW}Prochaines étapes :${NC}"
echo "  1. cp .env.example .env  →  remplir avec tes identifiants MySQL"
echo "  2. Importer schema.sql dans phpMyAdmin"
echo "  3. git add ."
echo '  4. git commit -m "init: arborescence complète du projet"'
echo "  5. git push origin main"
echo "  6. Chaque membre crée sa branche :"
echo "       git checkout -b dev/nice"
echo "       git push -u origin dev/nice"
echo "──────────────────────────────────────────────"
echo ""
