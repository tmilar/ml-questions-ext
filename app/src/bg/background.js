'use strict';

chrome.runtime.onInstalled.addListener(function (details) {
    console.log('previousVersion', details.previousVersion);
});

var openQuestions = 0;

chrome.browserAction.setBadgeBackgroundColor({color: "#FF0000"});

function updateBadgeText(value) {
    chrome.browserAction.setBadgeText({text: value ? value.toString() : ''});
}

chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {
    console.debug("message received > ", request);
    switch (request.type) {
        case "questions:load": {
            openQuestions += request.data.total;
            updateBadgeText(openQuestions);
            break;
        }
        case "questions:remove": {
            openQuestions -= 1;
            updateBadgeText(openQuestions);
            break;
        }
        case "questions:restart": {
            openQuestions = 0;
            updateBadgeText(openQuestions);
        }
    }
});
