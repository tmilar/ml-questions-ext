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

        // if not defined user, start a new login
        window.oauth2.options.forceNewLogin = !user;

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
                User.addUser(newUserLogin);
                waitMe.stop();
                return newUserLogin;
            })
            .catch(function (err) {
                console.error("Login bad: " + err.stack);
                waitMe.setText("Login error. Please retry.");
            });
    }

    var User = {
        addUser: function (userInfo) {
            var users = localStorage.get('users');

            var newUserId = userInfo.user_id;

            // check if id key is present
            if (!newUserId) {
                console.error("No user_id received! Can't register!");
                return;
            }

            // initialize users hash if not existant, and mark new user as primary
            if (_.isEmpty(users)) {
                userInfo.primary = true;
                users = {};
            }

            // check if user was already registered
            var newUser = users[newUserId];
            if (newUser) {
                console.log("User id: ", newUserId, " was already registered! Current info: ", newUser, ". Updating with new info: ", userInfo);
                _.merge(newUser, userInfo);
            } else {
                console.log("Registering new user: ", userInfo);
                users[newUserId] = userInfo;
            }

            localStorage.set('users', users);
        }
    };

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