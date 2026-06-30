<?php
/**
 * Configuration de l'envoi d'emails via PHPMailer + Mailtrap SMTP.
 *
 * Ce fichier expose deux fonctions utilisées par :
 *   - api/auth/register.php       → email de bienvenue
 *   - api/auth/forgot-password.php → email de reset mot de passe
 *
 * CORRECTION : on utilise PHPMailer (installé via Composer) au lieu
 * de mail() natif PHP, pour passer par Mailtrap en SMTP.
 *
 * Prérequis :
 *   composer require phpmailer/phpmailer
 *   (vendor/ doit être dans la racine du projet CT_PHP/)
 */

// Chargement de l'autoloader Composer
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Chargement des variables d'environnement depuis .env
$env = parse_ini_file(__DIR__ . '/../.env');

/**
 * sendMail()
 *
 * Envoie un email HTML via PHPMailer + Mailtrap SMTP.
 *
 * @param string $to      Adresse email du destinataire
 * @param string $subject Sujet de l'email
 * @param string $body    Contenu HTML de l'email
 *
 * @throws Exception si l'envoi échoue
 */
function sendMail(string $to, string $subject, string $body): void
{
    global $env;

    $mail = new PHPMailer(true); // true = active les exceptions

    // ── Configuration SMTP ────────────────────────────────────
    $mail->isSMTP();
    $mail->Host        = $env['SMTP_HOST'] ?? 'sandbox.smtp.mailtrap.io';
    $mail->SMTPAuth    = true;
    $mail->Username    = $env['SMTP_USER'] ?? '';
    $mail->Password    = $env['SMTP_PASS'] ?? '';
    $mail->SMTPSecure  = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port        = (int) ($env['SMTP_PORT'] ?? 2525);
    $mail->CharSet     = 'UTF-8';

    // ── Expéditeur et destinataire ────────────────────────────
    $from = $env['SMTP_FROM'] ?? 'noreply@linkup.com';
    $mail->setFrom($from, 'LinkUP');
    $mail->addAddress($to);

    // ── Contenu HTML ──────────────────────────────────────────
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $body;

    // ── Envoi ─────────────────────────────────────────────────
    $mail->send();
    // Si send() échoue, PHPMailer lève une Exception
    // qui sera attrapée dans le catch du fichier appelant
}

/**
 * loadTemplate()
 *
 * Charge un template HTML depuis /templates/ et remplace
 * les variables dynamiques (ex: {{PRENOM}}, {{LIEN}}).
 *
 * @param string $templateFile  Nom du fichier (ex: 'email-welcome.html')
 * @param array  $variables     Tableau ['{{PRENOM}}' => 'Sean', ...]
 * @return string               HTML final avec variables remplacées
 */
function loadTemplate(string $templateFile, array $variables = []): string
{
    $templatePath = __DIR__ . '/../templates/' . $templateFile;

    if (!file_exists($templatePath)) {
        return '<p>Erreur : template email introuvable.</p>';
    }

    $html = file_get_contents($templatePath);

    foreach ($variables as $placeholder => $value) {
        $html = str_replace($placeholder, htmlspecialchars($value, ENT_QUOTES, 'UTF-8'), $html);
    }

    return $html;
}
?>