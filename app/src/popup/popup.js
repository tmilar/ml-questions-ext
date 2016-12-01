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

function startLogin() {
    waitMe.start({selector: '.container', text: "iniciando sesion..."});

    return new Promise(window.oauth2.start.bind(window.oauth2))
        .then(function () {
            console.log("Login good!");
        })
        .then(function () {
            // TODO handle user_id response data?
            return Promise.resolve($.ajax({
                type: 'GET',
                url: 'https://api.mercadolibre.com/users/me?access_token=' + window.oauth2.getAuth().token,
                success: function success(data) {
                    console.log("login success! ", data);
                }
            }));
        })
        .then(loginSuccess)
        .catch(function (err) {
            console.error("Login bad: " + err.stack);
        })
        .finally(function () {
            waitMe.stop();
        });
}

function configureLogin() {
    window.oauth2.options.full_url = "http://auth.mercadolibre.com.ar/authorization?response_type=token&client_id=3791482542047777";
    window.oauth2.options.user_id = "user_id";
}

function getMeliQuestions() {
    return Promise.resolve($.ajax({
        type: 'GET',
        url: 'https://api.mercadolibre.com/questions/search' + '?' + 'seller_id=' + window.oauth2.getAuth().user_id + '&access_token=' + window.oauth2.getAuth().token + '&status=' + 'UNANSWERED',
        error: function error(e, a, c) {
            console.error("Error when trying to get questions for user " + window.oauth2.getAuth().user_id + " : " + e.responseJSON.message, e);
            throw e;
        }
    }));
}

function showQuestions(questionsData) {
    questionsData = _.pick(questionsData, ['total', 'questions']);
    questionsData.questions = _.groupBy(questionsData.questions, 'item_id');
    // TODO get item info by questionData group key
    console.log("questions received! ", questionsData);

    QuestionsModule.initialize(questionsData);
}

function loginSuccess() {
    return getMeliQuestions()
        .then(showQuestions);
}

function _checkAccessToken() {
    var userLoggedIn = window.oauth2.checkLogin();
    console.log("logged? ", userLoggedIn);
    return userLoggedIn;
}

$(document).on("ready", function () {
    configureLogin();

    if (!_checkAccessToken()) {
        startLogin();
        return;
    }

    loginSuccess();
});