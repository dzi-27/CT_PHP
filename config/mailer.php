<?php
/**
 * config/mailer.php
 * 
 * Configuration de l'envoi d'emails HTML via PHPMailer + SMTP.
 * Utilise les identifiants SMTP définis dans .env
 */

// Charger PHPMailer installé via Composer
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Charger les variables d'environnement
$env = parse_ini_file(__DIR__ . '/../.env');

/**
 * sendMail()
 * 
 * @param string $to      Email du destinataire
 * @param string $subject Sujet de l'email
 * @param string $body    Contenu HTML de l'email
 * @return bool           true si envoyé, false sinon
 */
function sendMail(string $to, string $subject, string $body): bool {
    global $env;

    $mail = new PHPMailer(true);

    try {
        // Configuration SMTP
        $mail->isSMTP();
        $mail->Host       = $env['SMTP_HOST'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $env['SMTP_USER'];
        $mail->Password   = $env['SMTP_PASS'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = $env['SMTP_PORT'];
        $mail->CharSet    = 'UTF-8';

        // Expéditeur et destinataire
        $mail->setFrom($env['SMTP_FROM'], 'LinkUP');
        $mail->addAddress($to);

        // Contenu HTML
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $body;

        $mail->send();
        return true;

    } catch (Exception $e) {
        error_log('Erreur envoi email : ' . $mail->ErrorInfo);
        return false;
    }
}

/**
 * loadTemplate()
 * 
 * Charge un template HTML et remplace les placeholders
 * 
 * @param string $templateFile  Nom du fichier (ex: 'email-welcome.html')
 * @param array  $variables     Tableau placeholder => valeur
 * @return string               HTML avec les valeurs injectées
 */
function loadTemplate(string $templateFile, array $variables = []): string {
    $templatePath = __DIR__ . '/../templates/' . $templateFile;

    if (!file_exists($templatePath)) {
        return '<p>Template introuvable.</p>';
    }

    $html = file_get_contents($templatePath);

    foreach ($variables as $placeholder => $value) {
        $html = str_replace($placeholder, $value, $html);
    }

    return $html;
}