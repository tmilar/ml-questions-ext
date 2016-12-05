"use strict";

var QuestionsModule = (function QuestionsModule() {

    var self = {};

    function populateItems(questionsData) {
        if (!questionsData.total) return questionsData;
        // for each q in data.questions
        // q.item = findItemById(q.item_id)
        var itemsInQuestions = _.uniq(_.map(questionsData.questions, 'item_id'));
        var questionsByItemId = _.groupBy(questionsData.questions, 'item_id');

        var itemsPromise = Promise.map(itemsInQuestions, function (item_id) {
            var itemGetUrl = "https://api.mercadolibre.com/items/" + item_id;
            return Promise.resolve($.get(itemGetUrl));
        });

        itemsPromise.then(function (itemsData) {
            _.each(itemsData, function (itemData) {
                var questionsForItem = questionsByItemId[itemData.id];
                _.each(questionsForItem, function (q) {
                    q.item = itemData;
                })
            });
        });

        return itemsPromise.thenReturn(questionsData);
    }

    function populateFromUsers(questionsData) {
        if (!questionsData.total) return questionsData;

        // for each q in data.questions
        // q.from.user = findUserDataById(q.from.id)
        var userPerQuestion = _.uniq(_.map(questionsData.questions, 'from.id'));

        var questionsByUserId = _.groupBy(questionsData.questions, 'from.id');

        var usersPromise = Promise.map(userPerQuestion, function (user_id) {
            var userGetUrl = "https://api.mercadolibre.com/users/" + user_id;
            return Promise.resolve($.get(userGetUrl));
        });

        usersPromise.then(function (usersData) {
            _.each(usersData, function (userData) {
                var questionsForItem = questionsByUserId[userData.id];
                _.each(questionsForItem, function (q) {
                    q.from.user = userData;
                })
            });
        });

        return usersPromise.thenReturn(questionsData);
    }

    function initialize(loggedUser) {

        if (!loggedUser || !loggedUser.user.id || !loggedUser.token) {
            console.error("Can't initialize questions, login first. ", loggedUser);
            return;
        }

        var alreadyLoggedUsers = $(".username").text();

        if (alreadyLoggedUsers.indexOf(loggedUser.user.nickname) > -1) {
            console.error("User " + loggedUser.user.nickname + " was already logged in! No new questions added." );
            return;
        }

        var loadingMsgs = ["Deployando a la NASA", "Macerando las uvas", "Volcando el yogur", "Leyendo el Quijote"];
        waitMe.start({selector: ".questions", text: _.sample(loadingMsgs)});

        self.user = loggedUser.user;
        self.token = loggedUser.token;

        return getMeliQuestions()
            .then(populateItems)
            .then(populateFromUsers)
            .then(toItemsGroups)
            .then(render)
            .then(function () {
                waitMe.stop();
            })
            .catch(function (err) {
                console.error("Error al intentar recuperar info de las preguntas: " + err.message);
            });
    }

    /*
     * ==================
     * ML API calls
     * ==================
     */
    function getMeliQuestions() {
        return $.ajax({
            type: 'GET',
            url: 'https://api.mercadolibre.com/questions/search' + '?' + 'seller_id=' + self.user.id + '&access_token=' + self.token + '&status=' + 'UNANSWERED',
            error: function error(e, a, c) {
                var errMsg = "Descr: GET questions for user " + self.user.id + ". Msg: " + e.responseJSON.message;
                console.error(errMsg, e);
                e.message = errMsg;
            }
        });
    }

    function postAnswer(text, question_id) {
        return $.ajax({
            type: 'POST',
            data: JSON.stringify({question_id: question_id, text: text}),
            url: 'https://api.mercadolibre.com/answers' + '?'
            + 'access_token=' + self.token,
            error: function error(e) {
                var errMsg = "Descr: POST answer for user " + self.user.id + ", question: " + question_id + ". Status: " + e.status;
                e.message = errMsg;
                return e;
            }
        });
    }

    function toItemsGroups(questionsData) {
        var result = {
            total: questionsData.total,
            itemsGroups: [],
            user: self.user
        };

        if (!result.total) {
            return Promise.resolve(result);
        }

        var questionsByItem = _.groupBy(questionsData.questions, 'item_id');

        var firstItemsGroup = _.map(questionsByItem, function (questions, itemId) {

            var itemQuestions = {
                item_id: itemId,
                item: questions && questions[0] ? questions[0].item : undefined,
                questions: questions
            };

            return itemQuestions;
        });

        result.itemsGroups[0] = firstItemsGroup;

        console.log("items groups result:", result);

        return Promise.resolve(result);
    }

    function toggleAllQuestions(e) {
        var $questions = $(e.target).parents().siblings(".seller").find(".question");

        $questions.each(function () {
            e.target.checked ? _openQuestion($(this)) : _closeQuestion($(this));
        });
    }

    function _openQuestion($question) {
        $question.removeClass('question--closed', 200).addClass('question--opened');
    }

    function _closeQuestion($question) {
        $question.addClass('question--closed', 200).removeClass('question--opened');
    }

    function clickCloseQuestion(e) {
        e.stopPropagation();
        e.preventDefault();
        var $question = $(this).closest('.question--opened');

        _closeQuestion($question);
    }

    function clickOpenQuestion(e) {
        var $question = $(this).closest('.question--closed');
        _openQuestion($question);
    }

    function _removeItem($item) {
        $item.hide("drop", {direction: "right"}, 1000);
    }

    function _removeQuestion($question) {
        $question.hide("slide", {
            direction: "right",
            /// todo check empty container...
            complete: function removeContainer() {
                var $questionsContainer = $question.closest(".questions-container");
                if ($questionsContainer.children(":visible").length === 0) {
                    var $item = $questionsContainer.closest("section.card");
                    _removeItem($item);
                }
            },
            duration: "slow"
        });
    }

    function validateAnswerNotEmpty($question) {
        var text = $question.find('textarea').val();
        var emptyAnswer = !text || !text.length;
        $question.find(".empty-field").toggle(emptyAnswer);
        if (emptyAnswer) {
            _animateAnswerError($question);
            throw new Error("El texto de la respuesta no puede estar vacio!");
        }
    }


    function validateAnswerNoSpecialChars($question) {
        var text = $question.find('textarea').val();

        var xssValidator = new RegExp("(<|>)", "g");
        var hasSpecialChars = xssValidator.test(text);
        $question.find(".special-chars").toggle(hasSpecialChars);

        if (hasSpecialChars) {
            _animateAnswerError($question);
            throw new Error("El texto de la respuesta no puede estar vacio!");
        }
    }

    function _animateAnswerError($question) {
        $question.effect("shake", {direction: "right", times: 2, distance: 8}, 450);
    }

    function clickRespondButton(e) {
        e.stopPropagation();
        e.preventDefault();
        var $question = $(this).closest(".question");
        //TODO validate and display err
        validateAnswerNotEmpty($question);
        validateAnswerNoSpecialChars($question);

        var text = $question.find('textarea').val();
        var question_id = parseInt($question.attr('id'), 10);

        postAnswer(text, question_id)
            .then(_removeQuestion.bind(null, $question))
            .catch(function (err) {
                $question.find(".server-error").show();
                _animateAnswerError($question);
                console.error("Error al enviar respuesta! " + err.message);
            })
    }

    function hideErrorMessages(e) {
        var $question = $(this).closest(".question");
        $question.find(".ch-box-warn, .ch-box-error ").hide();
    }

    function clickRemoveAccount(e) {
        var $userHeader = $(e.target).closest('div[data-js="user-header"]');
        var userId = $userHeader.attr("id");
        var userName = $userHeader.find(".username").text();
        var removeConfirm = confirm("Estas seguro que deseas remover la cuenta " + userName + "?");
        if(removeConfirm) {
            console.log("Eliminado el user ", userName, " (id: ", userId, ")");
            Auth.removeUser(userId);
            $userHeader.closest("main").hide("explode", {pieces: 50}, 1200, function() {
                $(this).remove();
                _updateScroller();
            });
        }
    }

    function _updateScroller() {
        $(".nano").nanoScroller({
            // this is needed due to some bug that triggers infinite resets...
            disableResize: true
        });
    }

    function render(questionsData) {
        var compiledHbs = MeliPreguntasApp.templates['questions-view'](questionsData, {
            helpers: {
                toJSON: function (object) {
                    return JSON.stringify(object, undefined, 2);
                }
            }
        });
        var $target = $(".questions.content");

        console.log("Loading questions data.. ", questionsData);

        $target.append(compiledHbs);

        var $userSection = $("#" + self.user.id).parent();
        /* View Events */
        // Open/Close
        $userSection.find('input[data-js="open-all"]').on('change', toggleAllQuestions);
        $userSection.find('.question').on('click', clickOpenQuestion);
        $userSection.find('a[data-js="question-btn-cancel"]').on('click', clickCloseQuestion);

        // Text box focus
        $userSection.find('.question').find('textarea').on('focus', hideErrorMessages);

        // Respond
        $userSection.find('.question-replay__btn-submit').on('click', clickRespondButton);

        // Remove account
        $userSection.find('.account__btn-delete').on('click', clickRemoveAccount);

        // Update scroller
        _updateScroller();
    }

    return {
        initialize: initialize
    }
});