var Auth = (function () {

    var self = {};

    function _checkLogin(user) {
        if (!user) {
            console.error("BAD LOGIC: No user to check login with!", user);
            return false;
        }
        return window.oauth2.checkToken(user);
    }

    function startLogin(user) {

        if (user && _checkLogin(user)) {
            // user was logged already - exit early
            console.log("[login] User was already logged in: ", user);
            self.trigger('login', user);
            return user;
        }

        // force start a new login
        console.log("[login] User was NOT logged in, refreshing login: ", user);
        return startNewLogin(user);
    }

    function startNewLogin(user) {
        waitMe.start({selector: '.container', text: "iniciando sesion..."});

        var newUserLogin = {};

        var oauthPromise = function () {
            if (user && user.user && user.user.nickname) {
                window.oauth2.options.userToLogin = user.user.nickname;
            }
            return new Promise(window.oauth2.start.bind(window.oauth2));
        };

        return oauthPromise()
            .tap(CookiePromise.removeAll)
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
            .then(function (user) {
                self.trigger('login', user);
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
        doLogin(registeredUsers);
    }

    /**
     *  Execute whole login sequence for a new user, or already existing users
     *
     * 1. save & remove original ML cookies
     * 2. begin:  login [empty|user]
     *      a. complete login
     *      b. clean cookies
     *      c. trigger new 'login' event
     *      d. repeat: while {{users}}
     * 3. restore original ML cookies
     *
     * @param users|undefined - Array of users, or nothing (for new login)
     * @returns void
     */
    function doLogin(users) {
        if (Array.isArray(users) && _.isEmpty(users)) {
            console.log("There are no registered users to login. Please, register some users first");
            return;
        }
        var cookies;

        var cookiesSaveAllPromise = function () {
            return CookiePromise.getAll()
                .then(function (cs) {
                    cookies = cs;
                    console.log("Saved all cookies (" + cookies.length + ")!");
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

        cookiesStoreAllPromise()
            .then(function () {
                return processLogins(users);
            })
            .then(function log(users) {
                console.log("Login phase finished!", users);
            })
            .then(cookiesRestoreAllPromise)
            .then(function log(cs) {
                console.log("Restored all original cookies!", cs.length);
            });
    }

    // return promise that process logins, of a new (empty) user, or an array of existing ones
    function processLogins(users) {
        if (users === undefined) {
            // new login
            console.log("New user! Starting new login");
            return startNewLogin();
        }
        // existing users login
        return Promise.mapSeries(users, startLogin);
    }

    return _.extend(self, {
        init: init,
        removeUser: User.removeUser,
        newLogin: doLogin
    });
})();
_.extend(Auth, Backbone.Events);