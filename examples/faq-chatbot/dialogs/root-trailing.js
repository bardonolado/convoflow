/* export a function that returns the dialog (array of functions) */
module.exports = function(deps) {
    return [
        (session, course) => {
            /* get known data */
            const is_known = session.storage.get("known_greeting");
            
            /* if user already interacted, then send a different message to him */
            let greeting_message = "Hello! I am FAQ Chatbot!";
            if (is_known) greeting_message = "Hello again!";

            session.send(greeting_message);

            /* set known to true */
            session.storage.set("known_greeting", true);

            /* redirect interation to the faq trailing dialog */
            return course.replace("faq");
        }
    ];
}