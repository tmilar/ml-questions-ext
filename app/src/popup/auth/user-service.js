var UserService = (function UserService() {

    return {
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
})();