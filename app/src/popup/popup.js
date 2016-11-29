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


function startLogin() {
  return new Promise(window.oauth2.start.bind(window.oauth2));
}

function configureLogin() {
  window.oauth2.options.full_url = "http://auth.mercadolibre.com.ar/authorization?response_type=token&client_id=3791482542047777";
}

$(document).on("ready", function () {
  configureLogin();
  waitMe.start({selector: '.container', text: "iniciando sesion..."});

  startLogin()
    .then(function () {
      console.log("Login good!");
    })
    .then(function () {
      // TODO handle user_id response data?
      return Promise.resolve($.ajax({
        type: 'GET',
        url: 'https://api.mercadolibre.com/users/me?access_token=' + window.oauth2.getToken().token,
        success: function (data) {
          console.log("sucess! ", data);
        }
      }))
    })
    .catch(function (err) {
      console.error("Login bad: " + err.stack);
    })
    .finally(function () {
      waitMe.stop();
    });
});