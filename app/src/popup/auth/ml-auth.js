var Auth = (function () {

    function _checkLogin(user) {
        if(!user) {
            return false;
        }
        var userLoggedIn = window.oauth2.checkToken(user);
        console.log("logged? ", !!userLoggedIn, userLoggedIn);
        return userLoggedIn;
    }

    function startLogin(user) {

        var loggedUser = _checkLogin(user);
        if (loggedUser) {
            return Promise.resolve(loggedUser);
        }

        waitMe.start({selector: '.container', text: "iniciando sesion..."});

        var newUserLogin = {};
        return new Promise(window.oauth2.start.bind(window.oauth2))
            .then(function (tokenData) {
                console.log("Login success!");
                newUserLogin = tokenData;
                var userDataUrl = 'https://api.mercadolibre.com/users/me?access_token=' + tokenData.token;
                return $.get(userDataUrl);
            })
            .then(function (data) {
                newUserLogin.user = data;
                console.log("saving user info: ", newUserLogin);
                waitMe.stop();
                return newUserLogin;
            })
            .catch(function (err) {
                console.error("Login bad: " + err.stack);
                waitMe.setText("Login error. Please retry.");
            });
    }


    function init() {
        var clientId = 3791482542047777;
        window.oauth2.options.full_url = "http://auth.mercadolibre.com.ar/authorization?response_type=token&client_id=" + clientId;
        window.oauth2.options.user_id = "user_id";
    }

    return {
        startLogin: startLogin,
        init: init
    }
})();