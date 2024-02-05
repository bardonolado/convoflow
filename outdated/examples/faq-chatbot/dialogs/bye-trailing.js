/* export a function that returns the dialog (array of functions) */
module.exports = function(deps) {
    return [
        (session, course) => {
            session.send("Goodbye! I hope I've been helpful!");
            return session.end()
        }
    ];
}