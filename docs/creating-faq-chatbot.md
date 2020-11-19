# Creating a FAQ Chatbot

## Introduction

A FAQ Chatbot have the purpose of answering the most common questions asked by users. We will build one using [Bard](/docs/how-to-create-a-chatbot) and some of its funtionalities, that will help us to build a smarter chatbot.

[Bard](/docs/how-to-create-a-chatbot) is a chatbot builder framework written in NodeJS/Typescript, but you can use it on your NodeJS/Javascript project too.

## Conversation Flow

We want to develop an intuitive chatbot, that does not depends on its default dialog flow. The conversation must be intuitive. The user must have the option to ask any question at any conversation point, and the chatbot must respond to it. We can achieve that writing a dialog that expects questions and send the respective answers, using the **incoming layer**.

The main part of the conversation will be written using the **trailing layer**, where we can manipulate and redirect the interaction between the dialogs.

![faq-chatbot-flow](/docs/images/faq-chatbot-flow.png)

Above we have a basic flow. The chatbot asks and waits for the user's question. On user interaction, he will try to get the answer based on his input, then shows the answer if got it, otherwise retry it (maximum of 3 retries). Then the chatbot say bye and ends the conversation.

## Building it

### Declaring our Chatbot

First of all, we need to setup our project:

```bash
npm init
npm i --save bard-builder express
```

