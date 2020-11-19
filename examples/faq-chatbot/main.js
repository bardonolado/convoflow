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