const express       = require('express'),
      fs            = require('fs'),
      {Server}      = require("socket.io"),
      cors          = require('cors'),
      bodyParser    = require('body-parser'),
      path          = require('path'),
      {Log, Color}  = require('./console.js'),
      Util          = require('./utils.js'),
      glob          = require('glob'),
      $             = require('./lane.js'),
      minify        = require('@node-minify/core'),
      ddos          = require("ddos-express"),
      uuid          = require('uuid').v1,
      COMPRESSORS = {
            js:     require('@node-minify/terser'),
            css:    require('@node-minify/clean-css')
      }

const METHODS_ALLOWED   = ['get', 'post', 'put', 'patch', 'delete', 'all'];

function WebLog(...args) {
    Log(Color.FgRed + "WebSystem", ...args);
}

/**
 * Initialization of web server
 * @param {object} options Options for the server
 * @param {string} options.cert Path to the SSL certificate file
 * @param {string} options.key Path to the SSL private key file
 * @param {string} options.ddos DDOS options
 * @param {string} options.template_fields Template parsing fields
 */
module.exports = (Conf, options = {}) => {
    //#region Initialization

        WebLog("Starting up WebSystem...")

        // Declarations and server opening
        const app = express(),
            expressWs = require('express-ws')(app),
            port = options.port,
            httpsServer = require('https').createServer({
                cert: fs.readFileSync(options.ssl.cert),
                key: fs.readFileSync(options.ssl.key)
            }, app).listen(port);
        
        WebLog("Server running on port", port);

        const ddosFunc = ddos(options.ddos);

    //#endregion

    //#region Workspace Folder Checks

        // Build path constants
        const template_path = path.resolve(__dirname + "/../resource/"),
              WS_ENDP       = options.workspace + "endpoints/",
              WS_FRONT      = options.workspace + "frontend/",
              P_API         = WS_ENDP + "api.js",
              P_SOCK        = WS_ENDP + "socket.js";

        // Check for the existance of the structure
        if (!fs.existsSync(WS_ENDP))  fs.mkdirSync(WS_ENDP);
        if (!fs.existsSync(WS_FRONT)) fs.mkdirSync(WS_FRONT);
        if (!fs.existsSync(WS_FRONT + "html/")) fs.mkdirSync(WS_FRONT + "html/");
        if (!fs.existsSync(WS_FRONT + "html/index.html")) fs.writeFileSync(WS_FRONT + "html/index.html", "This is the frontend");
        if (!fs.existsSync(WS_FRONT + "js/")) fs.mkdirSync(WS_FRONT + "js/");
        if (!fs.existsSync(WS_FRONT + "css/")) fs.mkdirSync(WS_FRONT + "css/");
        if (!fs.existsSync(WS_FRONT + "img/")) fs.mkdirSync(WS_FRONT + "img/");
        if (!fs.existsSync(P_API))
            fs.writeFileSync(P_API , fs.readFileSync(template_path + "/endpoint.api.js"));
        if (!fs.existsSync(P_SOCK))
            fs.writeFileSync(P_SOCK, fs.readFileSync(template_path + "/endpoint.socket.js"));

    //#endregion

    //#region Socket Functionator

        const DIR_SOCKETIO = options.paths.endpoint + "/socket.io/";

        /**
         * Setting up Socket IO
         */
        var io = null;

        function SetUpSocket() {
            WebLog("Setting up socket server...")
            // Close server if needed
            if (io && io.close) io.close();

            // Creating new server
            io = new Server(httpsServer, {path: DIR_SOCKETIO});
            WebLog("Socket server running")

            /**
             * Connection listener
             */
            io.on("connection", (socket) => {

                const SOCK_STORAGE = {};
                
                try {
                    require(P_SOCK)(
                        // Sending just mere copies of the fields to prevent overwriting the internal fields
                        (event, callback) => {
                            socket.on(event, async (...args) => {
                                const cb = args.pop();
                                let result = await callback(...args);
                                cb(result);
                            })
                        },
                        (...args) => {WebLog(Color.FgYellow + "SOCKET", ...args)}, 
                        () => $.Query(...arguments), 
                        {...$.Conf}, 
                        {...Util},
                        SOCK_STORAGE
                    );
                } catch (e) {
                    WebLog(Color.BgRed + Color.FgBlack + "SOCKET Initialization error" + Color.Reset);
                    console.error(e);
                }
            });
        }

        // Initial SOCKET Setup
        SetUpSocket();
 
     //#endregion

    //#region API Functionator

        /**
         * Initial API router
         */
        var ROUTE_API = express.Router();
        ROUTE_API.all("/*", function(req, res) {
            res.status(400).json({
                info: "LUX Web Systems API",
                message: "Not loaded yet"
            })
        })
    
        /**
         * Routing dynamic router instance to /api
         */
        app.use(options.paths.endpoint, (req, res, next) => {
            res.header('Content-Type', 'application/json')
            ROUTE_API(req, res, next);
        })

        /**
         * Initialization of Session Middleware, if needed
         */
        const SessionInstance = options.session ? require('./session.js')(options.session_expire_time, options.session_domain) : null;
        options.session_expire_time ? WebLog("Using sessions") : null;

        /**
         * API Setup functionator
         * Sets up dynamic API router and all calls contained within it
         */
        function SetUpApi() {
            WebLog("Loading API endpoints...")
            // Reset router
            ROUTE_API = express.Router();
            ROUTE_API.use(ddosFunc);
            ROUTE_API.use(bodyParser.json());

            /**
             * CORS Setup. Allow cross-origin-calls from defined host address
             */
            if (typeof options.api_cors === 'string') {
                ROUTE_API.use(cors({
                    origin: "https://" + options.api_cors,
                    credentials: true,
                    methods: [
                        'GET',
                        'POST',
                        'PUT',
                        'PATCH',
                        'DELETE',
                        'HEAD',
                        'OPTIONS'
                    ],
                    allowedHeaders: [
                        'Content-Type',
                    ]
                }));
                WebLog("Using API-Cors Origin", Color.FgCyan + "https://" + options.api_cors + Color.Reset)
            }

            /**
             * If Session enabled, set session
             */
            if (options.session === true) {
                /**
                 * Include cookie parser
                 */
                ROUTE_API.use(require('cookie-parser')());

                /**
                 * SESSION Middleware
                 */
                ROUTE_API.use(SessionInstance)
            }
            
            /**
             * Registers an endpoint on the API router
             * @param {HTTPMethodString} method Type of the method 
             * @param {string} path The target path in express format
             * @param {function} cbs Callbacks (req, res, next)
             * @returns {boolean} If registration process was successful
             */
            function RegisterApi(method, path, ...cbs) {
                // Check for integrity of target method
                if (typeof method !== 'string' || METHODS_ALLOWED.indexOf(method.toLowerCase()) < 0) {
                    WebLog("Could not register API endpoint of method " + 
                        Color.FgYellow + method + Color.Reset + 
                        " on path " + Color.FgCyan + path);
                    return false;
                }

                // Try to set up provided information on API router
                try {
                    const cbLast = cbs.pop();
                    cbs.push(async (req, res) => {
                        // Awaiting the provided callback
                        await cbLast(req, res);
                        // Trigger save session if enabled
                        if (req.session) req.session.Save();
                    })
                    ROUTE_API[method.toLowerCase()](path, ...cbs);
                    WebLog("API: Registered", Color.FgGreen + method.toLowerCase() + Color.Reset, "on", Color.FgMagenta + path + Color.Reset);
                    return true;
                } catch (e) {
                    // If register failed, log it out
                    WebLog(Color.BgRed + Color.FgBlack + "Failed to register API " + Color.Reset);
                    console.error(e);
                    return false;
                }
            }

            /**
             * Registering JS API Resolvables
             */
            try {
                // console.log(require(P_API));
                // return;
                require(P_API)(
                    // Sending just mere copies of the fields to prevent overwriting the internal fields
                    (...args) => RegisterApi(...args),
                    (...args) => {WebLog(Color.FgYellow + "API", ...args)}, 
                    $.Query,
                    {...$.Conf}, 
                    {...Util},
                    (event, ...args) => {
                        return new Promise(async (res, rej) => {
                            try {
                                // Wait for socket to be available
                                while (io == false || io.connected == false) {
                                    await Util.Wait(500);
                                }

                                // Emit the event
                                args.push((response) => {
                                    res(response);
                                });
                                io.sockets.emit(event, ...args)
                            } catch (e) {
                                rej(e)
                            }
                        })
                    }
                );
            } catch (e) {
                WebLog(Color.BgRed + Color.FgBlack + "API Initialization error" + Color.Reset);
                console.error(e);
            }
            WebLog("API endpoints initialized on endpoint router");

            /**
             * API Route fallback definition
             */
            ROUTE_API.all("/*", function(req, res) {
                res.status(400).json({
                    info: $.ENV_NAME + " API",
                    message: "No endpoint specified"
                })
            })
        }

        // Initial API Setup
        SetUpApi();

    //#endregion

    //#region Change Trigger

        let lastTrigger = 0;
        const REFRESH_TIMEOUT = 200,
            CHANGE_BUFFER = {};

        /**
         * Look for directory changes, analyze them and execute refresh if needed
         */
        fs.watch(WS_ENDP, function(type, name) {
            const now = Date.now();
            if (now - lastTrigger < REFRESH_TIMEOUT) return;
            let m = /(socket|api)\..*\.?js/gm.exec(name);
            if (m == null) return;

            // Change events trigger twice, so wait for the second one
            if (type == 'change') {
                if (CHANGE_BUFFER[name] == null) {
                    CHANGE_BUFFER[name] = true;
                    return;
                } else {
                    delete CHANGE_BUFFER[name];
                }
            }
            lastTrigger = now;

            /**
             * Set timeout to prevent too-early or same-frame access
             */
            WebLog("EP Watcher:", "Updated " + Color.FgYellow + name + Color.Reset + " - Uncaching");
            setTimeout(function(){
                const path = WS_ENDP + name;
                // Delete the cacne
                delete require.cache[require.resolve(path)];
                
                // If is API type, refresh API router registration
                if (m[1] == 'api') SetUpApi();
            }, REFRESH_TIMEOUT)
        })

    //#endregion

    //#region Web Registration

        /**
         * Routing web frontend file manager to /web directive
         */
         app.use(options.paths.frontend, ddosFunc, async (req, res, next) => {
            let pth = req.path.substring(1),
                waspl = pth.split(':'),
                finpath = WS_FRONT,
                tmpdir = path.resolve(__dirname + '/../tmp');

            
            /**
             * Parses a String onto the passed template fields
             * @param {*} string The input string that should be parsed
             * @returns The parsed string
             */
            const ParseTemplates = (string) => {

                let fields = options.template_fields;
                if (typeof fields === 'string') {
                    // Try to get from config
                    const field_split = fields.split(':');
                    if (field_split.length != 2) fields = {};
                    else {
                        if (Conf[field_split[0]] == null) fields = {}
                        else {
                            const conf = Conf[field_split[0]];
                            const path = field_split[1].trim();
                            if (path.length == 0) fields = {...conf._data};
                            else fields = conf.GetSection(path)._data;
                        }
                    }
                } else if (typeof fields !== 'object') return string;

                for(const template_id in fields) {
                    const regex = new RegExp('\\{\\{' + template_id + '\\}\\}', 'gm');
                    string = string.replace(regex, fields[template_id]);
                }
                return string;
            }

            /**
             * Globals the requested file group
             * @param {string} target Filename to search 
             */
            const ParseGlobal = async (target) => {
                let tsplit = target.split('.');
                const file_pattern = `/${tsplit[tsplit.length -1]}/${tsplit[0]}.*?(.)${tsplit[tsplit.length -1]}`,
                      templateFile = tmpdir + `/${tsplit[0]}.${tsplit[tsplit.length -1]}`;
                // Look for the requested files in the frontend folder
                let flist = glob.sync(file_pattern, {
                    root: WS_FRONT
                })

                if (flist.length <= 0) {
                    finpath = false;
                    return false;
                }
                
                // Check for file parting times
                let youngest = 0;
                for(let file of flist) {
                    const y = fs.statSync(file).mtimeMs
                    if (youngest < y) youngest = y;
                }

                // If no tempfile existing or temp is older than youngest subfile
                if (!fs.existsSync(templateFile) || fs.statSync(templateFile).mtimeMs < youngest) {
                    if (!fs.existsSync(tmpdir)) fs.mkdirSync(tmpdir)

                    // Create temporary template-rendered file
                    const tempfile_name = tmpdir + `/${uuid()}`;
                    // Iterate files again, read them and parse the content to template fields
                    for(let file of flist) {
                        const data = fs.readFileSync(file, 'utf-8');

                        // Append templated file to the parsing temp file
                        fs.appendFileSync(tempfile_name, ParseTemplates(data) + "\n");
                    }

                    // Try compressing
                    try {
                        // Compressing the buffer
                        await minify({
                            compressor: COMPRESSORS[tsplit[tsplit.length - 1]],
                            input: tempfile_name, //path.join(WS_FRONT, file_pattern),
                            output: templateFile,
                            options: {
                                warnings: true, // pass true to display compressor warnings.
                                mangle: true, // pass false to skip mangling names.
                                compress: false // pass false to skip compressing entirely. Pass an object to specify custom compressor options.
                            }
                        })
                    } catch (e) {
                        WebLog("PARSING ERROR:", e);
                    }

                    fs.unlink(tempfile_name, (err) => {
                        if (err) console.error(err);
                    });
                }

                finpath = templateFile;
            }

            // Serve the socket.io root file
            if (pth == 'js:lux.js') {
                let buf  = fs.readFileSync(path.resolve(__dirname + '/../resource/lux.js'), 'utf-8') + "\n";
                    buf += fs.readFileSync(path.resolve(__dirname + '/../resource/socket.io.min.js'), 'utf-8') + "\n";
                    buf += fs.readFileSync(path.resolve(__dirname + '/../resource/jquery.col.js'), 'utf-8');
                res.header("Content-type", "application/javascript");
                res.header("Content-length", buf.length);
                res.header("Cache-Control", "max-age=604800");
                res.header("Age", "0");
                res.send(buf);
                return;
            }

            // Declare which type of path to load
            else if (waspl[0] == 'css') {
                await ParseGlobal(pth.substring(4));
            } else if (waspl[0] == 'js') {
                await ParseGlobal(pth.substring(3));
            } else if (waspl[0] == 'img') {
                finpath += "img/" + pth.substring(4);
            } else {
                finpath += "html/" + pth;
            }

            // Check for .html or default to index if not found and send result file
            if (!fs.existsSync(finpath)) {
                finpath += ".html";
                if (!fs.existsSync(finpath)) finpath = WS_FRONT + "html/index.html"
            }

            // Only send, if finally found - Otherwise 404 termination message
            if (fs.existsSync(finpath))
                res.sendFile(finpath);
            else
                res.status(404).json({
                    info: "LUX Web System",
                    message: "Nothing was found here. Sorry for that."
                })
        })

    //#endregion

    //#region Close

        /**
         * Capture all other directives
         */
        app.all("/*", function(req, res) {
            res.redirect(options.paths.frontend);
        })

        /**
         * Web Server Control Unit that allows to operate the server
         */
        return {
            App: app,
            Log: WebLog
        }

    //#endregion
}