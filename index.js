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
        var setName = app.getArgument(SET_ARGUMENT);
        var userName = app.getArgument(USER_ARGUMENT);
        /* check if user is null - default to current user if true - ADD LATER BC OAUTH IS STUPID
        if (!user) {
            user = 'user_id'; // check if it works with quizlet!
        }
        */
       // parameters for get request
        var requestOptions = {
            host: 'api.quizlet.com',
            path: '/2.0/users/' + userName + '/sets',
            headers: {'Authorization': 'Bearer ' + app.getUser.accessToken}
        };

        // TODO: Handle 404 errors with user
        // callback - aka what to do with the response
        requestCallback = function (response) {
            var rawData = ''; // JSON
            response.on('data', function (chunk) {
                rawData += chunk; // data arrives chunk by chunk so we put all processing stuff at the end
            });
            // once response data stops coming the request ends and we parse the JSON
            response.on('end', function () {

                var userSets = JSON.parse(rawData); // all sets by user here into a JS object
                // processing through objects
                var set;
                for (i in userSets) {
                    if (s.title === setName) {
                        set = s;
                    }
                }
                // TODO: handle set not found

                // find undesired properties and add them to array
                var propsToDelete = [];
                for (var i in set) {
                    if (i !== 'title' && i !== 'created_by' &&
                    i !== 'term_count' && i !== 'terms') {
                        propsToDelete.push(i);
                    }
                }
                //delete undesired properties
                for (var i in propsToDelete) {
                    delete set[i];
                }
                // find undesired properties again, this time in terms
                propsToDelete = [];
                for (var i = 0; i < set.terms.length; i++) {
                    for (var j in set.terms[i]) {
                        if (j !== 'term' && j !== 'definition') {
                            propsToDelete.push(j);
                        }
                    }
                }
                for (var i = 0; i < set.terms.length; i++) {
                    for (var j in propsToDelete) {
                        delete set.terms[i][j];
                    }
                }
                
                app.data.currentSet = parsedSet;
            })
        }
        // get data and end
        http.get(requestOptions, requestCallback);
    }




    const actionMap = new Map();
    //map functions to actions
    action.set(find_user_set, findUserSet);
    app.handleRequest(actionMap);
}
