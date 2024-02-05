module.exports = function(deps) {
    return [
        (session, course) => {
            session.send("Goodbye!");
            return session.end();
        }
    ];
}