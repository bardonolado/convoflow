module.exports = function(deps) {
    return [
        (session, course) => {
            /* set to known if already have one or more interations */
            session.storage.set("known", true);
        }
    ];
}