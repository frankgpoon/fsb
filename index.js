/*
 * Main node.js functions for Flash Cards
 */

// Starting the app

const https = require('https');
const ApiAiApp = require('actions-on-google').ApiAiApp;
const express = require('express');
const bodyParser = require('body-parser');
const restService = express();

restService.use(bodyParser.json());

/* Consts (for actions, contexts, lines) */

// Actions
const WELCOME_ACTION = 'input.welcome';
const FIND_USER_SET_ACTION = 'find_user_set';
const ASK_FIRST_QUESTION_ACTION = 'ask_first_question';
const GIVE_ANSWER_ACTION = 'give_answer';

// Arguments
const SET_ARGUMENT = 'set';
const USER_ARGUMENT = 'user';
const DECISION_ARGUMENT = 'decision';

// Contexts
const ASK_FOR_SET_CONTEXT = 'ask_for_set';
const SHUFFLE_CONTEXT = 'shuffle';
const QUESTION_ASKED_CONTEXT = 'question_asked';
const FINISHED_SET_CONTEXT = 'finishe_set';

// Lines

/* Helper Functions */

/*
 * Knuth shuffle: https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
 * Uniformly shuffles the elements of an array.
*/
function shuffle(array) {
    let counter = array.length;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);

        // Decrease counter by 1
        counter--;

        // And swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
}

/* Main Function - includes all fulfillment for actions */
// Express handling the POST endpoint
restService.post('/', function(request, response) {
    console.log('headers: ' + JSON.stringify(request.headers));
    console.log('body: ' + JSON.stringify(request.body));

    const app = new ApiAiApp({request: request, response: response});

    function welcomeMessage(app) {
        if (typeof app.getUser().accessToken === 'string') {
            app.ask('Hi, welcome to Flash Cards. What Quizlet set would you like to be tested on?');
        } else {
            app.askForSignIn(dialogState); // uses phone for oauth linking
        }
    }

    /*
     * GET requests for a user's sets and finds the matching set to user input via HTTP request
     * to Quizlet API. Asks user if cards in set should be shuffled. If unable to find user or set,
     * tells user and prompts for another set.
     */
    function findUserSet(app) {
        // get user arg and string arg from intent
        var set_name = app.getArgument(SET_ARGUMENT).replace(/\s/g,'').toLowerCase();
        var user_name = app.getArgument(USER_ARGUMENT).replace(/\s/g,'').toLowerCase();
        console.log('set: ' + set_name);
        console.log('user_name: ' + user_name);

        // parameters for get request
        var options = {
            host: 'api.quizlet.com',
            path: '/2.0/users/' + user_name + '/sets',
            client_id: 'yfX2Tq7BtT',
            headers: {'Authorization': 'Bearer ' + app.getUser().accessToken}
        };

        // callback - aka what to do with the response
         https.get(options, (res) => {
            var raw_data = ''; // empty JSON
            res.on('data', (chunk) => {
                raw_data += chunk; // data arrives chunk by chunk so we put all processing stuff at the end
            });
            // once response data stops coming the request ends and we parse the JSON
            res.on('end', () => {
                var user = JSON.parse(raw_data); // all sets by user here into a JS object
                var user_set_found = true;
                var set;

                if ('http_code' in user) {
                    user_set_found = false; // check user 404
                } else {
                    for (var i in user) {
                        var modified_title = user[i].title.replace(/\s/g,'').toLowerCase();
                        if (modified_title === set_name) {
                            set = user[i]; // finds first matching set by username, sets it to a var and breaks
                            break;
                        }
                    }
                    if (typeof set !== 'object') {
                        user_set_found = false;
                    }
                }
                if (user_set_found) {
                    app.data.current_set = set;
                    app.data.ask_if_shuffled = false;
                    app.setContext(SHUFFLE_CONTEXT);
                    console.log('current set has ' + app.data.current_set.terms.length + ' terms');
                    // verifys that the set works
                    app.ask('Okay. Do you want me to shuffle the cards in the set?');
                    // saves the found set as current set
                } else {
                    app.setContext(ASK_FOR_SET_CONTEXT);
                    app.ask('I couldn\'t find the set you were looking for. Could you say it again?');
                }
            })
        }).on('error', (e) => {
            app.tell('Unable to find set because of ' + e.message);
            console.log('Error: ' + e.message);
            // possibly unused
        });
    }

    /*
     * Takes the set of terms and gives an order to them to stimulate shuffling if needed.
     * Asks the first question/reads the first term in the set.
     */
    function askFirstQuestion(app) {
        var card_order = [];
        for (var i = 0; i < app.data.current_set.terms.length; i++) {
            card_order.push(i);
        }

        // shuffles if needed
        var need_shuffle = app.getArgument(DECISION_ARGUMENT);
        if (need_shuffle === 'yes') {
            shuffle(card_order);
        }
        console.log(card_order);

        app.data.card_order = card_order;
        app.data.position = 0;
        console.log(app.data.card_order[app.data.position]);

        // asks first terms and waits for answer
        var term = app.data.current_set.terms[app.data.card_order[app.data.position]].term;
        app.setContext(QUESTION_ASKED_CONTEXT);
        app.ask('The first term is ' + term + '.');
    }

    /*
     * Takes in user answer, says the correct answer to the user, then asks the next question.
     */
    function giveAnswer(app) {
        // take in last user answer
        // tell correct answer
        // increment index in position array
        // say next term and set context to wait for answer intent
        var correct_answer = app.data.current_set.terms[app.data.card_order[app.data.position]].definition;
        if (correct_answer.charAt(correct_answer.length - 1) !== '.') {
            correct_answer = correct_answer + '.';
        }

        app.data.position++;
        if (app.data.position == app.data.current_set.terms.length) {
            app.setContext(FINISHED_SET_CONTEXT);
            app.ask('The correct definition is: ' + correct_answer + ' We are done with the set. Would you like to be tested again?');
        } else {
            var term = app.data.current_set.terms[app.data.card_order[app.data.position]].term;
            app.setContext(QUESTION_ASKED_CONTEXT);
            app.ask('The correct definition is: ' + correct_answer + ' The next term is ' + term + '.');
        }
        // TODO: verify user answer and compare with Quizlet answer

    }

    function finishedSet(app) {
        var decision = app.getArgument(DECISION_ARGUMENT);
        if (decision == 'yes') {
            askFirstQuestion(app);
        } else {
            app.tell('This was a fun study session! Goodbye.');
        }
    }

    const actionMap = new Map();
    //map functions to actions - .set(ACTION, FUNCTION)
    actionMap.set(FIND_USER_SET_ACTION, findUserSet);
    actionMap.set(WELCOME_ACTION, welcomeMessage);
    actionMap.set(ASK_FIRST_QUESTION_ACTION, askFirstQuestion);
    actionMap.set(GIVE_ANSWER_ACTION, giveAnswer);
    actionMap.set(FINISHED_SET_ACTION, finishedSet);

    app.handleRequest(actionMap);
});

// express instance listening for a user request.
restService.listen((process.env.PORT || 5000), function () {
    console.log('Server listening');
});
