"use strict";

var QuestionsModule = (function QuestionsModule() {

    var self = {};
    var auth = {};

    function initialize(loggedUser) {

        if (!loggedUser || !loggedUser.user.id || !loggedUser.token) {
            console.error("Can't initialize questions, login first. ", loggedUser);
            return;
        }

        self.user = loggedUser.user;
        self.token = loggedUser.token;

        auth = _.pick(self, "token", "user");
        showQuestions();
    }

    function showQuestions() {
        var loadingMsgs = ["Deployando a la NASA", "Macerando las uvas", "Volcando el yogur", "Leyendo el Quijote"];
        var waitMeSelector = "#status-" + self.user.id;
        waitMe.start({selector: waitMeSelector, text: _.sample(loadingMsgs)});

        return QuestionsService.getQuestions(auth)
            .then(sendToBackground)
            .then(render)
            .then(function () {
                waitMe.stop(waitMeSelector);
                $(waitMeSelector).hide();
            })
            .catch(function (err) {
                console.error("Error al intentar recuperar info de las preguntas: " + err.message);
            });
    }

    function sendToBackground(questionItems) {
        chrome.extension.sendMessage({type: "questions:load", data: questionItems});
        return questionItems;
    }


    function toggleAllQuestions(e) {
        var $questions = $(e.target).parents().siblings(".seller").find(".question");

        $questions.each(function () {
            e.target.checked ? _openQuestion($(this)) : _closeQuestion($(this));
        });
    }

    function _openQuestion($question) {
        $question.removeClass('question--closed', 200).addClass('question--opened', function (e) {
            $question.find('textarea').focus();
            _updateScroller();
        });
    }

    function _closeQuestion($question) {
        $question.addClass('question--closed', 200).removeClass('question--opened', _updateScroller);
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
        $(this).find('textarea').focus();
    }

    function _removeItem($item) {
        $item.hide("drop", {direction: "right"}, 1000);
    }

    function _removeQuestion($question) {
        $question.hide("slide", {
            direction: "right",
            complete: function removeContainer() {
                var $questionsContainer = $question.closest(".questions-container");
                if ($questionsContainer.children(":visible").length === 0) {
                    var $item = $questionsContainer.closest("section.card");
                    _removeItem($item);
                }
                // decrease total questions
                $question.closest(".questions").find(".questions-total").each(function () {
                    var totalQuestions = parseInt($(this).text(), 10);
                    $(this).text(totalQuestions - 1);
                });
                // notify removed queston
                chrome.extension.sendMessage({type: "questions:remove"});
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

        validateAnswerNotEmpty($question);
        validateAnswerNoSpecialChars($question);

        var text = $question.find('textarea').val();
        var question_id = parseInt($question.attr('id'), 10);

        QuestionsService.postAnswer.bind(auth)(text, question_id)
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

    function clickDeleteButton(e) {
        e.stopPropagation();
        e.preventDefault();
        var $question = $(this).closest(".question");
        var question_id = parseInt($question.attr('id'), 10);

        QuestionsService.deleteQuestion.bind(auth)(question_id)
            .then(_removeQuestion.bind(null, $question))
            .catch(function (err) {
                $question.find(".server-error").show();
                _animateAnswerError($question);
                console.error("Error al eliminar pregunta! " + err.message);
            })
    }

    function render(questionsData) {
        var compiledHbs = MeliPreguntasApp.templates['questions-section'](questionsData, {
            helpers: {
                toJSON: function (object) {
                    return JSON.stringify(object, undefined, 2);
                },
                fromNow: function (datetime) {
                    moment.locale("es");
                    return moment(datetime).fromNow();
                },
                capitalize: function (str) {
                    return str[0].toUpperCase() + str.slice(1);
                }
            }
        });

        console.log("Loading questions data.. ", questionsData);

        var $userSection = $("#" + self.user.id).find(".questions");
        $userSection.append(compiledHbs);
        /* View Events */
        // Open/Close
        $userSection.find('input[data-js="open-all"]').on('change', toggleAllQuestions);
        $userSection.find('.question').on('click', clickOpenQuestion);
        $userSection.find('a[data-js="question-btn-cancel"]').on('click', clickCloseQuestion);

        // Text box focus
        $userSection.find('.question').find('textarea').on('focus', hideErrorMessages);

        // Respond
        $userSection.find('.question-replay__btn-submit').on('click', clickRespondButton);

        // Delete question
        $userSection.find('.question-replay__btn-delete, a[data-js="delete-modal-trigger"]').on('click', clickDeleteButton);

        // Update scroller
        _updateScroller();
    }

    return {
        initialize: initialize
    }
});