// Imports
const {Log, Color}  = require('./console.js'),
      {UID}         = require('./utils.js'),
      mysql         = require('mysql');

// Primary statics
const LOG_PRE = Color.FgGreen + "SQL",
      SQL_QUERY_TIMEOUT = 15,
      SQL_RECON_TIME = 3;

class SQL {
    /**
     * Creates a new SQL connection handler
     * @param {object} options Settings for the SQL connection
     * @param {string} options.host The SQL host address
     * @param {string} options.user The SQL user
     * @param {string} options.password The SQL user password
     * @param {string} options.charset Charset to be used on the SQL connection. Defaults to 'utfmb8'
     * @param {string} options.database Database to select
     */
	constructor(options = {}) {
        const Conf = Object.assign({
            host: "localhost",
            user: "root",
            password: "root",
            charset : 'utf8mb4',
            database: ""
        }, options)
        
        const root = this;
        // Value initializer
        var _ReconTime = SQL_RECON_TIME,
            Connected = false,
            Con = null,
            _Retry,
            Connect

        /**
         * Query a retry timeout
         */
        _Retry = () => {
            Log(LOG_PRE, "Attempting reconnect in "+_ReconTime+" seconds");
            setTimeout(function(){
                Connect(true);
            }, 1000 * _ReconTime);
            _ReconTime = Math.min(_ReconTime + SQL_RECON_TIME, 30);
        }
    
        /**
         * Connect to the server on promise base
         * @param {boolean} force (Optional) Force a reconnection
         */
        Connect = (force = false) => {
            return new Promise(async (res, rej) => {
    
                if (Connected & force !== true) {
                    res(true);
                    return;
                }
    
                try {
                    // If connected, close it
                    if (Connected) {
                        await root.Close();
                    }
        
                    // Create the connection
                    Log(LOG_PRE, "Creating connection...");
                    Connected = false;
                    Con = mysql.createConnection(Conf);
        
                    Log(LOG_PRE, "Connecting as "+Conf.user+"@" + Conf.host + "...");
                    // Connect to the server and handle result
                    Con.connect(function(err) {
                        if (err) {
                            Connected = false;
                            res(false);
                            Log(LOG_PRE, "CONNECTION FAILED:", err);
                            _Retry();
                            return;
                        }
    
                        Connected = true;
                        Log(LOG_PRE, "Connection established");
                        _ReconTime = SQL_RECON_TIME;
                        res(true);
    
                        Con.on("error", function(err){
                            Connected = false;
                            Con = null;
                            if (err.name == "ECONNRESET" || err.code == 'ECONNRESET')
                                Log(LOG_PRE, "CONNECTION RESET")
                            else
                                Log(LOG_PRE, "CONNECTION ERROR:", err);
                            _Retry();
                        })
                        Con.on("close", function(){
                            Connected = false;
                            Con = null;
                            Log(LOG_PRE, "Connection closed");
                            _Retry();
                        })
                        
                    });
                } catch (e) {
                    Log(LOG_PRE, "Something went terribly wrong.");
                    console.error(e);
                    _Retry();
                    res(false);
                }
            })
        }
    
        /**
         * Connection check for timeout handling
         * @returns {Promise<boolean>} Resolves in boolean of connection state
         */
        this.ConnCheck = () => {
            return new Promise(async (res, rej) => {
                let running = true;
                let timeout = setTimeout(function() {
                    running = false;
                    res(false)
                }, SQL_QUERY_TIMEOUT * 1000);
    
                // Check & Handle Connection state
                let connected = Connected;
                while(running && (!connected || Con == null || Con.state === 'disconnected' || Con.state === 'closed')) {
                    if (connected) connected = await Connect(true);
                    else await Wait(1000);
                }
                if (running) res(true);
                else res(false);
            })
        }
    
        /**
         * Executes an SQL Query
         * @param {string} query Query string in template format
         * @param {Array} params Array of values to template inject
         * @returns {Promise<any>} Resolves in the query result
         */
        this.Query = (query, params) => {
            return new Promise(async (res, rej) => {
                Con.query(query, params, function (error, results, fields) {
                    if (error) {
                        rej(error);
                        return;
                    }
                    error = false;
                    res(results, fields);
                });
            })
        }

        /**
         * Generates unique identifier for SQL table
         * @param {string} table The table to search for the index
         * @param {number} length Length of the to-generate identifier
         * @param {string} fieldname Name of the identifier field
         * @param {string} charset Character Setmap
         * @returns {Promise<string>} Resolves in new unique identifier
         */
        this.Query.UID = async (table, length = 30, fieldname = 'id', charset = null) => {
            let id = null;
            do {
                id = UID(length, charset);
                let $check = (await root.Query('SELECT '+fieldname+' FROM '+table+' WHERE '+fieldname+' = ?', [id]));
                if ($check.length > 0) id = null;
            } while (id == null)
            return id;
        }
    
        /**
         * Close the connection
         * @returns {Promise<boolean|Error>} Resolves to closing result
         */
        this.Close = () => {
            return new Promise((res, rej) => {
                if (Con == null || Connected !== true) {
                    res(false);
                    return;
                }
                Log(LOG_PRE, "Terminating connection...")
                try {
                    Con.end(function(err) {
                        if (err) {
                            res(err);
                            Log(LOG_PRE, "CONNECTION TERMINATION ERROR:", err)
                            return;
                        }
                        Connected = false;
                        Con = null
                        Log(LOG_PRE, "Connection terminated.")
                        res(true);
                    });
                } catch (e) {
                    Log(LOG_PRE, "Termination unsuccessful")
                    res(false);
                }
            })
        }

        // Initial connection
        Connect();
    }
}

module.exports = (options = {}) => new SQL(options);