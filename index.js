/*
 * Main node.js functions for Flash Cards
 */

// Starting the app

process.env.DEBUG = 'actions-on-google:*';
let ApiAiApp = require('actions-on-google').ApiAiApp;
let sprintf = require('sprintf-js').sprintf;

/* Consts (for actions, contexts, lines) */

// Actions
const FIND_USER_SET_ACTION = 'find_user_set';

// Arguments
const SET_ARGUMENT = 'set';
const USER_ARGUMENT = 'user';

// Contexts

// Lines

/* Helper Functions */

/* Main Function - includes all fulfillment for actions */
exports.flashcards = function (request, response) {
    console.log('headers: ' + JSON.stringify(request.headers));
    console.log('body: ' + JSON.stringify(request.body));

    const app = new ApiAiApp({request, response});

    function signIn(app) {
        app.askForSignIn();
    }

    function signInHandler(app) {
        if (app.getSignInStatus() === app.SignInStatus.OK) {
            let accessToken = app.getUser().accessToken;
            // access account data with the token
        } else {
            app.tell('You need to sign-in before using the app.');
        }
    }

    function findUserSet(app) {
        // get user arg and string arg from intent
        let set = app.getArgument(SET_ARGUMENT);
        let user = app.getArgument(USER_ARGUMENT);
        // check if user is null - default to current user if true
        if (!user) {
            user = 'user_id'; // check if it works with quizlet!
        }


    }



    const actionMap = new Map();
    //map functions to actions
    app.handleRequest(actionMap);
}
