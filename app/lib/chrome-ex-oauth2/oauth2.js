(function () {

    var options = {
        access_token_url: "https://github.com/login/oauth/access_token",
        authorization_url: "https://github.com/login/oauth/authorize",
        client_id: "323cafc6718f7670fede",
        client_secret: "5b1210837e4f094d4983bb07fbb5601d558fdef7",
        redirect_url: "https://github.com/robots.txt",
        scopes: [],
        key: "accessToken",
        key_expire: "accessToken_expires",
        full_url: 'https://www.facebook.com/v2.8/dialog/oauth' +
        '?client_id=162744410854883' +
        '&response_type=token' +
        '&scope=public_profile,email' +
        '&redirect_uri=https://www.facebook.com/connect/login_success.html'
    };

    function _removeLoginTab() {
        chrome.tabs.remove(window.oauth2.loginTabId);
    }

    window.oauth2 = {

        options: options,

        /**
         * Starts the authorization process.
         */
        start: function (successCb, errorCb) {

            var url = this.options.full_url ||
                this.options.authorization_url +
                "?client_id=" + this.options.client_id +
                "&redirect_uri=" + this.options.redirect_url +
                "&scopes=" + this.options.scopes.join(",");

            var self = this;

            self.startRequestTime = new Date();

            chrome.windows.create({url: url, type: 'popup'}, function (window) {
                self.loginTabId = window.tabs[0].id;

                self.loginWindowId = window.id;

                //console.log("new window opened! id: " + window.id + "tabid: " + self.loginTabId);

                chrome.tabs.onUpdated.addListener(function checkAccessToken(tabId, changeInfo, tab) {
                    if (tabId !== self.loginTabId) {
                        return;
                    }

                    // check for access token availability
                    if (!(changeInfo.url)) {
                        return;
                    }
                    //console.log("FINISH by new tab change... " + JSON.stringify(changeInfo));

                    try {
                        var loginResult = self._finish(changeInfo.url);
                    } catch (e) {
                        _removeLoginTab();
                        errorCb(e);
                        return;
                    }

                    if (loginResult) {
                        /// return to extension popup
                        // unregister listener
                        chrome.tabs.onUpdated.removeListener(checkAccessToken);
                        return successCb();
                    } else {
                        // not finished yet..
                    }
                });
            });
        },


        /**
         * Finishes the oauth2 process by exchanging the given authorization code for an
         * authorization token. The authroiztion token is saved to the browsers local storage.
         * If the redirect page does not return an authorization code or an error occures when
         * exchanging the authorization code for an authorization token then the oauth2 process dies
         * and the authorization tab is closed.
         *
         * @param url The url of the redirect page specified in the authorization request.
         */
        _finish: function (url) {

            console.log("[oauth2] finishin! url: ", url);
            var self = this;

            if (url.match(/\?error=(.+)/)) {
                console.error("[oauth2] error after login attempt. Url: ", url);
                throw new Error("Error after fb login attempt");
            }

            if (url.match(/access_token=([\w\/\-]+)/)) {
                // facebook access token
                // below you get string like this: access_token=...&expires_in=...
                var params = url.split('#')[1];

                var accessToken = url.match(/access_token=([\w\/\-]+)/)[1];
                var expireTime = Number(url.match(/expires_in=([\w\/\-]+)/)[1]);
                var userId = url.match(/user_id=([\w\/\-]+)/)[1];

                var expireDate = new Date(self.startRequestTime.getTime() + ( expireTime * 1000));

                window.localStorage.setItem(this.options.key, accessToken);
                window.localStorage.setItem(this.options.key_expire, expireDate);
                if (userId && userId.length > 0 && this.options.user_id) {
                    window.localStorage.setItem(this.options.user_id, userId);
                }
                console.log("stored access token ", accessToken, " from url ", url);
                _removeLoginTab();
                return true;
            }

            if (url.match(/\?code=([\w\/\-]+)/)) {
                // github  access token
                var code = url.match(/\?code=([\w\/\-]+)/)[1];

                var that = this;
                var data = new FormData();
                data.append('client_id', this.options.client_id);
                data.append('client_secret', this.options.client_secret);
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
                            window.localStorage.setItem(that.options.key, token);
                            _removeLoginTab();
                        }
                    } else {
                        _removeLoginTab();
                    }

                });

                xhr.open('POST', this.options.access_token_url, true);
                xhr.send(data);

                return true;
            }

            console.warn("[oauth2] finish url unhandled response ", url);
            return false;
        },

        /**
         * Retreives the authorization token from local storage.
         *
         * @return {token, expires} token if it exists, empty {} if not.
         */
        getAuth: function () {

            if (!window.localStorage.getItem(this.options.key))
                return {};

            return {
                token: window.localStorage.getItem(this.options.key),
                expires: window.localStorage.getItem(this.options.key_expire),
                user_id: window.localStorage.getItem(this.options.user_id)
            };
        },

        /**
         * Clears the authorization token from the local storage.
         */
        clearToken: function () {
            delete window.localStorage.removeItem(this.options.key);
            delete window.localStorage.removeItem(this.options.key_expire);
            if (this.options.user_id) {
                delete window.localStorage.removeItem(this.options.user_id);
            }
        },

        checkLogin: function () {
            var tokenContainer = this.getAuth();

            if (!tokenContainer || !tokenContainer.token || new Date(tokenContainer.expires) < new Date()) {
                this.clearToken();
                return false;
            }

            return true;
        }
    }
})();