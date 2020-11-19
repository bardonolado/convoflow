function rollDice() {  
    return Math.floor((Math.random() * 6) + 1);
}

function isNumber(number){
    return !isNaN(number) && isFinite(number);
}

module.exports = function(deps) {
    return [
        (session, course) => {
            /* get known data */
            const is_known = session.storage.get("known");
            
            /* if user not interacted yer, then send an extra message */
            if (!is_known) session.send("I will roll a dice and you can choose a 1 to 6 number. If it matchs you win.");
            session.send("Let's play? (yes or no).");

            /* waits for user response in the next step */
            return course.wait();
        },
        (session, course) => {
            /* get user response and dismiss if it doesn't matches the previous question */
            const response = session.getMessage().data;
            if (response != "yes" && response != "y") {
                session.send("That's okay. We can play another time.");
                return course.replace("bye");
            }
            session.send("Nice!");
            return course.next();
        },
        (session, course) => {
            /* mark this step to get back after */
            course.mark("choose-number-step");

            session.send("Choose your number, 1 to 6:");
            return course.wait();
        },
        (session, course) => {
            const response = parseInt(session.getMessage().data);

            if (!(isNumber(response) && response >= 1 && response <= 6)) {
                const choose_number_tries = session.storage.get("choose-number-tries");
                if (choose_number_tries >= 3) {
                    session.storage.set("choose-number-tries", 0);
                    session.send("Sorry, I can't help you.");
                    return course.replace("bye");
                }

                session.storage.set("choose-number-tries", (choose_number_tries || 0) + 1);
                session.send("Not a valid choice, must be a number between 1 and 6. Let's try again.");

                /* get back to a marked step */
                return course.hop("choose-number-step");
            }

            session.storage.set("choose-number-tries", 0);

            const rolled_number = rollDice();
            if (rolled_number == response) {
                session.send(`You won! Your chosen number was ${response} and the rolled dice was: ${rolled_number}`)
            } else {
                session.send(`You lost! Your chosen number was ${response} and the rolled dice was: ${rolled_number}`)
            }

            return course.next();
        },
        (session, course) => {
            session.send("Want to play it again?");
            return course.wait();
        },
        (session, course) => {
            const response = session.getMessage().data;
            if (response != "yes" && response != "y") {
                session.send("Alright!");
                return course.replace("bye");
            }
            return course.hop("choose-number-step");
        }
    ];
}