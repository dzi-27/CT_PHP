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

function initLoginForm() {
    const form = document.getElementById('form-login');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email    = document.getElementById('input-email').value.trim();
        const password = document.getElementById('input-password').value.trim();

        if (!email || !password) {
            showError('Veuillez remplir tous les champs.');
            return;
        }

        setLoading('btn-login', true);

        try {
            const data = await apiRequest('POST', 'api/auth/login.php', { email, password });

            if (data.success) {
                sessionStorage.setItem('token', data.token);
                sessionStorage.setItem('user', JSON.stringify(data.user));
                window.location.hash = '#/home';
            } else {
                showError(data.message || 'Erreur de connexion.');
            }

        } catch (error) {
            showError('Erreur réseau. Vérifiez votre connexion.');
        } finally {
            setLoading('btn-login', false);
        }
    });
}

// ══════════════════════════════════════════════════════════════
// MODULE REGISTER
// ══════════════════════════════════════════════════════════════

function initRegisterForm() {
    // CORRECTION : les scripts inline de register.html ne s'exécutent
    // pas quand la vue est injectée via innerHTML.
    // On initialise toutes les interactions UX ici à la place.
    initRegisterUX();

    const form = document.getElementById('form-register');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const prenom          = document.getElementById('input-prenom').value.trim();
        const nom             = document.getElementById('input-nom').value.trim();
        const email           = document.getElementById('input-email').value.trim();
        const password        = document.getElementById('input-password').value.trim();
        const confirmPassword = document.getElementById('input-confirm-password').value.trim();

        if (!prenom || !nom || !email || !password || !confirmPassword) {
            showError('Veuillez remplir tous les champs.');
            return;
        }

        if (password.length < 8) {
            showError('Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }

        if (password !== confirmPassword) {
            showError('Les mots de passe ne correspondent pas.');
            return;
        }

        setLoading('btn-register', true);

        try {
            const data = await apiRequest('POST', 'api/auth/register.php', {
                prenom, nom, email, password
            });

            if (data.success) {
                sessionStorage.setItem('token', data.token);
                sessionStorage.setItem('user', JSON.stringify(data.user));
                showSuccess('Compte créé avec succès ! Redirection...');
                setTimeout(() => { window.location.hash = '#/home'; }, 1500);
            } else {
                showError(data.message || 'Erreur lors de l\'inscription.');
            }

        } catch (error) {
            showError('Erreur réseau. Vérifiez votre connexion.');
        } finally {
            setLoading('btn-register', false);
        }
    });
}

/**
 * initRegisterUX()
 *
 * Gère les interactions visuelles du formulaire d'inscription :
 * - Afficher / cacher le mot de passe (bouton 👁️)
 * - Indicateur de force du mot de passe
 * - Vérification de correspondance en temps réel
 *
 * Déplacé ici depuis le <script> inline de register.html car les scripts
 * inline injectés via innerHTML ne s'exécutent PAS dans le navigateur.
 */
function initRegisterUX() {

    // ── Toggle afficher/cacher mot de passe ───────────────────
    function togglePasswordVisibility(inputId, btnId) {
        const input = document.getElementById(inputId);
        const btn   = document.getElementById(btnId);
        if (!input || !btn) return;
        if (input.type === 'password') {
            input.type      = 'text';
            btn.textContent = '🙈';
        } else {
            input.type      = 'password';
            btn.textContent = '👁️';
        }
    }

    document.getElementById('toggle-password')?.addEventListener('click', function() {
        togglePasswordVisibility('input-password', 'toggle-password');
    });

    document.getElementById('toggle-confirm-password')?.addEventListener('click', function() {
        togglePasswordVisibility('input-confirm-password', 'toggle-confirm-password');
    });

    // ── Indicateur de force du mot de passe ───────────────────
    document.getElementById('input-password')?.addEventListener('input', function() {
        const password      = this.value;
        const strengthBar   = document.getElementById('password-strength');
        const strengthFill  = document.getElementById('strength-fill');
        const strengthLabel = document.getElementById('strength-label');

        if (!strengthBar || !strengthFill || !strengthLabel) return;

        if (password.length === 0) {
            strengthBar.style.display = 'none';
            return;
        }

        strengthBar.style.display = 'block';

        let score = 0;
        if (password.length >= 8)          score++;
        if (password.length >= 12)         score++;
        if (/[A-Z]/.test(password))        score++;
        if (/[0-9]/.test(password))        score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const levels = [
            { label: 'Très faible', color: '#ff4444', width: '20%'  },
            { label: 'Faible',      color: '#ff8800', width: '40%'  },
            { label: 'Moyen',       color: '#ffcc00', width: '60%'  },
            { label: 'Fort',        color: '#88cc00', width: '80%'  },
            { label: 'Très fort',   color: '#00cc44', width: '100%' },
        ];

        const level             = levels[Math.min(score, 4)];
        strengthFill.style.width      = level.width;
        strengthFill.style.background = level.color;
        strengthLabel.textContent     = level.label;
        strengthLabel.style.color     = level.color;
    });

    // ── Correspondance des mots de passe en temps réel ────────
    document.getElementById('input-confirm-password')?.addEventListener('input', function() {
        const password        = document.getElementById('input-password').value;
        const confirmPassword = this.value;
        const matchEl         = document.getElementById('password-match');
        if (!matchEl) return;

        if (confirmPassword.length === 0) { matchEl.style.display = 'none'; return; }
        matchEl.style.display = 'block';

        if (password === confirmPassword) {
            matchEl.textContent = '✅ Les mots de passe correspondent';
            matchEl.style.color = '#00cc44';
        } else {
            matchEl.textContent = '❌ Les mots de passe ne correspondent pas';
            matchEl.style.color = '#ff4444';
        }
    });
}

