/*
 * Main node.js functions for Flash Cards
 */

// Starting the app

var http = require('http');

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
        if (app.getSignInStatus() !== app.SignInStatus.OK) {
            app.tell('You need to sign-in before using the app.');
        }
    }

    function findUserSet(app) {
        // get user arg and string arg from intent
        var set = app.getArgument(SET_ARGUMENT);
        var user = app.getArgument(USER_ARGUMENT);
        /* check if user is null - default to current user if true - ADD LATER BC OAUTH IS STUPID
        if (!user) {
            user = 'user_id'; // check if it works with quizlet!
        }
        */
       // parameters for get request
        var requestOptions = {
            host: 'api.quizlet.com',
            path: '/2.0/users/' + user + '/sets',
            headers: {'Authorization': 'Bearer ' + app.getUser.accessToken}
        };
        // callback - aka what to do with the response
        requestCallback = function (response) {
            var rawData = '';
            response.on('data', function (chunk) {
                rawData += chunk; // data arrives chunk by chunk so we put all processing stuff at the end
            });
            // once response data stops coming the request ends and we parse the JSON
            response.on('end', function () {
                var userAllSets =
                app.data.currentSet = parsedSet;
            })
        }
        // get data and end
        http.get(requestOptions, requestCallback);
    }



    const actionMap = new Map();
    //map functions to actions
    app.handleRequest(actionMap);
}
