module.exports = function(deps) {
    return [
        (session, course) => {
            /* empty */
            return course.next();
        }
    ];
}