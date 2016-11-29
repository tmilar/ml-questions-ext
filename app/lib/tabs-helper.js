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
            if(!tabs.length) {
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
            if(!tab) {
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

