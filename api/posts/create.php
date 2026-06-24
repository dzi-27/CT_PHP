<?php
/**
 * Endpoint : POST /api/posts/create.php
 *
 * Crée un nouveau post pour l'utilisateur connecté.
 * Reçoit une description obligatoire + une image optionnelle.
 *
 * Important : cette requête est envoyée en FormData (pas en JSON),
 * car elle peut contenir un fichier image. On lit donc $_POST et $_FILES,
 * pas php://input.
 *
 * Méthode : POST (FormData)
 * Champs attendus : description (texte), image (fichier, optionnel)
 *
 * Réponse JSON :
 *   { "success": true, "post": {...} }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';
require_once __DIR__ . '/../../config/upload.php';

$currentUser = authenticate();
$pdo = getDBConnection();

// ── ÉTAPE 1 — Valider la description ──
$description = trim($_POST['description'] ?? '');

if ($description === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'La description ne peut pas être vide.']);
    exit;
}

// ── ÉTAPE 2 — Gérer l'image si elle est présente ──
// uploadImage() (config/upload.php) vérifie le type, la taille,
// et déplace le fichier dans assets/images/uploads/.
// Elle retourne le chemin relatif, ou false si quelque chose est invalide.
$imagePath = null;
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $imagePath = uploadImage($_FILES['image']);

    if ($imagePath === false) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Image invalide ou trop volumineuse.']);
        exit;
    }
}

// ── ÉTAPE 3 — Insérer le post en base ──
$stmt = $pdo->prepare("INSERT INTO posts (user_id, description, image) VALUES (?, ?, ?)");
$stmt->execute([$currentUser['id'], $description, $imagePath]);

// lastInsertId() récupère l'id auto-incrémenté que MySQL vient de générer
$postId = $pdo->lastInsertId();

// ── ÉTAPE 4 — Recharger le post complet (avec infos de l'auteur) ──
// On le fait pour renvoyer exactement le même format que get-feed.php,
// afin que feed.js puisse réutiliser la même fonction renderPost() partout.
$stmt = $pdo->prepare("
    SELECT p.id, p.user_id, p.description, p.image, p.created_at,
           u.prenom, u.nom, u.avatar
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
");
$stmt->execute([$postId]);
$post = $stmt->fetch();

// Un post tout neuf n'a jamais ni like, ni dislike, ni commentaire :
// pas besoin d'interroger la base pour le savoir, on met directement 0.
$post['likes_count']    = 0;
$post['dislikes_count'] = 0;
$post['comments_count'] = 0;
$post['user_vote']      = null;

echo json_encode(['success' => true, 'post' => $post]);