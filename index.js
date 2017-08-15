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
const FIND_SET_ONLY_ACTION = 'find_set_only';
const ASK_FIRST_QUESTION_ACTION = 'ask_first_question';
const GIVE_ANSWER_ACTION = 'give_answer';
const FINISHED_SET_ACTION = 'finished_set';
const EXIT_ACTION = 'exit';
const HELP_ACTION = 'help';

// Arguments
const SET_ARGUMENT = 'set';
const USER_ARGUMENT = 'user';
const DECISION_ARGUMENT = 'decision';

// Contexts
const ASK_FOR_SET_CONTEXT = 'ask_for_set';
const SHUFFLE_CONTEXT = 'shuffle';
const QUESTION_ASKED_CONTEXT = 'question_asked';
const FINISHED_SET_CONTEXT = 'finished_set';

// Lines
const ACKNOWLEDGEMENT_LINE = ['Okay. ', 'Alright. ', 'Sounds good. ', 'Awesome. ', 'Cool. '];
const QUERY_FOR_SET_LINE = 'What set would you like to be tested on? '

const EXIT_LINE_1 = ['I hope you enjoyed studying with me. ', 'Thanks for studying with me. '
                    , 'This was a fun study session. ']
const EXIT_LINE_2 = ['Goodbye! ', 'Talk to you later! ', 'Until next time! ', 'See you soon! '];

// Other Useful Constants
const SSML_START = '<speak>';
const SSML_END = '</speak>';

/* Helper Functions */

// Utility Functions

/*
 * Knuth shuffle: Uniformly shuffles the elements of an array.
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

/*
 * Uses given path/API call and returns an object with headers for Quizlet HTTP requests.
 */
function getHttpRequestOptions(app, path) {
    var options = {
        host: 'api.quizlet.com',
        path: path,
        headers: {'Authorization': 'Bearer ' + app.getUser().accessToken}
    };
    return options;
}

/*
 * Retrieves a random line from arrays of lines above.
 */
function getRandomLine(line) {
    if (typeof line === 'object') {
        let index = Math.floor(Math.random() * line.length);
        return line[index];
    } else {
        return line;
    }
}

// Response Functions

/*
 * Assigns given set to app.data for retrieval, sets the context for shuffling and asks user if
 * cards should be shuffled.
 */
function assignSet(app, set) {
    app.data.current_set = set;
    app.data.ask_if_shuffled = false;
    app.setContext(SHUFFLE_CONTEXT);
    app.ask(getRandomLine(ACKNOWLEDGEMENT_LINE)
    + 'Do you want me to shuffle the cards in the set?');
}

/*
 * Tells the user that the set was not found and sets context to ask for another set,
 */
function setNotFound(app) {
    app.setContext(ASK_FOR_SET_CONTEXT);
    app.ask('I couldn\'t find the set you were looking for.'
    + ' Could you say it again?');
}

