/**
 * SOCKET.IO endpoint declaration zone.
 * 
 * All runtime changes will be immediately available on reconnecting to the socket.io backend
 */

module.exports = (On, Log, Query, Conf, Util, Storage) => {

    On('test', data => {
        Log("Received data", data)
        return {received: data, time: Util.time()};
    })

}