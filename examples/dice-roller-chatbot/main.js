const {Bot} = require("bard-builder");
const setup_flow = require("./flow/flow");
const Gateway = require("./gateway/gateway");

const main = function() {
    /* declare bot, setup its flow and start it */
    const bot = new Bot({name: "bot-name"});
    const flow = setup_flow(bot);
    bot.start();

    /*
        declare gateway (webhook and pulling system) and
        start pulling messages from bot and sending it to the message broker
    */
    const gateway = new Gateway(8888, bot);
    gateway.pullProcess();
}

main();