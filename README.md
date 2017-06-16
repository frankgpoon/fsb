# flashcards

"Okay Google, talk to Flash Cards"

A Quizlet app for Google Assistant.

---

# Resources

Basic App Deployment   - https://developers.google.com/actions/apiai/

Node.js Client Library - https://developers.google.com/actions/reference/nodejs/AssistantApp

---

# General Notes

- Messages and speech are all handled through fulfillment functions.

- Don't worry about making a fulfillment server, write some code first and deploy it slowly. Focus on a good conversational flow.

- Checking consistency between API.AI and our functions will be a pain in the ass.

---

# App Flow

Google Assistant apps operate on a cycle between a function (fullfillment) and an intent (agent).

Intents/Agent --> (through Actions) --> Functions/Fullfullment --> (through Contexts) --> Intents/Agent

Intents are basically when the app waits for the user to respond. Functions handle all the logic behind the app.

## Notes

- Using the Number Genie example set by Google:

- All intents are triggered through contexts (except for the beginning intent, which is triggered by an event called GOOGLE_ASSISTANT_WELCOME)

- Input contexts are set by functions using ApiAiApp.setContext(context). The context is a string (used in API.AI). Contexts can be used for multiple intents (in the case of yes/no questions for example, both the yes intent and no intent have the same context, but different keywords to trigger different actions).

- Intents trigger actions, which in the API.AI console are strings. These strings are assigned to constants in the example, which are then used as keys to a map called the actionMap. The actionMap links actions (strings) to functions.

---

# Plan

## Notes

- Using ApiAiApp to link with API.AI

## Intents Needed

- ask for Quizlet user and set

- ask for answer to read flash card

- basic yes/no (potentially more than two intents needed for different contexts)

## Functions Needed

- find user and set

- find flash card and read it

- check answer (optional)

- determine if user wants to play again
