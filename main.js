/**
 * LUX Web System
 * (c) 2022 thelaumix
 * 
 * MIT License
 */

/**
 * Initialize the LUX Web Application System with the given options
 * @param {object=} options Options for setting up the server
 * @returns {object} Server Controller Map
 */
const LxWebApplication = options => {

    //#region Imports

    const {Log, Color}  = require('./system/console.js'),
          Config        = require('./system/config.js'),
          CreateSql     = require('./system/sql.js'),
          WebSystem     = require('./system/websys.js'),
          {Assign}      = require('./system/utils.js'),
          {dirname}     = require('path'),
          $             = require('./system/lane.js'),
          fs            = require('fs'),
          ROOT_DIR      = dirname(require.main.filename);

    //#endregion

    //#region Prepare

        if (ALREADY_LOADED !== false) {
            Log(Color.BgRed + Color.FgBlack + " DUPLICATE INSTANCES IS NOT ALLOWED " + Color.Reset);
            return null;
        }
        ALREADY_LOADED = true;

        // WELCOME - Clear screen
        console.log("\033[2J");

        // Parse configuration
        const OPTIONS = Assign({
            name: "LUX Web Application",
            configs: [
                "Program"
            ],
            directories: {
                config: '/data/',
                workspace: '/',
            },
            sql: false,
            ssl: {
                key: null,
                cert: null
            },
            session: false,
            session_expire_time: 3600,
            session_domain: null,
            server: {
                port: 8080,
                frontend: '/web',
                endpoint: '/api'
            },
            api_cors : false
        }, options || {})

        OPTIONS.directories.config    = ROOT_DIR + OPTIONS.directories.config
        OPTIONS.directories.workspace = ROOT_DIR + OPTIONS.directories.workspace

        $.D = OPTIONS.directories;
        $.ROOT_DIR = ROOT_DIR;

        // Check for SSL configuration
        if (OPTIONS.ssl == null || OPTIONS.ssl.key == null || OPTIONS.ssl.cert == null) {
            throw (new Error("No SSL settings specified").name = "LxNoSSLException");
        }

        const ENV_NAME =  OPTIONS.name;
        console.log(Color.Reset + 
            Color.BgCyan + Color.FgBlack + "#######################################" + Color.Reset + "\n" + 
            Color.BgCyan + Color.FgBlack + "##                                   ##" + Color.Reset + "\n" + 
            Color.BgCyan + Color.FgBlack + "##  LUX Web System - 2022 thelaumix  ##" + Color.Reset + "\n" + 
            Color.BgCyan + Color.FgBlack + "##                                   ##" + Color.Reset + "\n" + 
            Color.BgCyan + Color.FgBlack + "#######################################" + Color.Reset + "\n\n");
        Log(ENV_NAME, "Program started")

        $.ENV_NAME = ENV_NAME;
    //#endregion

    //#region Setup

        //#region Setup: SQL

            var SQL = {};
            if (OPTIONS.sql == false) {
                Log(ENV_NAME, "No SQL connection initiated");
                SQL.Query = () => {}; // Empty fallback query function
            } else {
                SQL = CreateSql(OPTIONS.sql);
                // Put query on lane
            }
            $.Query = SQL.Query;

        //#endregion

        //#region Setup: Configuration

            const Conf = Config(OPTIONS.configs, OPTIONS.directories.config);
            // Put configuration on lane
            $.Conf = Conf;

        //#endregion

        //#region Setup: WebSystem

            const Web = WebSystem({
                ssl: OPTIONS.ssl,
                paths: {
                    frontend: OPTIONS.server.frontend,
                    endpoint: OPTIONS.server.endpoint
                },
                workspace: OPTIONS.directories.workspace,
                port: OPTIONS.server.port,
                api_cors: OPTIONS.api_cors,
                session: OPTIONS.session,
                session_expire_time: OPTIONS.session_expire_time,
                session_domain: OPTIONS.session_domain
            });
            // Put webserver on lane
            $.Web = Web;

        //#endregion

    //#endregion

    //#region Exit Handler

        /**
         * The environment exit handler
         */
        async function exitHandler(options, exitCode) {
            if (this._exitedOnce) return;
            this._exitedOnce = true;
            console.log("\n")

            await SQL.Close();
            if (exitCode || exitCode === 0) Log(ENV_NAME, "Exit with code " + exitCode);
            Log(ENV_NAME, "PROGRAM QUITTING");
            process.exit();
        }

        process.on('exit', exitHandler.bind(null,null));                        // Normal exit
        process.on('SIGINT', exitHandler.bind(null, null));                     // CTRL + C
        process.on('SIGUSR1', exitHandler.bind(null, null));                    // Process Killing
        process.on('SIGUSR2', exitHandler.bind(null, null));                    // Process Killing
        process.on('uncaughtException', exitHandler.bind(null, {exit:true}));   // Exception closing

    //#endregion

    return {
        Query: SQL.Query,
        Conf: {...Conf},
        Log: (...args) => Log(...args),
        Color: {...Color},
        Use: Web.App.use
    };
};

var ALREADY_LOADED = false;

module.exports = LxWebApplication;