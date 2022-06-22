/**
 * REST API endpoint declaration zone.
 * 
 * Supported methods: get, post, put, patch, delete, all
 */

module.exports = (On, Log, Query, Conf, Util, Emit) => {
    On('get', '/test', (req, res) => {
        Log("Hey, an API log")
        res.json({
            result: "This is an example response",
            second_value: 11880
        })
    })
 
 }