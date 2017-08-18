/*
 * Main node.js functions for Flashcard Study Buddy
 */

// Starting the app

const HOSTING_URL = 'https://quizzy-7c397.firebaseapp.com';

process.env.DEBUG = 'actions-on-google:*';
const https = require('https');
const ApiAiApp = require('actions-on-google').ApiAiApp;
const functions = require('firebase-functions');

/* Consts (for actions, contexts, lines) */

// Actions
const WELCOME_ACTION = 'input.welcome';
const FIND_USER_SET_ACTION = 'find_user_set';
const FIND_SET_ONLY_ACTION = 'find_set_only';
const RELOAD_SET_ACTION = 'reload_set';
const ASK_FIRST_QUESTION_ACTION = 'ask_first_question';
const GIVE_ANSWER_ACTION = 'give_answer';
const FINISHED_SET_ACTION = 'finished_set';
const EXIT_ACTION = 'exit';
const HELP_ACTION = 'help';
const SHUFFLE_FALLBACK_ACTION = 'shuffle_fallback';
const FINISHED_SET_FALLBACK_ACTION = 'finished_set_fallback';

// Arguments
const SET_ARGUMENT = 'set';
const USER_ARGUMENT = 'user';
const DECISION_ARGUMENT = 'decision';

// Contexts
const ASK_FOR_SET_CONTEXT = 'ask_for_set';
const SHUFFLE_CONTEXT = 'shuffle';
const QUESTION_ASKED_CONTEXT = 'question_asked';
const NO_MORE_TERMS_CONTEXT = 'no_more_terms';

// Lines
const ACKNOWLEDGEMENT_LINE = ['Okay. ', 'Alright. ', 'Sounds good. ', 'Awesome. ', 'Cool. '];
const QUERY_FOR_SET_LINE = 'What set would you like to be tested on? '
const EXIT_LINE_1 = ['I hope you enjoyed studying with me. ', 'Thanks for studying with me. '
                    , 'This was a fun study session. ']
const EXIT_LINE_2 = ['Goodbye! ', 'Talk to you later! ', 'Until next time! ', 'See you soon! '];
const END_OF_SET_LINE = 'We are finished with this set. Would you like to be tested again?';
const YES_NO_FALLBACK_LINES = ['Sorry, what was that?',
								'I didn\'t quite get that. Did you say yes or no?',
								'I\'m really sorry, I can\'t understand. Was that yes or no?'];

// Other Useful Constants
const SSML_START = '<speak>';
const SSML_END = '</speak>';
const YES_NO_SUGGESTION = ['Yes', 'No'];
const NO_ANSWER_SUGGESTION = 'I don\'t know the answer';

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
 * Calls the Quizlet API to find the set given from options
 */
function findSet(app, options) {
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
                        console.error('Error: ' + e.message);
                        // possibly unused
                    });
            } else {
                setNotFound(app);
            }
        });
    }).on('error', (e) => {
        app.tell('Unable to find set because of ' + e.message);
        console.error('Error: ' + e.message);
        // possibly unused
   });
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

/*
 * Formats the correct amswer to a SimpleResponse.
 */
function formatAnswer(term, correct_answer) {
    return 'Here is the answer for ' + term + ': <break time="1s"/>' + correct_answer
    + ' <break time="1s"/>';
}

/*
 * Formats the next term into a statement.
 */
function formatTerm(term, first) {
    if (first) {
        return 'The first card says ' + term + '.';
    } else {
        return 'The next card says ' + term + '.';
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
    if (app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)) {
        app.ask(
            app.buildRichResponse().addSimpleResponse(
                getRandomLine(ACKNOWLEDGEMENT_LINE)
                + 'Do you want me to shuffle the cards in the set?'
            ).addSuggestions(YES_NO_SUGGESTION)
        );
    } else {
        app.ask(getRandomLine(ACKNOWLEDGEMENT_LINE)
        + 'Do you want me to shuffle the cards in the set?');
    }
}

/*
 * Tells the user that the set was not found and sets context to ask for another set,
 */
function setNotFound(app) {
    app.setContext(ASK_FOR_SET_CONTEXT, 1);
    app.ask('I couldn\'t find the set you were looking for.'
    + ' Could you say it again?');
}
/*
 * Prompts the user a fallback line, escalating in urgency each time a fallback is
 * triggered. At the 4 escalation, or 4th time a fallback is triggered, the convo will
 * exit.
 */
function fallbackEscalation(app) {
	var fallback_count = parseInt(app.data.fallback_count, 10);
	if (fallback_count === 3) { // 3 maximum escalation levels
		app.tell('It looks like I\'m not working properly right now. '
            + 'Maybe we should try again later.');
	} else {
		fallback_count++;
        app.data.fallback_count = fallback_count;
    	app.ask(YES_NO_FALLBACK_LINES[fallback_count - 1]);
    }
}

