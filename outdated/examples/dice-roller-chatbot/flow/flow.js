const root_trailing = require("./dialogs/root-trailing");
const roll_dice_trailing = require("./dialogs/roll-dice-trailing");
const bye_trailing = require("./dialogs/bye-trailing");

const commands_incoming = require("./dialogs/commands-incoming");
const save_data_outgoing = require("./dialogs/save-data-outgoing");

module.exports = function(bot) {
    const deps = {};

    bot.trailing("root", root_trailing(deps));
    bot.trailing("roll-dice", roll_dice_trailing(deps));
    bot.trailing("bye", bye_trailing(deps));

    bot.incoming("commands", commands_incoming(deps));

    bot.outgoing("save-data", save_data_outgoing(deps));
}