// ══════════════════════════════════════════════════════════════
// MODULE RESET PASSWORD
// ══════════════════════════════════════════════════════════════

function initResetForm() {
    // CORRECTION : les scripts inline de reset-password.html ne s'exécutent
    // pas via innerHTML — on initialise les interactions UX ici.
    initResetUX();

    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const token  = params.get('token');

    if (token) {
        showStep('step-new-password');
        initNewPasswordForm(token);
    } else {
        showStep('step-email');
        initForgotPasswordForm();
    }
}

/**
 * initResetUX()
 *
 * Interactions visuelles de la page reset-password :
 * - Toggle afficher/cacher les mots de passe
 * - Vérification de correspondance en temps réel
 *
 * Déplacé ici depuis le <script> inline de reset-password.html.
 */
function initResetUX() {
    function togglePasswordVisibility(inputId, btnId) {
        const input = document.getElementById(inputId);
        const btn   = document.getElementById(btnId);
        if (!input || !btn) return;
        if (input.type === 'password') {
            input.type      = 'text';
            btn.textContent = '🙈';
        } else {
            input.type      = 'password';
            btn.textContent = '👁️';
        }
    }

    document.getElementById('toggle-new-password')?.addEventListener('click', function() {
        togglePasswordVisibility('input-new-password', 'toggle-new-password');
    });

    document.getElementById('toggle-confirm-new-password')?.addEventListener('click', function() {
        togglePasswordVisibility('input-confirm-new-password', 'toggle-confirm-new-password');
    });

    document.getElementById('input-confirm-new-password')?.addEventListener('input', function() {
        const password        = document.getElementById('input-new-password').value;
        const confirmPassword = this.value;
        const matchEl         = document.getElementById('new-password-match');
        if (!matchEl) return;

        if (confirmPassword.length === 0) { matchEl.style.display = 'none'; return; }
        matchEl.style.display = 'block';

        if (password === confirmPassword) {
            matchEl.textContent = '✅ Les mots de passe correspondent';
            matchEl.style.color = '#00cc44';
        } else {
            matchEl.textContent = '❌ Les mots de passe ne correspondent pas';
            matchEl.style.color = '#ff4444';
        }
    });
}

function initForgotPasswordForm() {
    const form = document.getElementById('form-forgot');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('input-reset-email').value.trim();

        if (!email) {
            showError('Veuillez saisir votre adresse email.');
            return;
        }

        setLoading('btn-forgot', true);

        try {
            await apiRequest('POST', 'api/auth/forgot-password.php', { email });
            showSuccess('Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé.');
            form.style.display = 'none';
        } catch (error) {
            showError('Erreur réseau. Vérifiez votre connexion.');
        } finally {
            setLoading('btn-forgot', false);
        }
    });
}

function initNewPasswordForm(token) {
    const form = document.getElementById('form-new-password');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const password        = document.getElementById('input-new-password').value.trim();
        const confirmPassword = document.getElementById('input-confirm-new-password').value.trim();

        if (!password || !confirmPassword) {
            showError('Veuillez remplir tous les champs.');
            return;
        }

        if (password.length < 8) {
            showError('Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }

        if (password !== confirmPassword) {
            showError('Les mots de passe ne correspondent pas.');
            return;
        }

        setLoading('btn-reset', true);

        try {
            const data = await apiRequest('POST', 'api/auth/reset-password.php', {
                token, password, confirm_password: confirmPassword
            });

            if (data.success) {
                showSuccess('Mot de passe modifié avec succès ! Redirection vers la connexion...');
                setTimeout(() => { window.location.hash = '#/login'; }, 2000);
            } else {
                showError(data.message || 'Erreur lors de la réinitialisation.');
            }

        } catch (error) {
            showError('Erreur réseau. Vérifiez votre connexion.');
        } finally {
            setLoading('btn-reset', false);
        }
    });
}

// ══════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ══════════════════════════════════════════════════════════════

function showError(message) {
    const errorEl   = document.getElementById('error-message');
    const successEl = document.getElementById('success-message');
    if (errorEl)   { errorEl.textContent = message; errorEl.style.display = 'block'; }
    if (successEl) { successEl.style.display = 'none'; }
}

function showSuccess(message) {
    const successEl = document.getElementById('success-message');
    const errorEl   = document.getElementById('error-message');
    if (successEl) { successEl.textContent = message; successEl.style.display = 'block'; }
    if (errorEl)   { errorEl.style.display = 'none'; }
}

function showStep(stepId) {
    document.querySelectorAll('.reset-step').forEach(step => {
        step.style.display = 'none';
    });
    const step = document.getElementById(stepId);
    if (step) step.style.display = 'block';
}

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (loading) {
        btn.disabled     = true;
        btn.dataset.text = btn.textContent;
        btn.textContent  = 'Chargement...';
    } else {
        btn.disabled    = false;
        btn.textContent = btn.dataset.text || btn.textContent;
    }
}