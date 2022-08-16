# Bard

- [About it](#about-it)
- [Introduction to Bard](#bard)
- [Declaring a Chatbot](#chatbot)
- [Conversation Flow](#conversation-flow)
    - [Trailing Layer](#trailing-layer)
    - [Incoming Layer](#incoming-layer)
    - [Outgoing Layer](#outgoing-layer)
    - [Additional Course functions](#course-functions)
- [Events](#events)
- [Message Gateway](#message-gateway)
    - [Receive a message](#receiving-a-message)
    - [Sending a message](#sending-a-message)
- [Putting it all together](#putting-it-all-together)
    - [Organizing Dialogs](#organizing-dialogs)
- [Tutorials](#tutorials)
- [Examples (*Outdated*)](#examples)
- [Considerations](#considerations)

## About it
> TL;DR: Frameworks are messy and I created one to try to solved it for myself. 

I am working with chatbots for some time now, and I gone through many frameworks (*good* and *not so good* ones).

No matter which one I choose, there will always be something that, in time, will make things harder than it should. That *weak point*, most of the time, was some difficulty to generalize code and/or to create custom functionalities.

Some of them had graphical interfaces, others don't, just plain code. I had more difficult to make custom pieces of code/functionality on graphical frameworks, although it can be fast/useful for simple projects. I preferred mostly plain code frameworks, but then I realize that *customizability* comes with a salty price.

I came up with some concepts to try to solve that, polished the best I could. The result was a simple framework that allow you to create a conversation flow (chatbot) and link it to any message broker that you wish to.

## Bard

It is a chatbot framework that allows you to create your own chatbot and link it to any message broker. It is completely written in NodeJS/Typescript, but you can import it to your NodeJS/Javascript code too.

You can easily install it on your NodeJS project using NPM:
```bash
npm i --save bard-builder
```

Basically it is composed of two sections, the **conversation flow** and the **message gateway**.

Using its components, you can easily create a **conversation flow** that are interlinked. After that, you can connect it to your preferred message broker using the **message gateway**.

## Chatbot

It is simple to create, just import the bard module and create a Bot instance:

```typescript
import {Bot} from "bard-builder";
const bot = new Bot({state: {}});

/* to start both conversation flow and message gateway */
bot.start();
```

Or using `require`/`module.exports` (vannila js):

```javascript
const bard = require("bard-builder");
const bot = new bard.Bot({state: {}});

bot.start();
```

==Remeber to use the `bard.` prefix when not using ES6 modules import==

After you instantiate your chatbot, you can start creating the conversation flow.

### State:

You can pass the parameter `state` to Bot settings as the initial state value. This will be used to create the base for our state. And you also can ensure a type for it, passing as Generics parameter:

```typescript
interface State {
    products_sold: number
    have_discount?: boolean
}

const bot = new Bot<State>({state: {
    products_sold: 0
}});
```

## Conversation flow

Conversation flow consists of layers, the **incoming layer**, the **trailing layer** and the **outgoing layer**. All of them can have multiple **dialogs** (layer's items) and each one have its own behavior (**dialogs** are compound of steps, in other words, an array of functions).

- **Incoming layer**: acts almost like a queue, new dialogs will be inserted at the end of it and. Every chatbot interaction will land here first. It will execute all **dialogs** in the inserted order (first-in first-executed), ==if you want to proceed to the next **dialog** you must to ensure that `course.next()` is declared on the last step of that **dialog**==. From that, you can redirect the interaction to any **trailing** point you want to. If you don't redirect the interaction manually, at the end of all existent **dialogs**, it goes to the first inserted **trailing dialog** (you must specify on the last existent **dialog** that you want to continue, using `course.next()`);

- **Trailing layer**: is dynamic, meaning that **dialogs** are loose and must be linked using `course.replace("dialog-name")`. It have an entry point, which is the first **dialog** inserted. It receive all interactions that pass through the **incoming layer**;

- **Outgoing layer**: is the last layer, it acts like a queue, similar to the **incoming layer**, but it can't redirect the interaction and it will only be triggered if the interaction reached the **trailing layer**;

Each **dialog step** (function) receives two objects, **session** and **course.**  **Session** can be used to get the interaction information, to send messages and to end the session itself, resetting the progress. **Course** can be used to manage the flow, replace dialogs, jump to steps, etc.

### Trailing Layer

A good example of a **trailing layer** dialog:

```typescript
/*
    This conversation flow will ask the user a question and based on his response
    it will send some message, then it will say bye and end the session.
*/
bot.trailing("greetings", [
    (course, course) => {
        session.send("Hello, how are you?");
        /*
            stops flow and wait for the next interation,
            that will be handled by the next step-function
        */
        course.wait();
    },
    (session, course) => {
        /* get user message from session */
        const message = session.getMessage().data;
        
        if (message == "good") session.send("Nice!");
        else session.send("Bad :/");
        
        /* redirect the current interaction to the "goodbye" dialog */
        course.replace("goodbye");
    }
]);

bot.trailing("goodbye", [
    (session, course) => {
        session.send("Goodbye!");
        /* session.end() reset all conversation progress (steps, state, etc) and delete the current session */
        session.end();
    }
]);
```

Above we have a simple conversation flow that asks a question and waits for a response. We can use `session.send(message)` to send messages to user and, in this case, ask the question `How are you?`. After that ==we must stop the flow and wait for the user response, otherwise it will continue directly to the next **step function**== with the same user message, making it useless. So, to do that we need to use `course.wait()`, it will save the course progress and wait for the next user interaction, that will be handled by the next **step function**. After that we can get the new user response and send a answer based on it. Done that, we want to say bye to our user, so we are redirecting the course to a new dialog using `course.replace("goodbye")`. There ("goodbye dialog") we have a bye message and a `session.end()` call that reset the session and all its members, like state and user info.

### Incoming Layer

We can evolve that in something more complex. Using **incoming layer** dialogs, we can extract intents from user input and use it to manage the flow.

We can create an **incoming dialog** that just do that:

```javascript
/* create a incoming dialog to understand the user interaction intention */
bot.incoming("understand-intents", [
    (session, course) => {
        /* clear previous intent from state (it is a state bound to the session) */
        session.state.intent = null;
        
        /* get message and its data from session */
        const message = session.getMessage().data;

        /* simulate a cognitive engine/API */
        let intent = null;
        if (data == "good") intent = "something-good";
        else if (data == "bad") intent = "something-bad";
        else if (data == "idiot") intent = "something-rude";

	    /* set the intent into session state, can be retrieve later on */
        if (intent) session.state.intent = intent;

        /* ensure to keep the flow going */
        return course.next();
    }
]);

/* example of usage */
bot.trailing("begin-dialog", [
    (session, course) => {
        const intent = session.state.intent;
        if (intent != null) session.send(`Your intention was: '${intent}'`);
        else session.send("Can't detected any intention");
        /* course.end() will reset progress, but it will keep the session and its values */
        course.end();
    }
]);
```
The main purpose of the example above is to show how easy is to connect/integrate APIs and cognitive engines into the flow. In the **incoming dialog** ("understand-intents") we used the user input to simulate an API call, then we set the result into the `session.state`, that are a get/setter object that you can use to store/retrieve values wherever you want in the conversation flow. After that, we can retrieve that understanding value in the "begin-dialog" using `session.state.intent` and sends a message to the user with it. The `course.end()` call will reset the course progress ==but keep all session and its data, unlike `session.end()` that resets everything==. We could also put a filter that redirect the interaction to a dialog based on the user input or it meaning, making it easier to create a diverse flow. If you want to save some values at the end of the conversation, like analytics data, you can use the **outgoing layer**.

### Outgoing Layer

**Outgoing layer** dialogs can be used to do some operations after the interaction completes (after trailing). An example of this:

```javascript
/* create an outgoing dialog to save data after interaction */
bot.outgoing("save-data", [
    (session, course) => {
        /* set to known if already have one or more interations */
        session.state.known = true;
    }
]);

/* example of usage */
bot.trailing("begin-dialog", [
    (session, course) => {
        /* get known data */
        const known = session.state.known;
        
        /* if user already interacted, then send a different message to him */
        let greeting = "Hello, nice to meet you! How are you?";
        if (known) greeting = "Nice to see you again! How are you doing?";
        
        session.send(greeting);
        course.end();
    }
]);
```

The above example show us how we can use the **outgoing layer** to save and retrieve data to manipulate the conversation flow. Every time an user interacts with the chatbot a message will be choose, if the user already interacted, it will send a `Nice to see you again!` message, otherwise a `Hello, nice to meet you!` one. To know if the user already interacted we can set a "known" flag at the end of any **trailing** interaction using `session.state.known = true`. When the user enters the **trailing** "begin-dialog", we can check if the flag "known" is set to true, than choose the respective message.

### Course Functions

There are others **course** functions that may be helpful, here are all of them:
```javascript
course.next() // advance to the next step
course.begin(dialog) // acts like replace, but it will jump back to the previous dialog when finished (must call course.next() at end)
course.skip() // skip all dialog steps started with course.begin()
course.jump(2) or course.jump("product_step") // jump to any step on the current dialog using its index or the step name
course.reset() // jump back to the first step of the dialog, alias for course.jump(0)
course.again() // repeats the same step
course.replace(dialog, step?) // replace and move to another dialog
course.end() // reset dialog to the root dialog (starts from begin again)
```

You can also set the function step as an object, there declaring the name of it. Then you can call `course.jump("STEP_NAME")` and move to it:

```typescript
bot.trailing("example", [
    {name: "STEP_NAME", action: (session, course) => {
        session.state.hey_count += 1;
        session.send("Hey!");
        course.next();
    }},
    (session, course) => {
        if (session.state.hey_count < 3) {
            course.jump("STEP_NAME");
            return;
        }
        course.end();
    }
]);

// produces: Hey! Hey! Hey!
```

We have some examples on the `examples` folder of this source code.

## Events

Events are custom actions that can be triggered when something happen in the chatbot. Here is the list of events:

```javascript
/* most used events */
ON_RECEIVE_MESSAGE // trigger when chatbot receives a message"
ON_SEND_MESSAGE // trigger when chatbot sends a message"
ON_CREATE_SESSION // trigger when a new session is created"
ON_DELETE_SESSION // trigger when a session is deleted"
ON_EXPIRE_SESSION // trigger when a session is expired (sessions have TTL)"

/* other events */
ON_LOCK_SESSION // trigger when a session is locked because of being used
ON_UNLOCK_SESSION // trigger when a session is unlocked
ON_REFRESH_SESSION // refresh session expiration date
```

It will fire these actions every time an event occur. An example of it:

```typescript
const {Events} = require("bard-builder");

bot.event(Events.ON_RECEIVE_MESSAGE, (params) => {
    console.log(`Incoming message ${params.message?.data}.`);
});

bot.event(Events.ON_SEND_MESSAGE, (params) => {
    console.log(`Outgoing message ${params.message?.data}.`);
});
```

## Message Gateway

It is a mediator (not the pattern) between your **message broker** and the **conversation flow**. You can use `bot.push(message)` to insert a **outgoing message** or `bot.pull()` to retrieve a **incoming message**.

### Receiving a Message

To insert a **outgoing message** you must to instantiate a message object first. You can use the `Message` class to do it:

```typescript
const {Message} = require("bard-builder");

const message = new Message(
    "user-contact", "user-session", "message-broker-origin",
    "message-data"
);

...

/* and push it to the bot instance */
bot.push(message);
```

You probably are receiving from **message broker** by a **webhook**, so we will need to create one (you can use other frameworks, but to simplify we will just use `"express"`, that is a excellent a reliable framework).

```typescript
const {Bot, Message} = require("bard-builder");
const express = require("express");

const bot = new Bot({name: "bot-name"});
... /* declare dialogs and start bot */

const server = express();

/* to parse JSON body */
server.use(express.json());

server.post("/receive/message", (request, response) => {
    const body = request.body;
    /* use bot.push(message_object) to send a message to the conversation flow */
    bot.push(new Message(body.contact, body.session, body.origin, body.data));
    return response.status(200).send("OK");
});

server.listen(8888);
```

You can create a switch to handle all incoming message types and set the respective one into the `Message` instance.

Above we are receiving a **incoming message** from a **webhook** and creating/inserting the `Message` instance into the **conversation flow** using `bot.push(message)`.

Every time it happens a new interaction is executed in the **conversation flow**.

### Sending a Message

To send a reply for the messages sent by the **conversation flow**, in response to the ones received, we can use `bot.pull()` function. It will pull a **outgoing message** from the **conversation flow**. We can do it by creating a pulling system and sending all **outgoing messages** to our **message broker**:

```typescript
const {Bot} = require("bard-builder");
const MyBroker = require("my-broker");

const bot = new Bot({name: "bot-name"});
... /* declare dialogs and start bot */

/* declare your message broker */
const message_broker = new MyBroker({token: "token"});

function pullProcess() {
    /* get message from chatbot */
    const message = bot.pull();
    /* if it is an Error instance, re-run this with delay (probably empty) */
    if (message instanceof Error) {
        return setTimeout(pullProcess, 500);
    }

    /* send message to message broker */
    message_broker.sendMessage(message);

    /* re-run this */
    return setImmediate(pullProcess);
}

/* start pulling messages and sending it to the message broker */
pullProcess();
```

We are declaring our **message broker** and creating a function that calls itself repeatedly to pull messages from the **conversation flow**. The pulling function try to get a message, and if fail will wait some time to run again (probably the queue is empty). If succeed, will send the message to our **message broker** and re-call the function immediately again. Using this mechanism we can ensure that we not lock the thread only by pulling messages. We are re-scheduling these calls to fit wherever it can (using `setImmediate()` and let the other parts of the code breath and run smoothly.

## Putting it all together

Basically, to create our chatbot we will need to:

- Create `Bot` instance;
- Declare the **conversation flow**;
- Set up the **message gateway**:
	- Set up the **incoming message** system (probably a **webhook**);
	- Set up the **outgoing message** system (pulling process);

So, lets put it all together:

```javascript
const {Bot, Message} = require("bard");
const express = require("express");

interface State {
    known: boolean
}

/* declare the chatbot with a simple conversation flow */
const bot = new Bot<State>({state: {known: false}});
setupConversationFlow(bot);

/* declare server and webhook that will receive the message from the message broker */
const server = express();
setupServer(server);

/* declare your message broker and start pulling messages */
const message_broker = {
    sendMessage: (message) => console.log(message)
};

pullProcess();

/* helper functions */
function setupConversationFlow(bot) {
    bot.outgoing("save-data", [
        (session, course) => {
            /* set to known if already have one or more interations */
            session.state.known = true;
        }
    ]);

    /* example of usage */
    bot.trailing("begin-dialog", [
        (session, course) => {
            /* get known data */
            const known = session.state.known;
        
            /* if user already interacted, then send a different message to him */
            let greeting = "Hello, nice to meet you! How are you?";
            if (known) greeting = "Nice to see you again! How are you doing?";
        
            session.send(greeting);
            course.end();
        }
    ]);

    /* start chatbot */
    bot.start();
}

function setupServer(server) {
    /* to parse JSON body */
    server.use(express.json());

    server.post("/receive/message", (request, response) => {
        const body = request.body;
        /* use bot.push(message_object) to send a message to the conversation flow */
        bot.push(new Message(body.contact, body.session, body.origin, body.data));
        return response.status(200).send("OK");
    });
    server.listen(8888);
}

function pullProcess() {
    /* get message from chatbot */
    const message = bot.pull();
    /* if it is an Error instance, re-run this with delay (probably empty) */
    if (message instanceof Error) {
        return setTimeout(pullProcess, 500);
    }

    /* send message to message broker */
    message_broker.sendMessage(message);

    /* re-run this */
    return setImmediate(pullProcess);
}
```
Above we have the whole chatbot put together. We are declaring a simple **conversation flow**, setting a **webhook** for  **incoming messages** and a **pulling system** to the **outgoing messages**.

### Organizing Dialogs

Obviously you can stripe all of these items into several folders/files. I suggest you to create a separated folder just to hold the dialog files and a flow file to manage them:

```bash
.
├── flow.js
└── dialogs
    ├── root_trailing.js
    ├── bye_trailing.js
    └── intent_incoming.js
```

```javascript
/* flow.js */

...

const root_trailing = require("./dialogs/root_trailing");
const bye_trailing = require("./dialogs/bye_trailing");
const intent_incoming = require("./dialogs/intent_incoming");

/* declare dialog dependencies */
const mysql = new Mysql({settings: "..."});

/* bundle all dependencies */
const deps = {mysql};

/* declare dialogs */
bot.trailing("root", root_trailing(deps));
bot.trailing("bye", bye_trailing(deps));
bot.incoming("intent", intent_incoming(deps));
```

```typescript
/* root_dialog.js */

/* you should use deps to pass instances through dialogs */
module.exports = function(deps) {
    return [
        async (session, course) => {
            const users = await deps.mysql.getUsers();
            /* use users */
            ...
        },
        ...
    ];
}
```

This is a good way to structure your dialogs, it can be a huge mess, believe me. Now you can pass dependencies through dialogs now, it will be very useful later on.

## Tutorials

- [FAQ chatbot tutorial](/docs/creating-faq-chatbot.md)

## Examples (*Outdated*)

We have some examples in this repository too:

- [Simple flow example](/examples/testing) - *outdated*
- [Dice roller chatbot example](/examples/dice-roller-chatbot) - *outdated*
- [FAQ chatbot example](/examples/faq-chatbot) - *outdated*

## Considerations

I really worked on this project, tried to solve this problem for me. Found myself writing with more quality while using **Bard**. It really changed the way I developed/structured my chatbots. I hope that it will help you too.

Bard is under [GNU GPLv3](/LICENSE) license.

Author: Arnaldo Badin
