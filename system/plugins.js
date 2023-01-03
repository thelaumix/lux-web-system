const {Log, Color}  = require('./console');
const $             = require('./lane');
const fs            = require('fs');

const L = (...args) => {
    Log(LOG_PRE, ...args);
}
const LOG_PRE = Color.FgGreen + "Plugin Manager";
const NAME_LOCKS = [];
const REGISTERED = {}
const REGISTERED_FRONTEND = {};
const MIDDLEWARES = [];
const R_SOCKETS = {};

class PluginRegisterHelper {

    constructor(permissions, setName, workspace_path) {

        let _name;

        const Lg = (...args) => {
            Log(Color.FgGreen + 'Plugin Manager ['+_name+']' + Color.Reset, ...args)
        }

        this.Conf = {};
        this.Util = {};

        this._validate = () => {
            if (NAME_LOCKS.indexOf(_name) >= 0) throw new Error('Cannot change plugin registration information after initialization')
            else if (typeof _name === 'string' && _name.length > 0 && REGISTERED[_name] != null) return;
            throw new Error('Plugin needs to say hello by calling $.Begin() with a valid name first.')
        }

        this.Query = (query, params) => {
            this._validate();
            if (permissions.sql !== true) throw new Error('Forbidden plugin SQL access');
            return $.Query(query, params);
        }
    
        this.Begin = (name) => {
            if (_name != null) throw new Error('Cannot begin the plugin initialization twice');
            if (typeof name !== 'string') throw new Error('Plugin must begin with a name. Got ' + (typeof name))
            const id_name = name.toLowerCase().replace(/[^a-z0-9\-\_]/ig, "");
            if (id_name.length == 0 || id_name.length != name.length) throw new Error('Plugin name must only be letters, numbers or element { -, _ }. Got ' + name);
            else if (REGISTERED[id_name] != null) throw new Error('Plugin "'+id_name+'" already registerd');
    
            L('Beginning registration of '+ Color.FgGreen + id_name + Color.Reset + '...');
            
            _name = id_name;
            setName(id_name);
            REGISTERED[_name] = {
                middlewares: [],
                frontend_files: {
                    js: [],
                    css: []
                },
            };

            this.WorkspacePath = workspace_path;
    
            this.Conf = $.Conf._MakeNew(`@plugin.${id_name}`, true);
            this.Util = {...require('./utils')};
            this.Log = (...args) => {
                Log(Color.FgGreen + "Plugin ("+_name+")", ...args);
            }

            Lg('Initialized')
        }
    
        /**
         * Register a frontend file to serve
         */
        this.FrontendFile = (file_name) => {
            this._validate();
            const fsplit = file_name.split('.');
            const ftype = fsplit.pop();
            const ftype_num = ['css', 'js'].indexOf(ftype);
            if (ftype_num < 0) throw new Error("Frontend files must be .js or .css files");
            else if (!fs.existsSync(file_name)) throw new Error("Frontend file was not found at '"+file_name+"'.");

            if (REGISTERED_FRONTEND[_name] == null) REGISTERED_FRONTEND[_name] = 0;
            REGISTERED_FRONTEND[_name] |= ftype_num + 1;

            REGISTERED[_name].frontend_files[ftype].push(file_name);
            Lg('Frontend file added:', Color.FgCyan + file_name)
        }
    
        /**
         * Register global middlewares on the express lane
         */
        this.Middleware = (...middlewares) => {
            this._validate();
            REGISTERED[_name].middlewares.push(...middlewares);
        }
    
        /**
         * Register API call
         */
        this.API = (method, path, ...cbs) => {
            this._validate();

            if ($.MethodsAllowed.indexOf(method) < 0 || method == 'use') throw new Error('HTTP method not allowed: ' + method)

            if (path[0] != "/") path = "/" + path;
            path = `/${_name}${path}`;

            // Try to set up provided information on API router
            try {
                const cbLast = cbs.pop();
                cbs.push(async (req, res) => {
                    // Awaiting the provided callback
                    try {
                        await cbLast(req, res);
                    } catch (e) {
                        Lg(Color.BgRed + Color.FgBlack + "Failed to execute API " + Color.Reset);
                        console.error(e);
                        res.status(500).json({
                            error: 500,
                            info: $.ENV_NAME + " API",
                            message: "Internal server error"
                        })
                    }
                    // Trigger save session if enabled
                    if (req.session) req.session.Save();
                })
                $.PluginAPI[method.toLowerCase()](path, $.CorsFunction, ...cbs);
                Lg("Registered API endpoint on", Color.FgMagenta + `(${method.toUpperCase()}) /@${path}`);
                return true;
            } catch (e) {
                // If register failed, log it out
                Lg(Color.BgRed + Color.FgBlack + "Failed to register API endpoint" + Color.Reset);
                console.error(e);
                return false;
            }
        }
    
        /**
         * Register web socket command
         */
        this.Socket = (command, callback) => {
            this._validate();

            const command_final = `@${_name}:${command}`;
            if (R_SOCKETS[command_final] != null) throw new Error("Command '"+command_final+"' already declared.");

            R_SOCKETS[command_final] = callback;
            Lg("Registered socket command listener on", Color.FgYellow + command_final);
        }
    }
}

module.exports.Register = (plugin, permissions, c_workspace) => {
    if (typeof plugin !== 'function') {
        return L('Plugins require to be a module. Got', typeof plugin);
    }

    let realName;
    const setName = (name) => realName = name;
    const Helper = new PluginRegisterHelper(permissions, setName, c_workspace);
    try {
        plugin.call(null, Helper);
        const Reg = REGISTERED[realName];

        // Recognize middlewares
        if (Reg.middlewares.length > 0) {
            Log(Color.FgGreen + 'Plugin Manager ['+realName+']' + Color.Reset, "Registered " + Color.FgRed + Reg.middlewares.length + Color.Reset + " middlewares")
            MIDDLEWARES.push(...Reg.middlewares)
            delete Reg.middlewares;
        }

        CalculatePluginString();
        
        NAME_LOCKS.push(realName);
        L('Plugin registered successfully: ' + Color.FgGreen + realName);
    } catch (e) {
        L('Failed to initialize plugin:', e);
    }
}

const CalculatePluginString = () => {
    FrontendString = "";
    for(const name in REGISTERED_FRONTEND) {
        if (FrontendString) FrontendString += ",";
        const v = REGISTERED_FRONTEND[name];
        FrontendString += `'${name}':${v}`;
    }
}
let FrontendString = "";

module.exports.GetFrontendString = () => FrontendString;
module.exports.Registered = REGISTERED;
module.exports.RegisteredFrontend = REGISTERED_FRONTEND;
module.exports.Middlewares = MIDDLEWARES;
module.exports.RegSockets = R_SOCKETS;