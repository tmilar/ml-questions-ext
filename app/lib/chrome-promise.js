/*
 *  TabNotFound Error custom
 */
function TabNotFound(url) {
    this.message = "Couldn't find opened tab" + (url ? " of url: " + url : "");
    this.name = "TabNotFound";
}
TabNotFound.prototype = new Error();

function findOpenedTabByUrl(url) {
    return new Promise(function (resolve, reject) {
        chrome.tabs.query({url: url}, function (tabs) {
            if (chrome.runtime.lastError) {
                var e = new Error(chrome.runtime.lastError.message);
                return reject(e);
            }
            if (!tabs.length) {
                return reject(new TabNotFound(url));
            }
            // get first active tab, or else first available tab
            var found = tabs.find(function (t) {
                return t.active;
            });
            resolve(found || tabs[0]);
        });
    });
}

function focusTab(tab) {
    return new Promise(function (resolve, reject) {
        window.close();
        chrome.tabs.update(tab.id, {active: true}, function (tab) {
            if (!tab) {
                return reject(new Error("error when trying to focus tab"));
            }
            window.close();
            return resolve(tab);
        });
    });
}

function openTab(url) {
    return new Promise(function (resolve, reject) {
        return chrome.tabs.create({url: url}, resolve);
    });
}


var CookiePromise = (function CookiePromise() {

    /*
     * options.domainFilter = /^(?!(\.oldsite)|(developers)|(domain)|(content)).*\/
     */
    function getCookies(options) {
        options = _.defaults(options, {
            domainFilter: /^(?!(\.oldsite)|(developers)|(domain)|(content)).*/
        });
        return new Promise(function (resolve, reject) {
            chrome.cookies.getAll({}, function (cookies) {
                if (chrome.runtime.lastError) {
                    var e = new Error(chrome.runtime.lastError.message);
                    console.error(e);
                    reject(e);
                }
                if (_.isEmpty(cookies)) {
                    console.warn("No cookies obtained with options: ", options);
                }

                var result = cookies;
                if (options.domainFilter) {
                    result = _.filter(result, function (c) {
                        return options.domainFilter.test(c.domain);
                    });
                }
                console.debug("Obtained", cookies.length, "cookies, of which only " + result.length + " are relevant: \n", result);
                resolve(result);
            })
        });
    }

    function _cookieDomainToUrl(cookie) {
        var domain = cookie.domain.replace(/\.www/, "www");
        var www = (domain.indexOf("www") >= 0) ? "" : "www";
        return "http" + (cookie.secure ? "s" : "") + "://" + www + domain + cookie.path;
    }

    function removeCookie(cookie) {
        return new Promise(function (resolve, reject) {
            var removeDetails = {"url": _cookieDomainToUrl(cookie), "name": cookie.name};

            chrome.cookies.remove(removeDetails, function (removed) {
                if (chrome.runtime.lastError) {
                    var e = new Error(chrome.runtime.lastError.message);
                    reject(e);
                }

                console.debug("Removed cookie!", removed);
                resolve(removed);
            });
        });
    }

    function restoreCookie(cookie) {
        return new Promise(function (resolve, reject) {
            var restoredValues = _.pick(cookie, ["url", "name", "value", "domain", "path", "secure", "httpOnly", "sameSite", "expirationDate", "storeId"]);
            restoredValues.url = _cookieDomainToUrl(cookie);

            console.debug("Restoring cookie: ", restoredValues.url, restoredValues.name);

            chrome.cookies.set(restoredValues, function (r) {
                if (chrome.runtime.lastError) {
                    var e = new Error("cookie restored bad: " + chrome.runtime.lastError.message);
                    reject(e);
                }
                console.debug("Restored cookie:", restoredValues.url, restoredValues.name, ". Result:", r);
                resolve(r);
            });
        })
    }

    return {
        get: getCookies,
        remove: removeCookie,
        restore: restoreCookie
    }
})();