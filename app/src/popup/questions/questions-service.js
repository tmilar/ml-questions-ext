var QuestionsService = (function QuestionsService() {
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
                    if (itemData.status !== "active") {
                        _.pull(questionsData.questions, q);
                        questionsData.total--;
                        return;
                    }
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

    function populateQuestionsHistory(questionsData) {
        if (!questionsData.total) return questionsData;

        var questionsWithHistory = _.filter(questionsData.questions, 'from.answered_questions');
        var auth = this;
        var questionsHistoryPromise = Promise.map(questionsWithHistory, function (q) {
            return getQuestionsPromise.bind(auth)({status: "ANSWERED", fromId: q.from.id, itemId: q.item_id})
                .then(function (historicQuestions) {
                    q.from.answer_history = historicQuestions;
                });
        });

        return questionsHistoryPromise.thenReturn(questionsData);
    }

    function toItemsGroups(questionsData) {
        var auth = this;
        var result = {
            total: questionsData.total,
            itemsGroups: [],
            user: auth.user
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

    /*
     * ==================
     * ML API calls
     * ==================
     */
    var getQuestionsPromise = function _getQuestionsPromise(options) {
        var auth = this;
        return Promise.resolve($.ajax({
            type: 'GET',
            url: 'https://api.mercadolibre.com/questions/search' + '?'
            + 'status=' + (options && options.status ? options.status : 'UNANSWERED')
            + (options && options.fromId ? '&from=' + options.fromId : '&seller_id=' + auth.user.id)
            + (options && options.itemId ? '&item=' + options.itemId : '')
            + '&access_token=' + auth.token,
            error: function error(e, a, c) {
                var errMsg = "Descr: GET questions for user " + auth.user.id + ". Msg: " + (e.responseJSON ? e.responseJSON.message : e || a);
                console.error(errMsg, e);
                e.message = errMsg;
            }
        }));
    };

    function getMeliQuestionsPopulated(options) {
        var auth = this;
        return Promise.bind(auth)
            .return(options)
            .then(getQuestionsPromise)
            .then(populateItems)
            .then(populateFromUsers)
            .then(populateQuestionsHistory)
            .then(toItemsGroups);
    }

    function getMeliQuestions(options) {
        var auth = this;
        return Promise.bind(auth)
            .return(options)
            .then(getQuestionsPromise)
            .then(toItemsGroups);
    }

    function postAnswer(text, question_id) {
        var auth = this;
        return Promise.resolve($.ajax({
            type: 'POST',
            data: JSON.stringify({question_id: question_id, text: text}),
            url: 'https://api.mercadolibre.com/answers' + '?'
            + 'access_token=' + auth.token,
            error: function error(e) {
                var errMsg = "Descr: POST answer for user " + auth.user.id + ", question: " + question_id + ". Status: " + e.status;
                e.message = errMsg;
                return e;
            }
        }));
    }

    function deleteQuestion(question_id) {
        var auth = this;
        return Promise.resolve($.ajax({
            type: 'DELETE',
            url: 'https://api.mercadolibre.com/questions/' + question_id + '?'
            + 'access_token=' + auth.token,
            error: function error(e) {
                var errMsg = "Descr: DELETE question for user " + auth.user.id + ", question: " + question_id + ". Status: " + e.status;
                e.message = errMsg;
                throw e;
            }
        }));
    }

    return {
        getQuestions: getMeliQuestions,
        getQuestionsPopulated: getMeliQuestionsPopulated,
        postAnswer: postAnswer,
        deleteQuestion: deleteQuestion
    };
})();

