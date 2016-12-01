"use strict";

var QuestionsModule = (function QuestionsModule() {

    var questions;

    function initialize(data) {
        questions = data;

        load();
    }

    function load() {
        var target = $(".questions.content");
        var mainUrl = "src/popup/questions/html/main_test.html";
        console.log("About to load questions data.. ", questions, target);

        target.load(mainUrl, function (response, status, xhr) {
            if (status === "error") {
                console.error("Error al cargar la vista de preguntas: " + xhr.status + " " + xhr.statusText);
                return;
            }
            console.log("Vista preguntas, cargada ok!", mainUrl);
        });
    }

    return {
        initialize: initialize
    }
})();