<?php
/**
 * Endpoint de demande de réinitialisation du mot de passe.
 * 
 * Quand un utilisateur a oublié son mot de passe :
 * 1. Il saisit son email
 * 2. Ce fichier génère un token unique avec expiration 1h
 * 3. Il envoie un email HTML avec le lien de réinitialisation
 * 
 * Méthode : POST
 * Body JSON attendu :
 *   { "email": "sean@mail.com" }
 * 
 * Réponse :
 *   { "success": true, "message": "Email envoyé si le compte existe." }
 * 
 * NOTE SÉCURITÉ : On retourne toujours le même message de succès
 * que l'email existe ou non en BDD. Cela évite de révéler quels
 * emails sont enregistrés (attaque par énumération d'utilisateurs).
 */

// ── Chargement des fichiers de configuration ──────────────────
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/mailer.php';

// ── Vérification de la méthode HTTP ──────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée. Utilisez POST.'
    ]);
    exit;
}

// ── Lecture et décodage du body JSON ─────────────────────────
$body  = json_decode(file_get_contents('php://input'), true);
$email = trim($body['email'] ?? '');

// ── Validation de l'email ─────────────────────────────────────
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Adresse email invalide.'
    ]);
    exit;
}

// ── Message de réponse générique ──────────────────────────────
// On prépare ce message maintenant car on le retourne
// dans tous les cas (email trouvé ou non) pour la sécurité
$responseMessage = 'Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé.';

// ── Recherche de l'utilisateur par email ─────────────────────
$stmt = $pdo->prepare("
    SELECT id, prenom, nom FROM users WHERE email = ?
");
$stmt->execute([$email]);
$user = $stmt->fetch();

// ── Si l'utilisateur n'existe pas → on retourne quand même succès
if (!$user) {
    echo json_encode([
        'success' => true,
        'message' => $responseMessage
    ]);
    exit;
}

// ── Suppression des anciens tokens de reset pour cet utilisateur
// Evite l'accumulation de tokens inutilisés en BDD
$stmt = $pdo->prepare("
    DELETE FROM password_resets WHERE user_id = ?
");
$stmt->execute([$user['id']]);

// ── Génération du token de réinitialisation ───────────────────
// Token unique de 64 caractères, valable 1 heure seulement
$resetToken = bin2hex(random_bytes(32));

// Stocker le token en BDD avec expiration dans 1 heure
$stmt = $pdo->prepare("
    INSERT INTO password_resets (user_id, token, expires_at)
    VALUES (?, ?, NOW() + INTERVAL 1 HOUR)
");
$stmt->execute([$user['id'], $resetToken]);

// ── Construction du lien de réinitialisation ──────────────────
// Ce lien sera inclus dans l'email envoyé à l'utilisateur
// Quand il clique dessus, la SPA charge la vue reset-password
// avec le token en paramètre dans l'URL
$resetLink = "http://localhost/CT_PHP/#/reset?token={$resetToken}";

// ── Envoi de l'email de réinitialisation ─────────────────────
try {
    $htmlEmail = loadTemplate('email-reset.html', [
        '{{PRENOM}}' => $user['prenom'],
        '{{NOM}}'    => $user['nom'],
        '{{LIEN}}'   => $resetLink,
    ]);
    sendMail(
        $email,
        'Réinitialisation de votre mot de passe',
        $htmlEmail
    );
} catch (Exception $e) {
    // Si l'envoi échoue on log l'erreur mais on ne le révèle pas
    // à l'utilisateur pour ne pas exposer des infos sensibles
    error_log('Erreur envoi email reset : ' . $e->getMessage());
}

// ── Réponse de succès ─────────────────────────────────────────
echo json_encode([
    'success' => true,
    'message' => $responseMessage
]);