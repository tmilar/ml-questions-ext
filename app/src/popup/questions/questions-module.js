"use strict";

var QuestionsModule = (function QuestionsModule() {

    function initialize() {

        return getMeliQuestions()
            .then(populateItems)
            .then(showQuestions);
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

        // TODO get item info by questionData group key
        console.log("questions received! ", questionsData);
        load(questionsData);
    }

    function populateItems(questionsData) {
        var items = {};

        questionsData = _.pick(questionsData, ['total', 'questions']);

        if (Number(questionsData.total) > 0) {
            questionsData.questions = _.groupBy(questionsData.questions, 'item_id');

            questionsData.itemsGroups = _.map(questionsData.questions, function (questions, itemId) {
                return {
                    item_id: itemId,
                    item: {
                        id: itemId,
                        name: "NAME_OF_ITEM",
                        url: "URL_OF_ITEM",
                        other_info: "OTHER_INFO"
                    },


                    questions: questions
                };


            });
            console.log("items groups ", questionsData);
        }

        // return Promise.map(questionsData, function (questionData) {
        //     var itemsGroup = questionData.itemsGroups;
        // });

        return Promise.resolve(questionsData);
    }

    function load(questionsData) {
        var compiledHbs = MeliPreguntasApp.templates['questions-view'](questionsData);
        var target = $(".questions.content");

        console.log("About to load questions data.. ", questionsData, target);

        target.html(compiledHbs);
    }

    return {
        initialize: initialize
    }
})();