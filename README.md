Convo Flow

Example:

```typescript
import {Builder, Events, Message} from "convoflow";

const main = async function () {
    const convoflow = new Builder<{intent?: string, known?: boolean}>({
        state: {}, onSendMessage: (message) => {
            // TODO - should handle response here with message.data
        }
    });

    convoflow.event(Events.ON_RECEIVE_MESSAGE,
        (params) => {
            console.log(`Incoming message >>> ${params.message?.data}`);
        }
    );

    convoflow.event(Events.ON_SEND_MESSAGE,
        (params) => {
            console.log(`Outgoing message <<< ${params.message?.data}`);
        }
    );

    // INCOMING - always runs before any interaction
    convoflow.incoming("intentions",
        [
            (session, course) => {
                const message = session.getMessage();
                const data = message.data;

                let intent: string | undefined;

                if (data == "good") intent = "something-good";
                else if (data == "not good") intent = "something-not-good";
                else if (data == "idiot") intent = "something-rude";
                else if (data == "help") intent = "asking-help";

                if (intent == "something-rude") {
                    session.send("Sorry, you are being rude. I do not tolerate that!");
                    return session.end();
                }
                if (intent == "asking-help") {
                    session.send("Well, I could help you but I forgot my tools at home!");
                    return session.end();
                }

                session.state.intent = intent;
                course.next();
            }
        ]
    );

    // TRAILING - normal dialogs (only first is attached, subsequent must be linked together)
    convoflow.trailing("root",
        [
            async (session, course) => {
                const known = session.state.known;

                let greeting = "Hello!! How are you?";
                if (known) greeting = "Nice to see you again! How are you doing?";

                session.state.known = true;

                session.send(greeting);
                // break course in order to wait for the next interation, that will be handle by the next step
                course.wait();
            },
            (session, course) => {
                const intent = session.state.intent;

                if (intent === "something-good") {
                    session.send("Nice my friend! Keep going.");
                } else if (intent === "something-not-good") {
                    session.send("Oh not cool... Not the end of the world tho!");
                } else {
                    session.send("Hmmmmmm....");
                }

                // replace the trailing node to another, in this case the course state will be set to the "bye" trailing.
                course.replace("bye");
            }
        ]
    );

    convoflow.trailing("bye",
        [
            (session, course) => {
                session.send("Goodbye my friend!");
                // course end will reset course to the beginning (without clearing session)
                course.end();
            }
        ]
    );

    convoflow.start();

    // ! - THIS IS AN EXAMPLE OF PUSHING MESSAGES
    convoflow.push(new Message({contact: "my-contact", origin: "facebook", session: "unmanaged-same-session", data: "hello"}));
    convoflow.push(new Message({contact: "my-contact", origin: "facebook", session: "unmanaged-same-session", data: "good"}));
    // convoflow.push(new Message({contact: "my-contact", origin: "facebook", session: "unmanaged-same-session", data: "idiot"}));
    // convoflow.push(new Message({contact: "my-contact", origin: "facebook", session: "unmanaged-same-session", data: "not-good"}));
    // convoflow.push(new Message({contact: "my-contact", origin: "facebook", session: "unmanaged-same-session", data: "nothing"}));
    // convoflow.push(new Message({contact: "my-contact", origin: "facebook", session: "unmanaged-same-session", data: "help"}));
    convoflow.push(new Message({contact: "my-contact", origin: "facebook", session: "unmanaged-same-session", data: "hello again"}));
}

main();
```