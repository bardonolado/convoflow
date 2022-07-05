import {Bot, Message, Chain} from "../main";

type StorageType = any;

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
	let bot: Bot<StorageType>;

	beforeAll(async () => {
		const incomingDialog: Chain<StorageType> = [
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
	
		const rootDialog: Chain<StorageType> = [
			(session, course) => {
				console.log("root", "1");
				course.next();
			},
			(session, course) => {
				console.log("root", "2");
				course.replace("second");
			}
		];
	
		const secondDialog: Chain<StorageType> = [
			(session, course) => {
				console.log("second", "1");
				course.begin("wait");
			},
			(session, course) => {
				console.log("second", "2");
				course.end();
			}
		];
	
		const redirectDialog: Chain<StorageType> = [
			(session, course) => {
				console.log("redirect", "1");
				course.begin("begin");
			},
			(session, course) => {
				console.log("redirect", "2");
				course.end();
			}
		];
	
		const beginDialog: Chain<StorageType> = [
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
	
		bot = new Bot({name: "simple-bot", initial_storage: {}})

		bot.incoming("incoming", incomingDialog);
	
		bot.trailing("root", rootDialog);
		bot.trailing("begin", beginDialog);
		bot.trailing("second", secondDialog);
		bot.trailing("redirect", redirectDialog);

		await bot.start();
	});

	afterAll(() => {
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

describe("jump flow", () => {
	let bot: Bot<{count: number}>;

	beforeAll(async () => {
		const rootDialog: Chain<{count: number}> = [
			(session, course) => {
				console.log("root", "1");
				course.next();
			},
			{name: "step-two", action: (session, course) => {
				console.log("root", "2");
				course.next();
			}},
			(session, course) => {
				console.log("root", "3");
				session.storage.count = (session.storage.count || 0) + 1;
				if (session.storage.count <= 2) {
					course.jump("step-two");
					return;
				}
				course.next();
			},
			(session, course) => {
				console.log("root", "4");
				course.next();
			},
		];
	
		bot = new Bot({initial_storage: {}})

		bot.trailing("root", rootDialog);

		await bot.start();
	});

	afterAll(() => {
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
			"root 1", "root 2", "root 3", "root 2", "root 3",
			"root 2", "root 3", "root 4"
		];

		expect(console.log).toBeCalled();
		expect(bot_calling_order).toEqual(expected_calling_order);
	});
});