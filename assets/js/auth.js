/**
 * Gestion de toute la logique JavaScript du module authentification.
 * 
 * Ce fichier gère :
 * - La connexion (formulaire login)
 * - L'inscription (formulaire register)
 * - La demande de reset de mot de passe (formulaire forgot)
 * - La réinitialisation du mot de passe (formulaire reset)
 * 
 * Appelé par app.js via initAuth() au chargement des vues :
 * #/login, #/register, #/reset
 */

/**
 * initAuth()
 * 
 * Fonction principale appelée par app.js.
 * Détecte quelle vue auth est active et initialise
 * le bon formulaire.
 */
function initAuth() {
    // Lire le hash actuel pour savoir quelle vue est affichée
    const hash = window.location.hash || '#/login';

    if (hash.startsWith('#/login')) {
        initLoginForm();
    } else if (hash.startsWith('#/register')) {
        initRegisterForm();
    } else if (hash.startsWith('#/reset')) {
        initResetForm();
    }
}

// ══════════════════════════════════════════════════════════════
// MODULE LOGIN
// ══════════════════════════════════════════════════════════════

/**
 * initLoginForm()
 * 
 * Initialise le formulaire de connexion.
 * Écoute la soumission et appelle l'API login.
 */
function initLoginForm() {
    const form = document.getElementById('form-login');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        // Empêcher le rechargement de la page
        e.preventDefault();

        // Récupérer les valeurs des champs
        const email    = document.getElementById('input-email').value.trim();
        const password = document.getElementById('input-password').value.trim();

        // Validation basique côté client
        if (!email || !password) {
            showError('login', 'Veuillez remplir tous les champs.');
            return;
        }

        // Désactiver le bouton pendant la requête
        setLoading('btn-login', true);

        try {
            // Appel à l'API login
            const data = await apiRequest('POST', 'api/auth/login.php', {
                email,
                password
            });

            if (data.success) {
                // ── Connexion réussie ──────────────────────────
                // Stocker le token dans sessionStorage
                sessionStorage.setItem('token', data.token);

                // Stocker les infos utilisateur dans sessionStorage
                sessionStorage.setItem('user', JSON.stringify(data.user));

                // Rediriger vers la page d'accueil
                window.location.hash = '#/home';

            } else {
                // Afficher le message d'erreur retourné par l'API
                showError('login', data.message || 'Erreur de connexion.');
            }

        } catch (error) {
            showError('login', 'Erreur réseau. Vérifiez votre connexion.');
        } finally {
            // Réactiver le bouton dans tous les cas
            setLoading('btn-login', false);
        }
    });
}

// ══════════════════════════════════════════════════════════════
// MODULE REGISTER
// ══════════════════════════════════════════════════════════════

/**
 * initRegisterForm()
 * 
 * Initialise le formulaire d'inscription.
 * Écoute la soumission et appelle l'API register.
 */
function initRegisterForm() {
    const form = document.getElementById('form-register');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Récupérer les valeurs des champs
        const prenom          = document.getElementById('input-prenom').value.trim();
        const nom             = document.getElementById('input-nom').value.trim();
        const email           = document.getElementById('input-email').value.trim();
        const password        = document.getElementById('input-password').value.trim();
        const confirmPassword = document.getElementById('input-confirm-password').value.trim();

        // ── Validations côté client ────────────────────────────
        if (!prenom || !nom || !email || !password || !confirmPassword) {
            showError('register', 'Veuillez remplir tous les champs.');
            return;
        }

        if (password.length < 8) {
            showError('register', 'Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }

        if (password !== confirmPassword) {
            showError('register', 'Les mots de passe ne correspondent pas.');
            return;
        }

        // Désactiver le bouton pendant la requête
        setLoading('btn-register', true);

        try {
            // Appel à l'API register
            const data = await apiRequest('POST', 'api/auth/register.php', {
                prenom,
                nom,
                email,
                password
            });

            if (data.success) {
                // ── Inscription réussie ────────────────────────
                // On connecte directement l'utilisateur
                sessionStorage.setItem('token', data.token);
                sessionStorage.setItem('user', JSON.stringify(data.user));

                // Afficher un message de succès avant redirection
                showSuccess('register', 'Compte créé avec succès ! Redirection...');

                // Rediriger vers l'accueil après 1.5 secondes
                setTimeout(() => {
                    window.location.hash = '#/home';
                }, 1500);

            } else {
                showError('register', data.message || 'Erreur lors de l\'inscription.');
            }

        } catch (error) {
            showError('register', 'Erreur réseau. Vérifiez votre connexion.');
        } finally {
            setLoading('btn-register', false);
        }
    });
}

// ══════════════════════════════════════════════════════════════
// MODULE RESET PASSWORD
// ══════════════════════════════════════════════════════════════

/**
 * initResetForm()
 * 
 * Initialise la page de réinitialisation du mot de passe.
 * Gère les 2 étapes :
 * - Étape 1 : saisie de l'email → envoi du lien
 * - Étape 2 : saisie du nouveau mot de passe → reset
 */
