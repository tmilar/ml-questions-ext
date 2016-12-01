"use strict";

var QuestionsModule = (function QuestionsModule() {

    function initialize() {

        return getMeliQuestions()
            .then(populateItems)
            .then(render);
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

    function populateItems(questionsData) {
        var result = {
            total: questionsData.total,
            itemsGroups: []
        };

        if (!result.total) {
            return Promise.resolve(result);
        }

        var questionsByItem = _.groupBy(questionsData.questions, 'item_id');

        var firstItemsGroup = _.map(questionsByItem, function (questions, itemId) {

            var itemQuestions = {
                item_id: itemId,
                item: {
                    id: itemId,
                    name: "NAME_OF_ITEM",
                    url: "URL_OF_ITEM",
                    other_info: "OTHER_INFO"
                },
                questions: questions
            };

            return itemQuestions;
        });

        result.itemsGroups[0] = firstItemsGroup;

        console.log("items groups result:", result);

        return Promise.resolve(result);
    }

    function render(questionsData) {
        var compiledHbs = MeliPreguntasApp.templates['questions-view'](questionsData, {
            helpers: {
                toJSON: function (object) {
                    return JSON.stringify(object, undefined, 2);
                }
            }
        });
        var target = $(".questions.content");

        console.log("About to load questions data.. ", questionsData);

        target.html(compiledHbs);
    }

    return {
        initialize: initialize
    }
})();