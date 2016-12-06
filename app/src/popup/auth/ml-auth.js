var Auth = (function () {

    var self = {};

    function _checkLogin(user) {
        if (!user) {
            return false;
        }
        var userLoggedIn = window.oauth2.checkToken(user);
        console.log("logged? ", !!userLoggedIn, userLoggedIn);
        return userLoggedIn;
    }

    function startLogin(user) {

        var loggedUser = _checkLogin(user);
        if (loggedUser) {
            return Promise.resolve(loggedUser).then(function (user) {
                self.trigger('login', user);
            });
        }

        // force start a new login
        window.oauth2.options.forceNewLogin = true;
        if (user && user.user && user.user.nickname) {
            window.oauth2.options.userToLogin = user.user.nickname;
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
                User.addUser(newUserLogin);
                waitMe.stop();
                self.trigger('login', newUserLogin);
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
            var existingUser = users[newUserId];
            if (existingUser) {
                console.log("User id: ", newUserId, " was already registered! Current info: ", existingUser, ". Updating with new info: ", userInfo);
                _.merge(existingUser, userInfo);
            } else {
                console.log("Registering new user: ", userInfo);
                users[newUserId] = userInfo;
            }

            localStorage.set('users', users);
        },

        removeUser: function (userId) {
            var users = localStorage.get('users');
            if (!users[userId]) {
                console.error("Error, user id ", userId, "not found! ");
                return false;
            }
            delete users[userId];
            localStorage.set('users', users);
            return true;
        },
        getUsers: function () {
            return localStorage.get('users');
        },
        getUsersArray: function () {
            return _.values(this.getUsers())
        }
    };

    function init() {
        var clientId = 3791482542047777;
        window.oauth2.options.full_url = "http://auth.mercadolibre.com.ar/authorization?response_type=token&client_id=" + clientId;
        window.oauth2.options.user_id = "user_id";

        var registeredUsers = User.getUsersArray();
        return executeLogin(registeredUsers);
    }

    /**
     *  Execute whole login sequence for one or many user(s)
     *
     * 1. save & remove original ML cookies
     * 2. for each user in {{users}}:
     *      a. start -> finish login (user)
     *      b. clean cookies
     *      c. trigger new 'login' event
     * 3. restore original ML cookies
     *
     * @param users - One single user, or an array of multiple users
     * @returns {Promise.<TResult>}
     */
    function executeLogin(users) {

        // Treat a single user, or an array of users always as an array
        users = _.flatten([users]);
        var cookies;

        var cookiesSaveAllPromise = function () {
            return CookiePromise.getAll()
                .then(function (cs) {
                    cookies = cs;
                    console.log("Saved all cookies (" + cookies.length + ")!", cookies);
                })
        };

        var cookiesStoreAllPromise = function () {
            return cookiesSaveAllPromise()
                .then(CookiePromise.removeAll);
        };

        var cookiesRestoreAllPromise = function () {
            console.debug("Restoring all cookies.. ", cookies.length, cookies);
            return CookiePromise.restoreAll(cookies);
        };

        return cookiesStoreAllPromise()
            .thenReturn(users)
            .mapSeries(function loginUserAndClean(user) {
                return startLogin(user)
                    .then(CookiePromise.removeAll);
            })
            .then(function log() {
                console.log("Finished serially all logins!");
            })
            .then(cookiesRestoreAllPromise)
            .then(function log(cs) {
                console.log("Restored all original cookies!", cs.length, cs);
            });
    }

    return _.extend(self, {
        startLogin: startLogin,
        init: init,
        removeUser: User.removeUser
    });
})();
_.extend(Auth, Backbone.Events);