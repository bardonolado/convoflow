import {Bot, Events, Message} from "../../main";

const main = async function() {
	const bot = new Bot({name: "simple-bot"});

	bot.event(Events.ON_RECEIVE_MESSAGE,
		(params) => {
			console.log(`Incoming message ${params.message?.data}.`);
		}
	);

	bot.event(Events.ON_SEND_MESSAGE,
		(params) => {
			console.log(`Outgoing message ${params.message?.data}.`);
		}
	);

	bot.incoming("intentions",
		[
			(session, course) => {
				// clear previous intents
				session.storage.set("intent", null);
				
				const message = session.getMessage();
				const data = message.data;

				/*
					this block is only an example,
					obviously you can use a cognition system
					to extract entities and use intents to manage
					the course
				*/

				let intent = null;

				if (data == "good") intent = "something-good";
				else if (data == "bad") intent = "something-bad";
				else if (data == "idiot") intent = "something-rude";

				/* 
					here you can replace this and create a filter, that look up to a list
					and do things based on intents:
					========================================================================
						const relation = {
							"curse" : {message : "Behave yourself please.", dialog : "bye"}
						};
						const instruction = relation[intent];
						if (!instruction) return course.next();
						const dialog = instruction.dialog;
						const message = instruction.message;
						if (message) session.send(message);
						if (dialog) return course.replace(dialog);
					========================================================================
				*/

				if (intent == "something-rude") {
					session.send("Sorry, you are being rude. We can't take any more.");
					/* session end just thrown session away */
					return session.end();
				}

				if (intent) session.storage.set("intent", intent);
				return course.next();
			}
		]
	);

	bot.outgoing("commit-interation",
		[
			(session, course) => {
				/* set to known if already have one or more interations */
				session.storage.set("known", true);
				return course.next();
			}
		]
	);

	bot.trailing("root",
		[
			async (session, course) => {
				const known = session.storage.get("known");

				let greeting = "Hello, I'm a Robot! How are you?";
				if (known) greeting = "Nice to see you again! How are you doing?";

				session.storage.set("known", true);

				await session.send(greeting);
				/*
					break course in order to wait for the next interation,
					that will be handle by the next step
				*/
				return course.wait();
			},
			(session, course) => {
				const intent = session.storage.get("intent");

				let response = "Nice my friend! Keep going.";
				if (intent == "something-bad") response = "I will be here if you wanna talk.";

				session.send(response);
				/*
					replace the trailing node to another,
					in this case the course state will be set
					to the "bye" trailing.
				*/
				return course.replace("bye");
			}
		]
	);

	bot.trailing("bye",
		[
			(session, course) => {
				session.send("Goodbye my friend!");
				/* course end will reset course to the beginning (without clearing session) */
				/* session.end() will end session */
				return course.end(); // end course
			}
		]
	);

	await bot.start();

	/* user input simulation */
	const session_token = "dk2#9jkd__392jd";
	const origin = "test-file";

	bot.push(new Message("my-contact", session_token, origin, "hello"));
	bot.push(new Message("my-contact", session_token, origin, "good"));
	bot.push(new Message("my-contact", session_token, origin, "hello again"));
}

main();