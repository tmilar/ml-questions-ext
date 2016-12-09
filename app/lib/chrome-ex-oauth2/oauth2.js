function LoginAbortException(username) {
    this.name = 'LoginAbort';
    this.username = username;
    this.message = 'Error, login ' + ( username ? 'for user ' + username : '' ) + ' aborted!';
    this.stack = (new Error()).stack;
}
LoginAbortException.prototype = new Error;

(function () {

    var options = {
        access_token_url: "https://github.com/login/oauth/access_token",
        authorization_url: "https://github.com/login/oauth/authorize",
        client_id: "323cafc6718f7670fede",
        client_secret: "5b1210837e4f094d4983bb07fbb5601d558fdef7",
        redirect_url: "https://github.com/robots.txt",
        scopes: [],
        key: "token",
        user_id: "user_id",
        key_expire: "expires",
        full_url: 'https://www.facebook.com/v2.8/dialog/oauth' +
        '?client_id=162744410854883' +
        '&response_type=token' +
        '&scope=public_profile,email' +
        '&redirect_uri=https://www.facebook.com/connect/login_success.html'
    };

    function _removeLoginTab() {
        chrome.tabs.remove(window.oauth2.loginTabId);
    }


    /**
     * Finishes the oauth2 process by exchanging the given authorization code for an
     * authorization token. The authroiztion token is saved to the browsers local storage.
     * If the redirect page does not return an authorization code or an error occures when
     * exchanging the authorization code for an authorization token then the oauth2 process dies
     * and the authorization tab is closed.
     *
     * @param url The url of the redirect page specified in the authorization request.
     * @param startRequestTime Time at which the req started, to calculate expire date
     */
    function _finish(url, startRequestTime) {

        if (url.match(/\?error=(.+)/)) {
            console.error("[oauth2] finished with auth error response after login attempt. Url: ", url);
            throw new Error("Error after login attempt");
        }

        if (url.match(/access_token=([\w\/\-]+)/)) {
            // access token
            // below you get string like this: access_token=...&expires_in=...
            var params = url.split('#')[1];

            var accessToken = url.match(/access_token=([\w\/\-]+)/)[1];
            var expireTime = Number(url.match(/expires_in=([\w\/\-]+)/)[1]);
            var userId = url.match(/user_id=([\w\/\-]+)/) ? url.match(/user_id=([\w\/\-]+)/)[1] : null;

            var expireDate = new Date(startRequestTime.getTime() + ( expireTime * 1000));

            var auth = {};
            auth[options.key] = accessToken;
            auth[options.key_expire] = expireDate;

            if (userId && userId.length > 0 && options.user_id) {
                auth[options.user_id] = userId;
            }

            localStorage.set(options.key, auth);

            console.log("[oauth2] finish successful! stored access token ", accessToken, " from url ", url);
            _removeLoginTab();
            return auth;
        }

        if (url.match(/\?code=([\w\/\-]+)/)) {
            // github  access token
            var code = url.match(/\?code=([\w\/\-]+)/)[1];

            var data = new FormData();
            data.append('client_id', options.client_id);
            data.append('client_secret', options.client_secret);
            data.append('code', code);

            // Send request for authorization token.
            var xhr = new XMLHttpRequest();
            xhr.addEventListener('readystatechange', function (event) {
                if (xhr.readyState !== 4) {
                    return;
                }

                if (xhr.status == 200) {
                    if (xhr.responseText.match(/error=/)) {
                        _removeLoginTab();
                    } else {
                        var token = xhr.responseText.match(/access_token=([^&]*)/)[1];
                        localStorage.setItem(options.key, token);
                        _removeLoginTab();
                    }
                } else {
                    _removeLoginTab();
                }

            });

            xhr.open('POST', options.access_token_url, true);
            xhr.send(data);

            return true;
        }

        console.warn("[oauth2] tab updated, but URL has not been handled ", url);
        return false;
    }

    function _forceUsernameLogin(newPopupTabId, username) {

        // to be injected in new popup
        function lockLoginUsername(username) {
            console.log('login for ', username);
            var userInputContainer = document.getElementById('userIdFieldBox');
            userInputContainer.classList.add("ch-form-disabled");
            var user = document.getElementById('user_id');
            user.value = username;
            user.style.cursor = 'not-allowed';
            user.readOnly = true;
            var pass = document.getElementById('password');
            pass.style.backgroundColor = 'rgb(250, 255, 189)';
        }

        chrome.tabs.executeScript(newPopupTabId, {
            code: "(" + lockLoginUsername.toString() + ")('" + username + "')"
        });
    }

    window.oauth2 = {

        options: options,

        /**
         * Starts the authorization process.
         */
        start: function (successCb, errorCb) {

            var url = options.full_url ||
                options.authorization_url +
                "?client_id=" + options.client_id +
                "&redirect_uri=" + options.redirect_url +
                "&scopes=" + options.scopes.join(",");

            var self = this;
            var userToLogin = options.userToLogin;
            delete options.userToLogin;

            var startRequestTime = new Date();

            chrome.windows.getCurrent(function (currentWindow) {

                chrome.windows.create({url: url, type: 'popup', incognito: currentWindow.incognito}, function (window) {

                    var loginTabId = window.tabs[0].id;
                    var loginWindowId = window.id;

                    self.loginTabId = loginTabId;

                    /// If login username is present, force user to login with that username
                    if (userToLogin) {
                        _forceUsernameLogin(loginTabId, userToLogin);
                    }

                    chrome.windows.onRemoved.addListener(function onRemovedPopup(windowId) {
                        if (windowId === loginWindowId) {
                            console.debug("windows.onRemoved ! ", windowId);

                            chrome.windows.onRemoved.removeListener(onRemovedPopup);

                            var e = new LoginAbortException(userToLogin);
                            if (errorCb instanceof Function) {
                                errorCb(e);
                            } else {
                                throw e;
                            }
                        }
                    });

                    chrome.tabs.onUpdated.addListener(function checkAccessToken(tabId, changeInfo, tab) {
                        if (tabId !== loginTabId) {
                            return;
                        }

                        // check for access token availability
                        if (!(changeInfo.url)) {
                            return;
                        }
                        console.debug("tabs.onUpdated ! ", tabId, changeInfo);
                        try {
                            var loginSuccess = _finish(changeInfo.url, startRequestTime);
                        } catch (e) {
                            console.debug("Error on _finish! ", e);
                            _removeLoginTab();
                            chrome.tabs.onUpdated.removeListener(checkAccessToken);
                            if (errorCb instanceof Function) {
                                errorCb(e);
                            } else {
                                throw e;
                            }
                        }

                        if (loginSuccess) {
                            /// return to extension popup
                            // unregister listener
                            chrome.tabs.onUpdated.removeListener(checkAccessToken);
                            return successCb instanceof Function ? successCb(loginSuccess) : "OK";
                        } else {
                            // not finished yet..
                        }
                    });
                });
            });
        },

        checkToken: function (auth) {
            var tokenContainer = auth;

            if (!tokenContainer || !tokenContainer.token || !tokenContainer.expires || new Date(tokenContainer.expires) < new Date()) {
                return false;
            }

            return tokenContainer;
        }
    }
})();