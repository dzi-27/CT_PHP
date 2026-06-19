<?php
/**
 * Configuration de l'envoi d'emails HTML.
 * 
 * Ce fichier expose une fonction sendMail() utilisée par :
 *   - api/auth/register.php      → email de bienvenue
 *   - api/auth/forgot-password.php → email de reset mot de passe
 * 
 * On utilise la fonction mail() native de PHP pour rester
 * en PHP natif comme exigé par le sujet.
 * Si vous voulez utiliser PHPMailer (SMTP Gmail), c'est possible
 * mais nécessite une installation via Composer.
 */

// Chargement des variables d'environnement depuis .env
$env = parse_ini_file(__DIR__ . '/../.env');

/**
 * Fonction sendMail()
 * 
 * @param string $to      Adresse email du destinataire
 * @param string $subject Sujet de l'email
 * @param string $body    Contenu HTML de l'email
 * @return bool           true si envoyé, false sinon
 * 
 * Exemple d'utilisation :
 *   sendMail('user@example.com', 'Bienvenue !', '<h1>Bonjour</h1>');
 */
function sendMail(string $to, string $subject, string $body): bool
{
    // Récupérer l'adresse d'expédition depuis .env
    global $env;
    $from = $env['SMTP_FROM'] ?? 'noreply@reseau-social.com';

    /**
     * Headers de l'email
     * On précise que c'est un email HTML (Content-Type: text/html)
     * et on définit l'expéditeur.
     */
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: Reseau Social <{$from}>\r\n";
    $headers .= "Reply-To: {$from}\r\n";

    // Envoi de l'email via la fonction mail() native PHP
    $result = mail($to, $subject, $body, $headers);

    return $result;
}

/**
 * Fonction loadTemplate()
 * 
 * Charge un template HTML depuis le dossier /templates/
 * et remplace les variables dynamiques dedans.
 * 
 * @param string $templateFile  Nom du fichier template (ex: 'email-welcome.html')
 * @param array  $variables     Tableau clé => valeur à remplacer dans le template
 * @return string               Le HTML final avec les variables remplacées
 * 
 * Exemple d'utilisation :
 *   $html = loadTemplate('email-welcome.html', ['{{PRENOM}}' => 'Sean']);
 */
function loadTemplate(string $templateFile, array $variables = []): string
{
    // Chemin complet vers le fichier template
    $templatePath = __DIR__ . '/../templates/' . $templateFile;

    // Vérifier que le template existe
    if (!file_exists($templatePath)) {
        return '<p>Erreur : template email introuvable.</p>';
    }

    // Charger le contenu HTML du template
    $html = file_get_contents($templatePath);

    // Remplacer chaque variable par sa valeur
    // Ex: '{{PRENOM}}' sera remplacé par 'Sean' dans le HTML
    foreach ($variables as $placeholder => $value) {
        $html = str_replace($placeholder, $value, $html);
    }

    return $html;
}
?>
