# flashcards

"Okay Google, talk to Flash Cards"

A Quizlet app for Google Assistant.

## Resources:

Basic App Deployment   - https://developers.google.com/actions/apiai/

Node.js Client Library - https://developers.google.com/actions/reference/nodejs/AssistantApp

## Notes:

- Messages and speech are all handled through fulfillment functions

- Don't worry about making a fulfillment server, write some code first and deploy it slowly. Focus on a good conversational flow.

- Checking consistency between API.AI and our functions will be a pain in the ass.

## Input / Output Flow:

Input - an intent is triggered through an input context (only event that will trigger an intent as seen in the number genie example is GOOGLE_ASSISTANT_WELCOME)

Input contexts are set by functions using ApiAiApp.setContext(context). In the case of the example, the context is a string (used in API.AI) that is linked to a constant (used in functions). One context can only trigger one intent I believe.

Intent is basically when the Assistant waits for the user to respond.

Output - Intents trigger actions, which in API.AI console are strings. These strings are assigned to constants in the example, which are then used as keys to a map called the actionMap. The actionMap links actions (strings) to functions.

Functions set contexts to trigger other intents.

## Intents Needed:

- ask for Quizlet user and set

- ask for answer to read flash card

- basic yes/no (potentially more than one intent needed for different contexts)
