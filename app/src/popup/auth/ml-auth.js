var Auth = (function () {

    function _checkAccessToken() {
        var userLoggedIn = window.oauth2.checkLogin();
        console.log("logged? ", userLoggedIn);
        return userLoggedIn;
    }

    function startLogin() {

        if (_checkAccessToken()) {
            return Promise.resolve();
        }

        waitMe.start({selector: '.container', text: "iniciando sesion..."});

        return new Promise(window.oauth2.start.bind(window.oauth2))
            .then(function () {
                console.log("Login success!");
            })
            .then(function () {
                var userDataUrl = 'https://api.mercadolibre.com/users/me?access_token=' + window.oauth2.getAuth().token;
                return $.get(userDataUrl);
            })
            .then(function (data) {
                console.log("saving user info: ", data);
                window.oauth2.addUser(data);
                waitMe.stop();
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