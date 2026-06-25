// [assets/js/auth.js]
// TODO : à implémenter
//Gère l"état de connexion de l'utilisateur et la sécurité des accès
const auth ={
    //Enregistre l'utilisateur comme connectée
    Login: function(userData) {
        LocalStorage.setItem('isRegistered', 'true');
        LocalStorage.setItem('userSession', JSON.stringify(userData));


    },

    //Déconnecte l'utilisateur
    Logout: function() {
        LocalStorage.relmoveItem('isRegistered');
        LocalStorage.relmoveItem('userSession');
        window.Location.reload();//Raffraichir pour réinitialiser l'affichage

    },
    //vérifier si l'utilisateur est autorisé
    //fonction crucial pour la sécurité des onglets
    isAuthenticated: function() {
        return LocalStorage.getItem('isRegistered') === 'true';

    },
    //fonction de protection générique
    protectRoute: function(pageName) {
        const privatePages = ['profile', 'message', 'amis'];
         if(privatePagesPages.include(pageName) && !this.isAuthenticated()) {
            alert("Accès refusé. Veuillez vous inscrire ou vous connectez .");
            return false;
         }
         return true;
    }
};