/* Main Function - includes all fulfillment for actions */
// Express handling the POST endpoint
exports.flashcards = functions.https.onRequest((request, response) => {
    console.log('headers: ' + JSON.stringify(request.headers));
    console.log('body: ' + JSON.stringify(request.body));

    const app = new ApiAiApp({request, response});
    app.data.fallback_count = 0;

    /*
     * Greets user and asks for a set, or prompts for sign in.
     */
    function welcomeMessage(app) {
        console.log('Calling function welcomeMessage for user ID ' + app.getUser().userId);
    	app.data.fallback_count = 0;
        if (typeof app.getUser().accessToken === 'string') {
            if (app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)) {
                app.ask(
                    app.buildRichResponse().addSimpleResponse(
                        'Welcome to Flashcard Study Buddy! I can test you on Quizlet sets. '
                            + QUERY_FOR_SET_LINE
                    ).addSuggestions('What can you do?')
                )
            } else {
                app.ask('Welcome to Flashcard Study Buddy! I can test you on Quizlet sets. '
                    + QUERY_FOR_SET_LINE);
            }
        } else {
            if (!app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)) {
                app.tell('Sign in to your Quizlet account on another device to continue.');
            }
            app.askForSignIn(); // uses phone for oauth linking
        }
    }

    /*
     * Exits the app.
     */
    function exit(app) {
        console.log('Calling function exit for user ID ' + app.getUser().userId);
        app.tell(getRandomLine(EXIT_LINE_1) + getRandomLine(EXIT_LINE_2));
    }

    /*
     * Explains to the user what Flashcard Study Buddy can do.
     */
    function help(app) {
        console.log('Calling function help for user ID ' + app.getUser().userId);
        app.setContext(ASK_FOR_SET_CONTEXT, 1);
        app.ask('I can find Quizlet sets to test you with if you tell me the name of the set. '
        + 'Or, you can give me a set name and a username and I can find a specific set to use. '
        + 'Try something like, "test me on set name", or "test me on set name by username".');
    }

    /*
     * GET requests for a user's sets and finds the matching set to user input via HTTP request
     * to Quizlet API. Asks user if cards in set should be shuffled. If unable to find user or set,
     * tells user and prompts for another set.
     */
    function findUserSet(app) {
        console.log('Calling function findUserSet for user ID ' + app.getUser().userId);
        // get user arg and string arg from intent
        var user_name = app.getArgument(USER_ARGUMENT).replace(/\s/g,'').toLowerCase();
        var set_name = app.getArgument(SET_ARGUMENT).replace(/\s/g,'%20').toLowerCase();

        // parameters for get request
        var options = getHttpRequestOptions(app, '/2.0/search/sets?creator=' + user_name
                                            + '&q=' + set_name);
        app.data.fallback_count = 0;
        // callback - aka what to do with the response
        findSet(app, options);
    }

    /*
     * Finds a set using the search endpoint and uses the first result returned, telling the user
     * if no sets are found.
     */
    function findSetOnly(app) {
        console.log('Calling function findSetOnly for user ID ' + app.getUser().userId);
        set_name = app.getArgument(SET_ARGUMENT).replace(/\s/g,'%20');

        var options = getHttpRequestOptions(app, '/2.0/search/sets?q=' + set_name);
        app.data.fallback_count = 0;
        findSet(app, options);
    }

    function reloadSet(app) {
        console.log('Calling function reloadSet for user ID ' + app.getUser().userId);
        if (typeof app.data.current_set === 'object') {
            assignSet(app, app.data.current_set);
        } else {
            setNotFound(app);
        }
    }

    /*
     * Takes the set of terms and gives an order to them to stimulate shuffling if needed.
     * Asks the first question/reads the first term in the set.
     */
    function askFirstQuestion(app) {
        console.log('Calling function askFirstQuestion for user ID ' + app.getUser().userId);
        var card_order = [];
        for (var i = 0; i < app.data.current_set.terms.length; i++) {
            card_order.push(i);
        }
        app.data.fallback_count = 0; // resets the fallback escalation count.
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
        if (app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)) {
            app.ask(
                app.buildRichResponse().addSimpleResponse(
                    SSML_START + getRandomLine(ACKNOWLEDGEMENT_LINE)
                        + 'I\'ll read a card, and then you can answer. <break time="1s"/>'
                        + formatTerm(term, true) + SSML_END
                ).addSuggestions(NO_ANSWER_SUGGESTION)
            );
        } else {
            app.ask(
                SSML_START + getRandomLine(ACKNOWLEDGEMENT_LINE)
                    + 'I\'ll read a card, and then you can answer. <break time="1s"/>'
                    + formatTerm(term, true) + SSML_END
                );
        }
    }

    /*
     * Takes in user answer, says the correct answer to the user, then asks the next question.
     */
    function giveAnswer(app) {
        console.log('Calling function giveAnswer for user ID ' + app.getUser().userId);
        // take in last user answer
        // tell correct answer
        // increment index in position array
        // say next term and set context to wait for answer intent
        var old_term = app.data.current_set.terms[app.data.card_order[app.data.position]].term;
        var correct_answer =
            app.data.current_set.terms[app.data.card_order[app.data.position]].definition;
        if (correct_answer.charAt(correct_answer.length - 1) !== '.') {
            correct_answer = correct_answer + '.';
        }
        app.data.position++;

        if (app.data.position === app.data.current_set.terms.length) {
            app.setContext(NO_MORE_TERMS_CONTEXT);
            if (app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)) { // if screen
                app.ask(app.buildRichResponse().addSimpleResponse(
                        {
                            speech: SSML_START + formatAnswer(old_term, correct_answer) + SSML_END,
                            displayText: 'Here is the answer.'
                        }
                    ).addBasicCard(
                        app.buildBasicCard(correct_answer).setTitle(old_term)
                    ).addSimpleResponse(
                    END_OF_SET_LINE// second bubble
                    ).addSuggestions(YES_NO_SUGGESTION)
                )
            } else {
                app.ask(
                    SSML_START + formatAnswer(old_term, correct_answer) + END_OF_SET_LINE
                    + SSML_END
                    );
            }
        } else {
            var term = app.data.current_set.terms[app.data.card_order[app.data.position]].term;
            app.setContext(QUESTION_ASKED_CONTEXT);
            if (app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)) {
                app.ask(app.buildRichResponse().addSimpleResponse( // bubble
                        {
                            speech: SSML_START + formatAnswer(old_term, correct_answer) + SSML_END,
                            displayText: 'Here is the answer.'
                        }
                    ).addBasicCard( // card
                        app.buildBasicCard(correct_answer).setTitle(old_term)
                    ).addSimpleResponse(
                        formatTerm(term, false) // second bubble
                    ).addSuggestions(NO_ANSWER_SUGGESTION)
                )
            } else {
                app.ask(
                    SSML_START + formatAnswer(old_term, correct_answer) + formatTerm(term, false)
                    + SSML_END
                    );
            }
        }
    }

    /*
     * Either ends convo or asks for another set.
     */
    function finishedSet(app) {
        console.log('Calling function finishedSet for user ID ' + app.getUser().userId);
    	app.data.fallback_count = 0;
        var decision = app.getArgument(DECISION_ARGUMENT);
        if (decision == 'yes') {
            app.setContext(ASK_FOR_SET_CONTEXT, 1);
            if (app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)) {
                app.ask(
                    app.buildRichResponse().addSimpleResponse(
                    getRandomLine(ACKNOWLEDGEMENT_LINE) + QUERY_FOR_SET_LINE
                    ).addSuggestions('Redo last set')
                );
            } else {
                app.ask(getRandomLine(ACKNOWLEDGEMENT_LINE) + QUERY_FOR_SET_LINE);
            }
        } else {
            app.tell(getRandomLine(EXIT_LINE_1) + getRandomLine(EXIT_LINE_2));
        }
    }

    /*
     * Fallback function for shuffle intent
     */
    function shuffleFallback(app) {
        console.log('Calling function shuffleFallback for user ID ' + app.getUser().userId);
    	app.setContext(SHUFFLE_CONTEXT, 1);
    	fallbackEscalation(app);
    }

    /*
     * Fallback function for finished set
     */
    function finishedSetFallback(app) {
        console.log('Calling function finishedSetFallback for user ID ' + app.getUser().userId);
    	app.setContext(NO_MORE_TERMS_CONTEXT, 1);
    	fallbackEscalation(app);
    }


    const actionMap = new Map();
    actionMap.set(FIND_USER_SET_ACTION, findUserSet);
    actionMap.set(FIND_SET_ONLY_ACTION, findSetOnly);
    actionMap.set(RELOAD_SET_ACTION, reloadSet);
    actionMap.set(WELCOME_ACTION, welcomeMessage);
    actionMap.set(ASK_FIRST_QUESTION_ACTION, askFirstQuestion);
    actionMap.set(GIVE_ANSWER_ACTION, giveAnswer);
    actionMap.set(FINISHED_SET_ACTION, finishedSet);
    actionMap.set(EXIT_ACTION, exit);
    actionMap.set(HELP_ACTION, help);
    actionMap.set(SHUFFLE_FALLBACK_ACTION, shuffleFallback);
    actionMap.set(FINISHED_SET_FALLBACK_ACTION, finishedSetFallback);

    app.handleRequest(actionMap);
});
