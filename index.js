/*
 * Main node.js functions for Flash Cards
 */

// Starting the app

const CLIENT_ID = 'yfX2Tq7BtT';
const https = require('https');
const ApiAiApp = require('actions-on-google').ApiAiApp;
const express = require('express');
const bodyParser = require('body-parser');
const restService = express();
restService.use(bodyParser.json());
const dialogState = {};

/* Consts (for actions, contexts, lines) */

// Actions
const FIND_USER_SET_ACTION = 'find_user_set';
const WELCOME_ACTION = 'input.welcome';
const SIGN_IN = 'sign.in';
// Arguments
const SET_ARGUMENT = 'set';
const USER_ARGUMENT = 'user';

// Contexts

// Lines

/* Helper Functions */

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
     * TODO: find how to get access token and test either public or private calls
     * GET requests for a user's sets and finds the matching set to user input
     */
    function findUserSet(app) {
        // get user arg and string arg from intent
        var set_name = app.getArgument(SET_ARGUMENT).replace(/\s/g,'').toLowerCase();
        var user_name = app.getArgument(USER_ARGUMENT).replace(/\s/g,'').toLowerCase();

        // parameters for get request
        var options = {
            host: 'api.quizlet.com',
            path: '/2.0/users/' + user_name + '/sets',
            client_id: CLIENT_ID, // need some way to protect this?
            headers: {'Authorization': 'Bearer ' + app.getUser().accessToken}
        };

        // TODO: Handle 404 errors with user
        // callback - aka what to do with the response
         https.get(options, (res) => {
            var raw_data = ''; // empty JSON
            res.on('data', (chunk) => {
                raw_data += chunk; // data arrives chunk by chunk so we put all processing stuff at the end
            });
            // once response data stops coming the request ends and we parse the JSON
            res.on('end', () => {
                console.log(JSON.stringify(dialogState));
                var user = JSON.parse(raw_data); // all sets by user here into a JS object
                // processing through objects

                var set;
                for (var i in user) {
                    var modified_title = user[i].title.replace(/\s/g,'').toLowerCase();
                    if (modified_title === set_name) {
                        set = user[i]; // finds first matching set by username, sets it to a var and breaks
                        break;
                    }
                }
                // TODO: handle set not found
                if (typeof set === 'object') {
                    // verifys that the set works
                    app.ask('I found ' + set.title + ' by ' + set.created_by + '. Should I shuffle the cards?');

                    // saves the found set as current set
                    app.data.currentSet = set;
                } else {
                    app.tell('I couldn\'t find the set you were looking for.')
                }
            })
        }).on('error', (e) => {
            app.tell('Unable to find set because of ' + e.message);
            console.log('Error: ' + e.message);
        });
        // handle flow to various intents
    }

    const actionMap = new Map();
    //map functions to actions - .set(ACTION, FUNCTION)
    actionMap.set(FIND_USER_SET_ACTION, findUserSet);
    actionMap.set(WELCOME_ACTION, welcomeMessage);

    app.handleRequest(actionMap);
});

// express instance listening for a user request.
restService.listen((process.env.PORT || 5000), function () {
    console.log('Server listening');
});
