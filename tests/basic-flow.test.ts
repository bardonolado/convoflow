import {Bot, Events, Message, StepFunction} from "../main";

const createBot = () => {
	const incomingDialog: StepFunction[] = [
		(session, course) => {
			console.log("incoming", "1");
			if (session.getMessage().data === "redirect-message") {
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
			console.log("root", "2");
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

	const bot = new Bot({name: "simple-bot"});

	bot.incoming("incoming", incomingDialog);

	bot.trailing("root", rootDialog);
	bot.trailing("begin", beginDialog);
	bot.trailing("second", secondDialog);
	bot.trailing("redirect", redirectDialog);

	return bot;
};

beforeAll(() => {
	global.console.log = jest.fn();
	global.console.error = jest.fn();
	global.console.info = jest.fn();
	global.console.warn = jest.fn();
});

const bot = createBot();
let bot_calling_order: string[] = [];

beforeAll(async() => {
	jest.spyOn(global.console, "log").mockImplementation((...messages: string[]) => {
		bot_calling_order.push(messages.join(" "));
	});
	await bot.start();
});

beforeEach(() => {
	bot_calling_order = [];
});

afterAll(() => bot.stop());
afterEach(jest.clearAllMocks);

const waitForMessages = () => {
	let last_value: (null | number) = null;
	return new Promise((resolve, reject) => {
		const interval = setInterval(() => {
			if (last_value !== null && last_value === bot_calling_order.length) {
				clearInterval(interval);
				return resolve(true);
			}
			last_value = bot_calling_order.length;
		}, 25);
	});
};

describe("basic flow", () => {
	/* user input simulation */
	const contact = "contact";
	const session_token = "token";
	const origin = "test";

	it("should replace in the second message to the redirect dialog and start begin dialog from there", async() => {
		bot.push(new Message(contact, session_token, origin, "message"));
		bot.push(new Message(contact, session_token, origin, "redirect-message"));
		bot.push(new Message(contact, session_token, origin, "message"));
		bot.push(new Message(contact, session_token, origin, "message"));

		await waitForMessages();

		const expected_calling_order = [
			"incoming 1", "incoming 2", "root 1", "root 2", "second 1",
			"incoming 1", "redirect 1", "begin 1", "begin 2", "begin 3",
			"incoming 1", "incoming 2", "begin 4", "redirect 2",
			"incoming 1", "incoming 2", "root 1", "root 2", "second 1"
		];

		expect(console.log).toBeCalled();
		expect(bot_calling_order).toEqual(expected_calling_order);
	});
});