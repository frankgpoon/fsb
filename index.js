/*
 * Main node.js functions for Flash Cards
 */

// Starting the app

const http = require('http');
const ApiAiApp = require('actions-on-google').ApiAiApp;
const express = require('express');
const bodyParser = require('body-parser');
const restService = express();
restService.use(bodyParser.json());

/* Consts (for actions, contexts, lines) */

// Actions
const FIND_USER_SET_ACTION = 'find_user_set';
const WELCOME_ACTION = 'input.welcome';
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

    console.log('HI this is inside the post function');

    const app = new ApiAiApp({request: request, response: response});
    console.log('this is after app declaration');

    function welcomeMessage(app) {
        console.log('Hi this is the welcome message function');
        app.ask('Hi, welcome to Flash Cards. What Quizlet set would you like to be tested on?');
    }

    /*
     * TODO: find how to get access token and test either public or private calls
     * GET requests for a user's sets and finds the matching set to user input
     */
    function findUserSet(app) {
        // get user arg and string arg from intent
        var setName = app.getArgument(SET_ARGUMENT);
        var userName = app.getArgument(USER_ARGUMENT).trim(); // remove whitespace from voice recognized words
        app.tell('You said ' + setName + ' by ' + userName);
        console.log('Finding ' + setName + ' by ' + userName);
        /*
        // parameters for get request
        var options = {
            host: 'api.quizlet.com',
            path: '/2.0/users/' + userName + '/sets',
            client_id: 'yfX2Tq7BtT', // need some way to protect this?
            headers: {'Authorization': 'Bearer ' + app.getUser().accessToken}
        };

        // TODO: Handle 404 errors with user
        // callback - aka what to do with the response
         http.get(options, (res) => {
            var rawData = ''; // empty JSON
            response.on('data', (chunk) => {
                rawData += chunk; // data arrives chunk by chunk so we put all processing stuff at the end
            });
            // once response data stops coming the request ends and we parse the JSON
            response.on('end', () => {
                var user = JSON.parse(rawData); // all sets by user here into a JS object
                // processing through objects
                var set;
                for (var i in user) {
                    if (i.title === setName) {
                        set = i; // finds first set by userName, sets it to a var and breaks
                        break;
                    }
                }
                // TODO: handle set not found

                // verifys that the set works
                app.tell('Found ' + set.title + ' by ' + set.created_by);
                console.log('Found ' + set.title + ' by ' + set.created_by);

                // saves the found set as current set
                app.data.currentSet = set;
            })
        }).on('error', (e) => {
            app.tell('Unable to find set because of ' + e.message);
            console.log('Error: ' + e.message);
        });
        */
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
