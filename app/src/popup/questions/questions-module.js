"use strict";

var QuestionsModule = (function QuestionsModule() {

    function populateItems(questionsData) {
        if(!questionsData.total) return questionsData;
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

    function initialize() {

        return getMeliQuestions()
            .then(populateItems)
            .then(toItemsGroups)
            .then(render)
            .catch(function (err) {
                console.error("Error al intentar recuperar info de las preguntas: " + err.stack);
            });
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

    function toItemsGroups(questionsData) {
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

        console.log("Loading questions data.. ", questionsData);

        target.html(compiledHbs);
    }

    return {
        initialize: initialize
    }
})();