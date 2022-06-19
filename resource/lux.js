/*!
 * LUX Frontend
 * (c) 2022 thelaumix
 * Released under the MIT License.
 */
const Lux = (options = {}) => {

    const OPTIONS = Object.assign({
        backend: "/api",
        socket: true
    }, options)

    var CallMiddlewares = [];

    const CONTAINER = {};

    /**
     * Executes an API call on the backend. Backend response type MUST be application/json
     * @param {string} api API endpoint name
     * @param {*} post_data The data to post
     * @param {string} method The HTTP method that should be used for the call
     * @returns {Promise<object>} Resolves to the call result
     */
    CONTAINER.Call = (api, post_data = null, method = null) => {
        data = null;

        // If post data is set, stringify it
        if (post_data != null) {
            data = JSON.stringify(post_data);
        }

        /**
         * Create and return the to-resolve promise
         */
        return new Promise(res => {
            try {
                /**
                 * Call AJAX request depending on given data
                 */
                $.ajax({
                    contentType: 'application/json',
                    data,
                    dataType: 'json',
                    complete(xhr, data){
                        // Construct middleware state set
                        const mwdata = {xhr, data, cancel: false}
                        
                        // Run through middleware
                        for(let middleware of CallMiddlewares) middleware(mwdata);

                        // Return depending on cancellation status
                        if (mwdata.cancel !== true)
                            res({code: xhr.status, data: xhr.responseJSON || {}})
                        else
                            res({code: -1, data: {error: 'REJECTED_BY_MIDDLEWARE', message: 'The request was rejected by a middleware instance'}})
                    },
                    //processData: false,
                    type: method || (post_data != null ? 'POST' : 'GET'),
                    url: '/' + api
                });
            } catch {
                /**
                 * Something failed, return the error
                 */
                res({
                    code: 500,
                    data: {error: 'FAILED'}
                });
            }
        })
    }

    /**
     * Registers a middleware for the API Caller
     * @param {function} middleware The middleware to be defined. Receives a CallToolCollection
     */
    CONTAINER.Call.use = middleware => {
        if (typeof middleware !== 'function') return;
        CallMiddlewares.push(middleware);
    }

    var socket;
    if (OPTIONS.socket === true) {
        socket = io(OPTIONS.backend, {transports: ['websocket'], secure: true});
        
        CONTAINER.Socket = {
            /**
             * Emits an event on the socket with given data
             * @param {string} event The event name
             * @param  {...any} args The values to pass onto the event
             */
            Emit(event, ...args) {
                return new Promise((res, rej) => {
                    try {
                        socket.emit(event, ...args, (response) => {
                            res(response);
                        })
                    } catch (e) {
                        rej(e);
                    }
                })
            },
            On(event, callback) {
                socket.on(event, callback);
            }
        }
    }

    return CONTAINER;
}