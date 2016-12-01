"use strict";

var QuestionsModule = (function QuestionsModule() {

    var questions;

    function initialize(data) {
        questions = data;

        load();
    }

    function load() {
        var compiledHbs = MeliPreguntasApp.templates['questions-view'](questions);
        var target = $(".questions.content");
        var mainUrl = "src/popup/questions/html/main_test.html";
        console.log("About to load questions data.. ", questions, target);

        target.html(compiledHbs);
    }

    return {
        initialize: initialize
    }
})();