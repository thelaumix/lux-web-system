/**
 * REST API endpoint declaration zone.
 * 
 * Supported methods: get, post, put, patch, delete, all
 */

module.exports = (On, Log, Query, Conf, Util, Emit) => {
    Log("Hey, an API log")
    On('get', '/test', (req, res) => {
        res.json({
            result: "This is an example response",
            second_value: 11880
        })
    })
 
 }