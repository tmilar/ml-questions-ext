'use strict';

var waitMe = {
    $el: '.container',
    start: function start(options) {
        waitMe.$el = options && options.selector ? options.selector : waitMe.$el;
        $(waitMe.$el).waitMe(_.extend({}, {
            effect: 'orbit',
            bg: 'rgba(245,245,245,0.7)',
            color: '#000',
            maxSize: '120',
            onClose: function onClose() {
                console.log('[waitme] hide ' + waitMe.$el);
            }
        }, options));
    },
    setText: function setText(text) {
        $(".waitMe_text").html(text);
    },
    stop: function stop(selector) {
        $(selector || waitMe.$el).waitMe('hide');
    }
};


function loginSuccess(user) {
    QuestionsModule().initialize(user);
}

function _updateScroller() {
    $(".nano").nanoScroller({
        // this is needed due to some bug that triggers infinite resets...
        disableResize: true
    });
}
chrome.extension.sendMessage({type: "questions:restart"});

$(document).ready(function () {
    Auth.on('login', loginSuccess);
    Auth.init();

    $(".add-account").on('click', function () {
        Auth.newLogin();
    });
    _updateScroller();
});
