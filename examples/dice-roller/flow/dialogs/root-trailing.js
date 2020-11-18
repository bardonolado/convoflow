module.exports = function(deps) {
    return [
        (session, course) => {
            /* get known data */
            const is_known = session.storage.get("known");
            
            /* if user already interacted, then send a different message to him */
            let greeting_message = "Hello! I am a dice roller!";
            if (is_known) greeting_message = "Hello again!!";

            session.send(greeting_message);

            /* redirect interation to the roll-dice-trailing dialog */
            course.replace("roll-dice");
        }
    ];
}