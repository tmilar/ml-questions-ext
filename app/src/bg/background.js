'use strict';

chrome.runtime.onInstalled.addListener(function (details) {
    console.log('previousVersion', details.previousVersion);
});

var openQuestions = 0;

chrome.browserAction.setBadgeBackgroundColor({color: "#FF0000"});

function updateBadgeText() {
    chrome.browserAction.setBadgeText({text: openQuestions ? openQuestions.toString() : ''});
}

chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {
    console.debug("message received > ", request);
    switch (request.type) {
        // case "questions:load": {
        //     openQuestions += request.data.total;
        //     updateBadgeText(openQuestions);
        //     break;
        // }
        case "questions:remove": {
            openQuestions -= 1;
            updateBadgeText();
            break;
        }
        // case "questions:restart": {
        //     openQuestions = 0;
        //     updateBadgeText();
        // }
    }
});

var checks = 5;
function checkNewQuestions() {

    checks += 1;

    var users = UserService.getUsersArray();

    var countQuestions = Promise.reduce(users, function (count, user) {
        return QuestionsService.getQuestions.bind(user)()
            .then(function (questionsData) {
                return count + questionsData.total;
            });
    }, 0);

    countQuestions.then(function (result) {
        if(result === undefined || result === null) {
            throw new Error("Invalud total questions result!");
        }

        if(  result > openQuestions ) {
            notifyNewQuestion(result);
        }

        openQuestions = result;
        updateBadgeText();

        if(checks >= 5 && openQuestions > 0) {
            notifyOpenQuestions();
            checks = 0;
        }
    });

    countQuestions.catch(function (err) {
        console.error(err);
        new Notification("Error", { body: "No se pudieron revisar las preguntas. \n" + err ? (err.message || err) : "" });
        throw err;
    });

    return countQuestions;
}

function notifyNewQuestion(total) {
    new Notification('Nuevas pregunta!', {
        icon: 'images/melipreguntas-128.png',
        body: "Tienes una nueva pregunta por responder." + "\n(total: " + total + ")."
    });
}

function notifyOpenQuestions() {
    new Notification('Preguntas sin responder', {
        icon: 'images/melipreguntas-128.png',
        body: "Hay " + openQuestions + " sin responder."
    });
}

function startUp() {
    checkNewQuestions().catch(function () {
        setTimeout(startUp, 1000*90);
    });
}

setInterval(checkNewQuestions, 1000*60*4);