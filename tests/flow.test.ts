import {Bot, Message, Chain} from "../main";

type State = Record<string, any>;

beforeAll(() => {
	global.console.log = jest.fn();
	global.console.error = jest.fn();
	global.console.info = jest.fn();
	global.console.warn = jest.fn();
});

let bot_calling_order: string[] = [];

beforeAll(async() => {
	jest.spyOn(global.console, "log").mockImplementation((...messages: string[]) => {
		bot_calling_order.push(messages.join(" "));
	});
});

beforeEach(() => {
	bot_calling_order = [];
});

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
	let bot: Bot<State>;

	beforeEach(async () => {
		const incomingDialog: Chain<State> = [
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
	
		const rootDialog: Chain<State> = [
			(session, course) => {
				console.log("root", "1");
				course.next();
			},
			(session, course) => {
				console.log("root", "2");
				course.replace("second");
			}
		];
	
		const secondDialog: Chain<State> = [
			(session, course) => {
				console.log("second", "1");
				course.begin("wait");
			},
			(session, course) => {
				console.log("second", "2");
				course.end();
			}
		];
	
		const redirectDialog: Chain<State> = [
			(session, course) => {
				console.log("redirect", "1");
				course.begin("begin");
			},
			(session, course) => {
				console.log("redirect", "2");
				course.end();
			}
		];
	
		const beginDialog: Chain<State> = [
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
	
		bot = new Bot({name: "simple-bot", state: {}})

		bot.incoming("incoming", incomingDialog);
	
		bot.trailing("root", rootDialog);
		bot.trailing("begin", beginDialog);
		bot.trailing("second", secondDialog);
		bot.trailing("redirect", redirectDialog);

		await bot.start();
	});

	afterEach(() => {
		bot.stop()
	});

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

describe("jump action flow", () => {
	type ThisState = {count: number};
	let bot: Bot<ThisState>;

	beforeEach(async () => {
		const incomingDialog: Chain<ThisState> = [
			(session, course) => {
				console.log("incoming", "1");
				course.next();
			},
			{name: "step-two", action: (session, course) => {
				console.log("incoming", "2");
				session.state.count += 1;
				course.next();
			}},
			(session, course) => {
				console.log("incoming", "3");
				if (session.getMessage().data === "jump incoming" && session.state.count < 2) {
					return course.jump("step-two");
				}
				session.state.count = 0;
				course.next();
			},
		];

		const rootDialog: Chain<ThisState> = [
			(session, course) => {
				console.log("root", "1");
				course.next();
			},
			{name: "step-two", action: (session, course) => {
				console.log("root", "2");
				if (session.getMessage().data === "skip") {
					return course.skip();
				}
				course.next();
			}},
			(session, course) => {
				console.log("root", "3");
				session.state.count += 1;
				if (session.state.count <= 2) {
					course.jump("step-two");
					return;
				}
				course.next();
			},
			(session, course) => {
				console.log("root", "4");
				course.replace("last", "step-two");
			},
		];

		const lastDialog: Chain<ThisState> = [
			(session, course) => {
				console.log("last", "1");
				course.next();
			},
			{name: "step-two", action: (session, course) => {
				console.log("last", "2");
				course.next();
			}},
			(session, course) => {
				console.log("last", "3");
				course.end();
			}
		];
	
		bot = new Bot<ThisState>({state: {count: 0}});

		bot.incoming("incoming", incomingDialog);

		bot.trailing("root", rootDialog);
		bot.trailing("last", lastDialog);

		await bot.start();
	});

	afterEach(() => {
		bot.stop()
	});

	/* user input simulation */
	const contact = "contact";
	const session_token = "token";
	const origin = "test";

	it("should loop to step-to until check if pass", async() => {
		bot.push(new Message(contact, session_token, origin, "message"));

		await waitForMessages();

		const expected_calling_order = [
			"incoming 1", "incoming 2", "incoming 3", "root 1", "root 2", "root 3", "root 2", "root 3",
			"root 2", "root 3", "root 4", "last 2", "last 3"
		];

		expect(console.log).toBeCalled();
		expect(bot_calling_order).toEqual(expected_calling_order);
	});

	it("should jump one time in incoming trailing", async() => {
		bot.push(new Message(contact, session_token, origin, "jump incoming"));

		await waitForMessages();

		const expected_calling_order = [
			"incoming 1", "incoming 2", "incoming 3", "incoming 2", "incoming 3", "root 1", "root 2", "root 3", "root 2", "root 3",
			"root 2", "root 3", "root 4", "last 2", "last 3"
		];

		expect(console.log).toBeCalled();
		expect(bot_calling_order).toEqual(expected_calling_order);
	});
});

describe("skip action flow", () => {
	let bot: Bot;

	beforeEach(async () => {
		const incomingDialog: Chain = [
			(session, course) => {
				console.log("incoming", "1");
				if (session.getMessage().data === "skip") {
					return course.skip();
				}
				course.next();
			},
			(session, course) => {
				console.log("incoming", "2");
				course.next();
			}
		];

		const rootDialog: Chain = [
			(session, course) => {
				console.log("root", "1");
				course.begin("begin");
			},
			(session, course) => {
				console.log("root", "2");
				course.replace("first");
			}
		];

		const firstDialog: Chain = [
			(session, course) => {
				console.log("first", "1");
				course.skip();
			},
			(session, course) => {
				console.log("first", "2");
				course.next();
			}
		];

		const beginDialog: Chain = [
			(session, course) => {
				console.log("begin", "1");
				course.skip();
			},
			(session, course) => {
				console.log("begin", "2");
				course.next();
			}
		];
	
		bot = new Bot({state: {}});

		bot.incoming("incoming", incomingDialog);

		bot.trailing("root", rootDialog);
		bot.trailing("first", firstDialog);
		bot.trailing("begin", beginDialog);

		await bot.start();
	});

	afterEach(() => {
		bot.stop()
	});

	/* user input simulation */
	const contact = "contact";
	const session_token = "token";
	const origin = "test";

	it("should skip first and begin dialog", async() => {
		bot.push(new Message(contact, session_token, origin, "message"));

		await waitForMessages();

		const expected_calling_order = [
			"incoming 1", "incoming 2", "root 1", "begin 1", "root 2", "first 1"
		];

		expect(console.log).toBeCalled();
		expect(bot_calling_order).toEqual(expected_calling_order);
	});

	it("should skip incoming dialog", async() => {
		bot.push(new Message(contact, session_token, origin, "skip"));

		await waitForMessages();

		const expected_calling_order = [
			"incoming 1", "root 1", "begin 1", "root 2", "first 1"
		];

		expect(console.log).toBeCalled();
		expect(bot_calling_order).toEqual(expected_calling_order);
	});
});

// TODO - wait action test
// TODO - again action test
// TODO - reset action test