Now we must import [Bard](https://www.npmjs.com/package/bard-builder) and declare our chatbot.

Let's create a file named `main.js`:

```javascript
const {Bot} = require("bard-builder");

const main = function() {
    /* declare the chatbot instance */
    const bot = new Bot({name: "my-faq-bot"});

    /* here we declare the dialogs */
    /* here we start the chatbot */
    /* here we setup and start the message gateway */
}

main();
```

### Organizing our dialogs

To start writing our dialogs, we need to put every dialog into a separated file inside a folder named `dialogs`. That will help us to build and visualize the conversation.

```
└── dialogs
    ├── root-trailing.js
    ├── faq-trailing.js
    ├── bye-trailing.js
    └── faq-incoming.js
```

Now we have to link all these dialogs in our declared `Bot` instance. To do that we will need to create another file named `flow.js`. The folder structure will look like this:

```
└── main.js    // where we declare and setup our chatbot
└── flow.js    // link and setup the dialogs
└── dialogs
    ├── root-trailing.js
    ├── faq-trailing.js
    ├── bye-trailing.js
    └── intent-incoming.js
```

```javascript
const root_trailing = require("./dialogs/root-trailing");
const faq_trailing = require("./dialogs/faq-trailing");
const bye_trailing = require("./dialogs/bye-trailing");
const intent_incoming = require("./dialogs/intent-incoming");

/* 
    export a function that receives the chatbot as a parameter, then link the dialogs to it
*/
module.exports = function(bot) {
    /* this can be used to pass dependencies to dialogs */
    const deps = {};

    /* link dialogs into our chatbot */
    bot.trailing("root", root_trailing(deps));
    bot.trailing("faq", faq_trailing(deps));
    bot.trailing("bye", bye_trailing(deps));
    bot.incoming("intent", intent_incoming(deps));
}
```

And we need to modify our `main function` inside the `main.js` file to setup the flow:

```javascript
const {Bot} = require("bard-builder");

const main = function() {
    /* declare and setup the chatbot instance */
    const bot = new Bot({name: "my-faq-bot"});
    setup_flow(bot);

    /* here we start the chatbot */
    /* here we setup and start the message gateway */
}

main();
```

### Writing the dialogs

#### **Root dialog (**`/dialogs/root-trailing.js`**):**

Now we can start writing those *empty* dialogs. The `root trailing dialog` will be responsible for greeting the user and redirecting to the `faq trailing dialog`:

```javascript
/* export a function that returns the dialog (array of functions) */
module.exports = function(deps) {
    return [
        (session, course) => {
            /* get known data */
            const is_known = session.storage.get("known_greeting");
            
            /* if user already interacted, then send a different message to him */
            let greeting_message = "Hello! I am FAQ Chatbot!";
            if (is_known) greeting_message = "Hello again!";

            session.send(greeting_message);

            /* set known to true */
            session.storage.set("known_greeting", true);

            /* redirect interation to the faq trailing dialog */
            return course.replace("faq");
        }
    ];
}
```

#### **Intent dialog (**`/dialogs/intent-incoming.js`**):**

Now we must write our `intent incoming dialog`, that will be responsible for understanding the user input and checking if it is a valid question.

We will need to create a answer-question table to make the user input validation. You can use a *JSON* configuration file, but we just write it inside the `.dialogs/intent-incoming.js` file.

If the user input is a valid question, then it will save the answer in the session using `session.storage.set(key, value)`.

And since this is an **incoming layer** dialog, the interation won't stop after reach the end. It will continues through until reach the **trailing layer**, unless you stop it (manually, omitting `course.next()` at the last step).

> You should substitute that question validation for some cognitive engine. There are many out there, include some free ones.

```javascript
const questions_list = {
    "who are you?": "I am a just a chatbot, that's sad because I even have a name :/",
    "what is a chatbot?": "Chatbot is a applicati0n th47 coNDuc7 4 c0nv3rS47i0 i7h   um4n",
    "what is your purpose?": "Not to pass butter, sadly."
};

/* export a function that returns the dialog (array of functions) */
module.exports = function(deps) {
    return [
        (session, course) => {
            /* get the user input */
            const user_input = session.getMessage().data;
            if (!(user_input && user_input.length)) {
                return course.next();
            }

            /* check if user input is a valid question, if so save it in session and redirect it to the faq dialog */
            const answer = questions_list[user_input.toLowerCase()];
            if (answer) {
                session.storage.set("answer", answer);
                return course.replace("faq");
            }

            /* ensure interation to keep going through and reach the trailing layer */
            return course.next();
        }
    ];
}
```

#### **FAQ dialog (**`/dialogs/faq-trailing.js`**):**

Here we can check for the previous set value on session `answer`. If it exists, send the answer. Otherwise send to back to the begin of `faq trailing dialog`, if retries reaches more than 2 times, say bye and end the session.

```javascript
/* export a function that returns the dialog (array of functions) */
module.exports = function(deps) {
    return [
        (session, course) => {
            /* if have an answer, jump to the next step */
            const have_answer = session.storage.get("answer");
            if (have_answer) return course.next();

            session.send("Can I help you?");
            return course.wait();
        },
        (session, course) => {
            const have_answer = session.storage.get("answer");
            if (!have_answer) {
                /* if retries reaches more than 2 times, say bye and end the session */
                let max_tries = session.storage.get("answer_max_tries") || 0;
                if (max_tries >= 2) {
                    session.send("I can't help you if I can't understand you.");
                    /* reset tries counter */
                    session.storage.set("answer_max_tries", 0);
                    return course.replace("bye");
                }
                session.send("Sorry, I don't have an answer to that.");
                session.storage.set("answer_max_tries", ++max_tries);
                return course.replace("faq");
            }

            /* reset tries counter */
            session.storage.set("answer_max_tries", 0);

            /* send answer and set its session value to null */
            session.send(have_answer);
            session.storage.set("answer", null);

            return course.next();
        },
        (session, course) => {
            /* ask if want to ask another question */
            session.send("Want to ask it again?");
            return course.wait();
        },
        (session, course) => {
            /* if response is yes, redirect to the faq dialog again, if not say bye */
            const response = session.getMessage().data;
            if (response != "yes" && response != "y") {
                session.send("Alright!");
                return course.replace("bye");
            }
            return course.replace("faq");
        }
    ];
}
```

#### **Bye dialog (**`/dialogs/bye-trailing.js`**):**

Here we say bye to our user.

```javascript
/* export a function that returns the dialog (array of functions) */
module.exports = function(deps) {
    return [
        (session, course) => {
            session.send("Goodbye! I hope I've been helpful!");
            return session.end()
        }
    ];
}
```

## Message Gateway

Now that we have all of dialogs written, we can start writing our message gateway. You can use `bot.push(message)` to insert a **outgoing message** or `bot.pull()` to retrieve a **incoming message**.

To do that, create a file named `gateway.js` inside our project folder:

```
└── main.js    // where we declare and setup our chatbot
└── flow.js    // link and setup the dialogs
└── gateway.js    // create the message gateway (receiving and sending messages)
└── dialogs
    ├── root-trailing.js
    ├── faq-trailing.js
    ├── bye-trailing.js
    └── intent-incoming.js
```

### Receiving messages

You probably are receiving from **message broker** by a **webhook**, so we will need to create one (you can use other frameworks, but to simplify we will just use `"express"`, that is a excellent a reliable framework).

### Sending messages

To send a reply for the messages sent by the **conversation flow**, in response to the ones received, we can use `bot.pull()` function. It will pull a **outgoing message** from the **conversation flow**. We can do it by creating a pulling system and sending all **outgoing messages** to our **message broker**.

### Gateway:

So, we are creating a webhook for receiving the messages and a pulling system to send the messages out to the message broker (your broker) - you can substitute that. We need put the code above inside the previous created `gateway.js` file:

```javascript
const {Message, MessageTypes} = require("bard-builder");
const express = require("express");

module.exports = class Gateway {
    constructor(port, bot) {
        this.port = port;
        this.bot = bot;

        /* declare message broker (mock) */
        this.message_broker = {
            sendMessage: (message) => console.log("Simulating sending message:", message.data)
        };

        /* declare webhook server */
        this.server = express();

        /* to parse JSON body */
        this.server.use(express.json());

        /* declare endpoit for receiving messages */
        this.server.post("/receive/message", (request, response) => {
            const body = request.body;
            const message = new Message(
                body.contact, body.session, body.origin,
                body.data, MessageTypes.TEXT
            );

            /* use bot.push(message_object) to send a message to the conversation flow */
            this.bot.push(message);
            return response.status(200).send("OK - Message received!");
        });
        this.server.listen(this.port);
    }

    pullProcess() {
        /* get message from chatbot */
        const message = this.bot.pull();
        /* if it is an Error instance, re-run this with delay (probably empty) */
        if (message instanceof Error) {
            return setTimeout(() => this.pullProcess(), 500);
        }

        /* send message to message broker */
        this.message_broker.sendMessage(message);

        /* re-run this */
        return setImmediate(() => this.pullProcess());
    }
}
```

Above we are receiving a **incoming message** from a **webhook** and creating/inserting the `Message` instance into the **conversation flow** using `bot.push(message)`.

Every time it happens a new interaction is executed in the **conversation flow**.

> You can create a switch to handle all incoming message types and set the respective one into the `Message` instance.

We are declaring our **message broker** and creating a function that calls itself repeatedly to pull messages from the **conversation flow**. The pulling function try to get a message, and if fail will wait some time to run again (probably the queue is empty). If succeed, will send the message to our **message broker** and re-call the function immediately again. Using this mechanism we can ensure that we not lock the thread only by pulling messages. We are re-scheduling these calls to fit wherever it can (using `setImmediate()` and let the other parts of the code breath and run smoothly.

And to add this to the chatbot system we must modify our `main.js` file again:

```javascript
const {Bot} = require("bard-builder");
const setup_flow = require("./flow.js");
const Gateway = require("./gateway.js");

const main = function() {
    /* declare and setup the chatbot instance */
    const bot = new Bot({name: "my-faq-bot"});
    setup_flow(bot);

    /* here we start the chatbot */
    bot.start();

    /*
        declare gateway (webhook and pulling system) and
        start pulling messages from bot and sending it to the message broker
    */
    const gateway = new Gateway(8888, bot);
    gateway.pullProcess();
}

main();
```

There you have a simple, but smart, FAQ chatbot.

## Testing it

You can make a HTTP request to our created webhook with the message body:

```json
POST > http://localhost:8888/receive/message
{
	"contact": "11445917045",
	"session": "dkioas32902",
	"origin": "insomnia",
	"data": "hello!",
	"type": "text"
}
```

Then you can send messages to your chatbot and the chatbot output will probably be at your console. These are the questions to ask with a answer:

```javascript
"who are you?"
"what is a chatbot?"
"what is your purpose?"
```

You can add more chaging the `questions-list` variable in the `intent incoming dialog`.

## Conclusion

Now we finished our FAQ chatbot. I recommend you to change the `question-table` in the `intent incoming dialog` for any preferred cognition engine you have. And for the message broker too. There are some good cognition engines and message brokers out there, some of them are free.

You can evolve this chatbot to something bigger too. No bounds to what you can do here.

You can find and example of this tutorial here: [FAQ chatbot](/examples/faq-chatbot)