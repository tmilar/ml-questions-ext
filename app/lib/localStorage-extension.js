Storage.prototype.set = function (key, value) {
    if (!key) {
        return;
    }

    if (typeof value === "object") {
        value = JSON.stringify(value);
    }
    localStorage.setItem(key, value);
};

Storage.prototype.get = function (key) {
    var value = localStorage.getItem(key);

    if (!value) {
        return;
    }

    // assume it is an object that has been stringified
    if (value[0] === "{") {
        value = JSON.parse(value);
    }

    return value;
};