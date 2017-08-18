# fsb

(Flashcard Study Buddy)

"Okay Google, talk to Flash Cards"

A Quizlet app for Google Assistant.

---

# Resources

Basic App Deployment   - https://developers.google.com/actions/apiai/

~~Node.js~~ Literal Cancer Client Library - https://developers.google.com/actions/reference/nodejs/AssistantApp

---


# App Flow

Google Assistant apps operate on a cycle between a function (fullfillment) and an intent (agent).

Intents/Agent (user says something )--> (through Actions) --> Functions/Fullfullment (app says something) --> (through Contexts) --> Intents/Agent

Intents are basically when the app waits for the user to respond. Functions handle all the logic behind the app.

Data is stored between intents as ApiAiApp.data.* which is useful for storing sets.


## Notes

- Using the Number Genie example set by Google:

- All intents are triggered through contexts (except for the beginning intent, which is triggered by an event called GOOGLE_ASSISTANT_WELCOME)

- Input contexts are set by functions using ApiAiApp.setContext(context). The context is a string (used in API.AI). Contexts can be used for multiple intents (in the case of yes/no questions for example, both the yes intent and no intent have the same context, but different keywords to trigger different actions).

- Intents trigger actions, which in the API.AI console are strings. These strings are assigned to constants in the example, which are then used as keys to a map called the actionMap. The actionMap links actions (strings) to functions.

---

# Plan

## Notes

- Roadblock - No way to get user id. (Quizlet sends the user id with the access token in JSON format, but that is completely handled by Google. We need to find a loophole in the API to retrieve the current user id)

## To Do

- Give more personality (if applicable)

## Future Work

- Answer checking (may be hard) and maybe multiple choice parsing

- Collect limited user data and keep a history of tested sets by user for faster set retrieval/more personalized experience

- Searching your own user's set

- Better search option to match sets better using Quizlet's API

- Repeating stuff when reading flash cards/general ("What did you say?")