function initResetForm() {
    // Vérifier si un token est présent dans l'URL
    // Ex: #/reset?token=abc123 → on est à l'étape 2
    const params = new URLSearchParams(
        window.location.hash.split('?')[1]
    );
    const token = params.get('token');

    if (token) {
        // ── Étape 2 : nouveau mot de passe ────────────────────
        showStep('step-new-password');
        initNewPasswordForm(token);
    } else {
        // ── Étape 1 : saisie de l'email ───────────────────────
        showStep('step-email');
        initForgotPasswordForm();
    }
}

/**
 * initForgotPasswordForm()
 * 
 * Étape 1 : l'utilisateur saisit son email pour recevoir
 * le lien de réinitialisation.
 */
function initForgotPasswordForm() {
    const form = document.getElementById('form-forgot');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('input-reset-email').value.trim();

        if (!email) {
            showError('reset', 'Veuillez saisir votre adresse email.');
            return;
        }

        setLoading('btn-forgot', true);

        try {
            const data = await apiRequest('POST', 'api/auth/forgot-password.php', {
                email
            });

            // On affiche toujours un message de succès (sécurité)
            showSuccess('reset',
                'Si un compte existe avec cet email, ' +
                'un lien de réinitialisation vous a été envoyé.'
            );

            // Cacher le formulaire après envoi
            form.style.display = 'none';

        } catch (error) {
            showError('reset', 'Erreur réseau. Vérifiez votre connexion.');
        } finally {
            setLoading('btn-forgot', false);
        }
    });
}

/**
 * initNewPasswordForm()
 * 
 * Étape 2 : l'utilisateur saisit son nouveau mot de passe.
 * 
 * @param {string} token Le token reçu dans l'URL par email
 */
function initNewPasswordForm(token) {
    const form = document.getElementById('form-new-password');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const password        = document.getElementById('input-new-password').value.trim();
        const confirmPassword = document.getElementById('input-confirm-new-password').value.trim();

        // Validations côté client
        if (!password || !confirmPassword) {
            showError('reset', 'Veuillez remplir tous les champs.');
            return;
        }

        if (password.length < 8) {
            showError('reset', 'Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }

        if (password !== confirmPassword) {
            showError('reset', 'Les mots de passe ne correspondent pas.');
            return;
        }

        setLoading('btn-reset', true);

        try {
            const data = await apiRequest('POST', 'api/auth/reset-password.php', {
                token,
                password,
                confirm_password: confirmPassword
            });

            if (data.success) {
                showSuccess('reset',
                    'Mot de passe modifié avec succès ! ' +
                    'Redirection vers la connexion...'
                );

                // Rediriger vers login après 2 secondes
                setTimeout(() => {
                    window.location.hash = '#/login';
                }, 2000);

            } else {
                showError('reset', data.message || 'Erreur lors de la réinitialisation.');
            }

        } catch (error) {
            showError('reset', 'Erreur réseau. Vérifiez votre connexion.');
        } finally {
            setLoading('btn-reset', false);
        }
    });
}

// ══════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ══════════════════════════════════════════════════════════════

/**
 * showError()
 * Affiche un message d'erreur dans la vue spécifiée.
 *
 * @param {string} context  La vue concernée ('login', 'register', 'reset')
 * @param {string} message  Le message à afficher
 */
function showError(context, message) {
    const errorEl = document.getElementById('error-message');
    const successEl = document.getElementById('success-message');

    if (errorEl) {
        errorEl.textContent  = message;
        errorEl.style.display = 'block';
    }
    if (successEl) {
        successEl.style.display = 'none';
    }
}

/**
 * showSuccess()
 * Affiche un message de succès dans la vue spécifiée.
 *
 * @param {string} context  La vue concernée
 * @param {string} message  Le message à afficher
 */
function showSuccess(context, message) {
    const successEl = document.getElementById('success-message');
    const errorEl   = document.getElementById('error-message');

    if (successEl) {
        successEl.textContent  = message;
        successEl.style.display = 'block';
    }
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

/**
 * showStep()
 * Affiche une étape spécifique du formulaire de reset
 * et cache les autres.
 *
 * @param {string} stepId  L'ID de l'étape à afficher
 */
function showStep(stepId) {
    // Cacher toutes les étapes
    document.querySelectorAll('.reset-step').forEach(step => {
        step.style.display = 'none';
    });

    // Afficher l'étape demandée
    const step = document.getElementById(stepId);
    if (step) {
        step.style.display = 'block';
    }
}

/**
 * setLoading()
 * Active ou désactive l'état de chargement d'un bouton.
 *
 * @param {string}  btnId    L'ID du bouton
 * @param {boolean} loading  true = chargement, false = normal
 */
function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    if (loading) {
        btn.disabled     = true;
        btn.dataset.text = btn.textContent; // Sauvegarder le texte original
        btn.textContent  = 'Chargement...';
    } else {
        btn.disabled    = false;
        btn.textContent = btn.dataset.text || btn.textContent;
    }
}