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
        '&redirect_uri=https://www.facebook.com/connect/login_success.html',
        forceNewLogin: false
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

        console.log("[oauth2] finishin! url: ", url);

        if (url.match(/\?error=(.+)/)) {
            console.error("[oauth2] error after login attempt. Url: ", url);
            throw new Error("Error after fb login attempt");
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

            console.log("stored access token ", accessToken, " from url ", url);
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

        console.warn("[oauth2] finish url unhandled response ", url);
        return false;
    }

    function _restoreCookies(cookies) {
        _.each(cookies, function (c) {
            var restored = _.pick(c, ["url", "name", "value", "domain", "path", "secure", "httpOnly", "sameSite", "expirationDate", "storeId"]);
            var www = (c.domain.indexOf("www") >= 0) ? "" : "www";
            restored.url = "http" + (c.secure ? "s" : "") + "://" + www + c.domain + c.path;

            console.log("Restoring cookie: ", restored, " from: ", c);
            chrome.cookies.set(restored, function(r) {
                if (chrome.runtime.lastError) {
                    var e = new Error(chrome.runtime.lastError.message);
                    console.log("cookie restored bad: ", r);
                    console.error(e);
                }
            });
        })
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

            var startRequestTime = new Date();

            chrome.windows.getCurrent(function (currentWindow) {
                /// Clear cookies for a new login....
                // 1 cs = get cookies
                // 2 process login
                // 3 restore cookies
                chrome.cookies.getAll({}, function (cookies) {

                    var sessionCookies = self.sessionCookies = _.filter(cookies, function (c) {
                        return /^(?!(\.oldsite)|(developers)|(domain)|(content)).*/.test(c.domain);
                    });

                    console.log("las de session: \n", sessionCookies);

                    var cookiesToRemove = sessionCookies.length;
                    var removedCount = 0;
                    _.each(sessionCookies, function (cookie) {
                        var cookieUrl = "http" + (cookie.secure ? "s" : "") + "://www" + cookie.domain + cookie.path;

                        chrome.cookies.remove({"url": cookieUrl, "name": cookie.name}, function (removed) {
                            if (chrome.runtime.lastError) {
                                var e = new Error(chrome.runtime.lastError.message);
                                console.error(e);
                            }
                            removedCount++;
                            if (removedCount !== cookiesToRemove) {
                                return;
                            }
                            console.log("Removed ", removedCount, " cookies! continuing new login. (total was", cookiesToRemove, ").");

                            chrome.windows.create({
                                url: url,
                                type: 'popup',
                                incognito: currentWindow.incognito
                            }, function (window) {
                                self.loginTabId = window.tabs[0].id;
                                self.loginWindowId = window.id;

                                chrome.windows.onRemoved.addListener(function onRemovedPopup(windowId) {
                                    if(windowId === window.id) {
                                        _restoreCookies(sessionCookies);
                                        chrome.windows.onRemoved.removeListener(onRemovedPopup);
                                    }
                                });

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
                                        var loginResult = _finish(changeInfo.url, startRequestTime);
                                    } catch (e) {
                                        _removeLoginTab();
                                        if (errorCb instanceof Function) {
                                            errorCb(e);
                                            return;
                                        } else {
                                            throw e;
                                        }
                                    }

                                    if (loginResult) {
                                        /// return to extension popup
                                        // unregister listener
                                        chrome.tabs.onUpdated.removeListener(checkAccessToken);
                                        return successCb instanceof Function ? successCb(loginResult) : "OK";
                                    } else {
                                        // not finished yet..
                                    }
                                });
                            });
                        })
                    })
                });
            });
        },

        /**
         * Retreives the authorization token from local storage.
         *
         * @return Object containing token & user login info
         */
        getAuth: function () {
            return localStorage.get(options.key);
        },

        checkToken: function (auth) {
            var tokenContainer = auth || this.getAuth();

            if (!tokenContainer || !tokenContainer.token || new Date(tokenContainer.expires) < new Date()) {
                return false;
            }

            return tokenContainer;
        }
    }
})();