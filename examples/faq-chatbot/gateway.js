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