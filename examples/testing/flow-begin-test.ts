import {Bot, Events, Message, StepFunction} from "../../main";

const incomingDialog: StepFunction[] = [
    (session, course) => {
        console.log("incoming", "1");
        if (session.getMessage().data === "specific-message") {
            course.replace("redirect");
            return;
        }
        course.next();
    },
    (session, course) => {
        console.log("incoming", "2");
        course.next();
    }
];

const rootDialog: StepFunction[] = [
    (session, course) => {
        console.log("root", "1");
        course.next();
    },
    (session, course) => {
        console.log("root", "1");
        course.replace("second");
    }
];

const secondDialog: StepFunction[] = [
    (session, course) => {
        console.log("second", "1");
        course.begin("wait");
    },
    (session, course) => {
        console.log("second", "2");
        course.end();
    }
];

const redirectDialog: StepFunction[] = [
    (session, course) => {
        console.log("redirect", "1");
        course.begin("begin");
    },
    (session, course) => {
        console.log("redirect", "2");
        course.end();
    }
];

const beginDialog: StepFunction[] = [
    (session, course) => {
        console.log("begin", "1");
        course.next();
    },
    (session, course) => {
        console.log("begin", "2");
        course.next();
    },
    (session, course) => {
        console.log("begin", "3");
        course.wait();
    },
    (session, course) => {
        console.log("begin", "4");
        course.next();
    }
];

const main = async function() {
	const bot = new Bot({name: "simple-bot"});

	bot.incoming("incoming", incomingDialog);

	bot.trailing("root", rootDialog);
	bot.trailing("begin", beginDialog);
	bot.trailing("second", secondDialog);
	bot.trailing("redirect", redirectDialog);

    bot.event(Events.ON_RECEIVE_MESSAGE, () => {
        console.log("---> message incoming");
    })

	await bot.start();

	/* user input simulation */
	const session_token = "dk2#9jkd__392jd";
	const origin = "test-file";

	bot.push(new Message("my-contact", session_token, origin, "hello"));
	bot.push(new Message("my-contact", session_token, origin, "specific-message"));
	bot.push(new Message("my-contact", session_token, origin, "hello"));
	bot.push(new Message("my-contact", session_token, origin, "hello"));
}

main();