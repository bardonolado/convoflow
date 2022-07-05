import {Bot, Chain, Events, Message, StepFunction} from "../../main";

interface State {
    test: boolean;
}

const rootDialog: Chain<State> = [
    (session, course) => {
        console.log("root", "1");
        course.begin("begin");
    },
    (session, course) => {
        console.log("root", "2");
        course.end();
    }
];

const beginDialog: Chain<State> = [
    (session, course) => {
        console.log("begin", "1");
        course.next();
    },
    {name: "step-two", action: (session, course) => {
        console.log("begin", "2");
        course.next();
    }},
    (session, course) => {
        console.log("begin", "3");
        course.next();
    },
    (session, course) => {
        console.log("begin", "4");
        course.next();
    }
];

const main = async function() {
	const bot = new Bot<State>({name: "simple-bot"});

	bot.trailing("root", rootDialog);
	bot.trailing("begin", beginDialog);

	await bot.start();

	/* user input simulation */
	const session_token = "dk2#9jkd__392jd";
	const origin = "test-file";

	bot.push(new Message("my-contact", session_token, origin, "hello"));
}

main();