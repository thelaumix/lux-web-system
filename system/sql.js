// Imports
const {Log, Color}  = require('./console'),
      {UID}         = require('./utils'),
      mysql         = require('mysql');

// Primary statics
const LOG_PRE = Color.FgGreen + "SQL",
      SQL_QUERY_TIMEOUT = 15,
      SQL_RECON_TIME = 3;

class SQL {
    /**
     * Creates a new SQL connection pool handler
     * @param {object} options Settings for the SQL connection
     * @param {string} options.connectionLimit The maximum number of connections the connection pool should have
     * @param {string} options.host The SQL host address
     * @param {string} options.user The SQL user
     * @param {string} options.password The SQL user password
     * @param {string} options.charset Charset to be used on the SQL connection. Defaults to 'utfmb8'
     * @param {string} options.database Database to select
     */
	constructor(options = {}) {
        const Conf = Object.assign({
            connectionLimit : 60, //important
            host: "localhost",
            user: "root",
            password: "root",
            charset : 'utf8mb4',
            database: ""
        }, options)
        
        // Value initialization
        const root = this;
        let Connected = false,
            Connect;

        let Pool = mysql.createPool(Conf);
        Log(LOG_PRE, `Pool initiated on ${Conf.user}@${Conf.host}`);

        /**
         * Returns a new query promise based on some query base _base
         * @param {_QueryBase} _base The query base
         * @param {string} query The SQL query string
         * @param {Array} params The parameters
         * @returns {Promise<any>} The promise handling the query result
         */
        const GetQueryPromise = (_base, query, params) => {
            return new Promise(async (res, rej) => {
                // Log(LOG_PRE, "Currently holding", Pool._allConnections.length, "connections")
                _base.query(query, params, (error, results, fields) => {
                    if (error) {
                        rej(error);
                        return;
                    }
                    error = false;
                    res(results, fields);
                })
            })
        }
    
        /**
         * Executes an SQL Query with any free pool connection
         * @param {string} query Query string in template format
         * @param {Array} params Array of values to template inject
         * @returns {Promise<any>} Resolves to the query result
         */
        this.Query = (query, params) => GetQueryPromise(Pool, query, params);

        /**
         * Requests and resolves to a connection from the connection pool
         */
        this.Query.GetConnection = () => {
            return new Promise((res, rej) => {
                Pool.getConnection((err, connection) => {
                    if (err) {
                        Log(LOG_PRE, Color.BgRed + Color.FgWhite + "Could not deploy pool connection")
                        connection.release();
                        return rej(err);
                    }

                    let released = false;

                    /**
                     * Connection query command
                     * @param {string} query SQL query
                     * @param {Array} params Parameters
                     * @returns {Promise<any>|null} Resolves to the query result or NULL if closed.
                     */
                    const PoolQuery = (query, params) => {
                        if (released) {
                            return new Promise((req, res) => {
                                rej('Pooled connection has already been released.');
                            })
                        }
                        return GetQueryPromise(connection, query, params);
                    }

                    /**
                     * Release the connection into the pool
                     */
                    PoolQuery.Release = () => {
                        connection.release();
                        released = true;
                    }

                    res(PoolQuery);
                })
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
        this.Query.UID = async (table, length = 30, fieldname = 'id', charset = null, Pool = null) => {
            let id = null;
            if (Pool == null) Pool = root.Query;
            do {
                id = UID(length, charset);
                let $check = (await Pool('SELECT '+fieldname+' FROM '+table+' WHERE '+fieldname+' = ?', [id]));
                if ($check.length > 0) id = null;
            } while (id == null)
            return id;
        }
    
        /**
         * End the pool
         * @returns {Promise<boolean|Error>} Resolves to closing result
         */
        this.Close = () => {
            return new Promise((res, rej) => {
                Pool.end((err) => {
                    if (err) {
                        Log(LOG_PRE, Color.BgRed + Color.FgWhite + "Pool termination unsuccessful")
                        return rej(err);
                    } else {
                        Log(LOG_PRE, "Pool ended")
                        res(true);
                    }
                })
            })
        }

    }
}

module.exports = (options = {}) => new SQL(options);