/* Main Function - includes all fulfillment for actions */
// Express handling the POST endpoint
restService.post('/', function(request, response) {
    console.log('headers: ' + JSON.stringify(request.headers));
    console.log('body: ' + JSON.stringify(request.body));

    const app = new ApiAiApp({request: request, response: response});

    /*
     * Exits the app.
     */
    function exit(app) {
        app.tell(getRandomLine(EXIT_LINE_1) + getRandomLine(EXIT_LINE_2));
    }

    /*
     * Explains to the user what flash cards can do.
     */
    function help(app) {
        app.setContext(ASK_FOR_SET_CONTEXT);
        app.ask('I can find Quizlet sets using a set name, but giving me a username helps a lot. '
        + 'After I find your set, I can shuffle it if you want. Then, I can read terms, '
        + 'After you answer, I can read the correct answer for you to check.');
    }

    /*
     * Greets user and asks for a set, or prompts for sign in.
     */
    function welcomeMessage(app) {
        if (typeof app.getUser().accessToken === 'string') {
            app.ask('Welcome to Flash Cards! I can test you on Quizlet sets. '
            + QUERY_FOR_SET_LINE);
        } else {
            app.tell('Sign in on your phone or another device to continue.');
            app.askForSignIn(); // uses phone for oauth linking
        }
    }

    /*
     * GET requests for a user's sets and finds the matching set to user input via HTTP request
     * to Quizlet API. Asks user if cards in set should be shuffled. If unable to find user or set,
     * tells user and prompts for another set.
     */
    function findUserSet(app) {
        // get user arg and string arg from intent
        var user_name = app.getArgument(USER_ARGUMENT).replace(/\s/g,'').toLowerCase();
        var set_name = app.getArgument(SET_ARGUMENT).replace(/\s/g,'').toLowerCase();

        // parameters for get request
        var options = getHttpRequestOptions(app, '/2.0/users/' + user_name + '/sets')

        // callback - aka what to do with the response
         https.get(options, (res) => {
            var raw_data = ''; // empty JSON
            res.on('data', (chunk) => {
                raw_data += chunk; // data arrives chunk by chunk
            });
            // once response data stops coming the request ends and we parse the JSON
            res.on('end', () => {
                var user = JSON.parse(raw_data); // all sets by user here into a JS object
                var set_found = true;
                var set;

                if ('http_code' in user) {
                    set_found = false; // check user 404
                } else {
                    for (var i in user) {
                        var modified_title = user[i].title.replace(/\s/g,'').toLowerCase();
                        if (modified_title === set_name) {
                            set = user[i]; // finds first matching set by username and breaks
                            break;
                        }
                    }
                    if (typeof set !== 'object') {
                        set_found = false;
                    }
                }
                if (set_found) {
                    app.data.current_set = set;
                    assignSet(app, set);
                } else {
                    setNotFound(app);
                }
            });
        }).on('error', (e) => {
            app.tell('Unable to find set because of ' + e.message);
            console.log('Error: ' + e.message);
            // possibly unused
        });
    }

    /*
     * Finds a set using the search endpoint and uses the first result returned, telling the user
     * if no sets are found.
     */
    function findSetOnly(app) {
        set_name = app.getArgument(SET_ARGUMENT).replace(/\s/g,'%20');

        var options = getHttpRequestOptions(app, '/2.0/search/sets?q=' + set_name);

        https.get(options, (res) => {
            var raw_data = ''; // empty JSON
            res.on('data', (chunk) => {
                raw_data += chunk;
            });
            // once response data stops coming the request ends and we parse the JSON
            res.on('end', () => {
                var query = JSON.parse(raw_data); // processes data received from query

                if (query.total_results !== 0) {
                        var set_id = query.sets[0].id;
                        var set_options = getHttpRequestOptions(app, '/2.0/sets/' + set_id);

                        https.get(set_options, (res) => {
                            var raw_data = '';
                            res.on('data', (chunk) => {
                                raw_data += chunk;
                            });
                            res.on('end', () => {
                                var set = JSON.parse(raw_data);
                                assignSet(app, set);
                            });
                        }).on('error', (e) => {
                            app.tell('Unable to find set because of ' + e.message);
                            console.log('Error: ' + e.message);
                            // possibly unused
                        });
                } else {
                    setNotFound(app);
                }
            });
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

        app.data.card_order = card_order;
        app.data.position = 0;

        // asks first terms and waits for answer
        var term = app.data.current_set.terms[app.data.card_order[app.data.position]].term;
        app.setContext(QUESTION_ASKED_CONTEXT);
        app.ask(SSML_START + 'Awesome. I\'ll list a term, and then you can answer.'
        + ' Afterwards, I\'ll say the correct answer for you to check. <break time="2s"/>'
        + 'The first term is ' + term + '.' + SSML_END);
    }

    /*
     * Takes in user answer, says the correct answer to the user, then asks the next question.
     */
    function giveAnswer(app) {
        // take in last user answer
        // tell correct answer
        // increment index in position array
        // say next term and set context to wait for answer intent
        var correct_answer =
            app.data.current_set.terms[app.data.card_order[app.data.position]].definition;
        if (correct_answer.charAt(correct_answer.length - 1) !== '.') {
            correct_answer = correct_answer + '.';
        }

        app.data.position++;
        if (app.data.position == app.data.current_set.terms.length) {
            app.setContext(FINISHED_SET_CONTEXT);
            app.ask(SSML_START + 'The correct answer is: <break time="1s"/>' + correct_answer
            + '<break time="2s"/> We are finished with this set. Would you like to be tested again?'
            + SSML_END);
        } else {
            var term = app.data.current_set.terms[app.data.card_order[app.data.position]].term;
            app.setContext(QUESTION_ASKED_CONTEXT);
            app.ask(SSML_START + 'The correct answer is: <break time="1s"/>' + correct_answer
            + '<break time="2s"/> The next term is ' + term + '.' + SSML_END);
        }
    }

    /*
     * Either ends convo or asks for another set.
     */
    function finishedSet(app) {
        var decision = app.getArgument(DECISION_ARGUMENT);
        if (decision == 'yes') {
            app.setContext(ASK_FOR_SET_CONTEXT);
            app.ask(getRandomLine(ACKNOWLEDGEMENT_LINE)
            + QUERY_FOR_SET_LINE);
        } else {
            app.tell(getRandomLine(EXIT_LINE_1) + getRandomLine(EXIT_LINE_2));
        }
    }

    const actionMap = new Map();
    actionMap.set(FIND_USER_SET_ACTION, findUserSet);
    actionMap.set(FIND_SET_ONLY_ACTION, findSetOnly);
    actionMap.set(WELCOME_ACTION, welcomeMessage);
    actionMap.set(ASK_FIRST_QUESTION_ACTION, askFirstQuestion);
    actionMap.set(GIVE_ANSWER_ACTION, giveAnswer);
    actionMap.set(FINISHED_SET_ACTION, finishedSet);
    actionMap.set(EXIT_ACTION, exit);
    actionMap.set(HELP_ACTION, help)

    app.handleRequest(actionMap);
});

// express instance listening for a user request.
restService.listen((process.env.PORT || 5000), function () {
    console.log('Server listening');
});
