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
    stop: function stop() {
        $(waitMe.$el).waitMe('hide');
    }
};


function loginSuccess(user) {
    QuestionsModule().initialize(user);
}

$(document).ready(function () {
    Auth.on('login', loginSuccess);
    Auth.init();

    $(".add-account").on('click', function () {
        Auth.startLogin();
    });
});