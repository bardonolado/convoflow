import {Bot, Events, Message} from "../../main";

const main = async function() {
	const bot = new Bot({name: "simple-bot"});

	bot.trailing("root",
		[
			async (session, course) => {
				console.log("1");
				course.begin("test");
			},
			(session, course) => {
				console.log("2");
			}
		]
	);

	bot.trailing("test", [
		async (session, course) => {
			console.log("test");
			course.wait();
		},
		async (session, course) => {
			console.log("what");
			course.begin("wow");
		}
	]);

	bot.trailing("wow", [
		async (session, course) => {
			console.log("wow");
			course.next();
		}
	]);

	await bot.start();

	/* user input simulation */
	const session_token = "dk2#9jkd__392jd";
	const origin = "test-file";

	bot.push(new Message("my-contact", session_token, origin, "hello"));
	bot.push(new Message("my-contact", session_token, origin, "hello again"));
}

main();