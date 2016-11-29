'use strict';

var waitMe = {
  $el: '.container',
  start: function (options) {
    waitMe.$el = (options && options.selector) ? options.selector : waitMe.$el;
    $(waitMe.$el).waitMe(_.extend({}, {
      effect: 'orbit',
      bg: 'rgba(245,245,245,0.7)',
      color: '#000',
      maxSize: '120',
      onClose: function () {
        console.log('[waitme] hide ' + waitMe.$el);
      }
    }, options));
  },
  setText: function (text) {
    $(".waitMe_text").html(text);
  },
  stop: function () {
    $(waitMe.$el).waitMe('hide');
  }
};

$(document).on("ready", function () {

  waitMe.start({selector: '.container', text: "iniciando..."});
});