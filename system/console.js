/**
 * Prints log to console
 * @param {string} env Environment name
 * @param  {...any} args Print arguments
 */
module.exports.Log = function(env, ...args) {

    if (module.exports.Log.Prefix != null) {
        args.unshift(env);
        env = module.exports.Log.Prefix;
    }

    args.unshift(C.FgCyan + env + ":" + C.Reset);
    
    let date = new Date(),
        datstring = date.getFullYear().toString() + ".";
        datstring += ( "0" + (date.getMonth()+1) ).substr(-2) + ".";
        datstring += ( "0" + date.getDate() ).substr(-2) + "-";
        datstring += ( "0" + date.getHours() ).substr(-2) + ".";
        datstring += ( "0" + date.getMinutes() ).substr(-2) + ".";
        datstring += ( "0" + date.getSeconds() ).substr(-2) + ":";
        datstring += ( "00" + date.getMilliseconds() ).substr(-3);
    
    args.unshift(C.FgBlack + C.BgWhite + "[" + datstring + "]" + C.Reset);
    
    
    console.log.apply(null, args);
}

/**
 * Color index
 */
const C = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",
    FgBlack: "\x1b[30m",
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgBlue: "\x1b[34m",
    FgMagenta: "\x1b[35m",
    FgCyan: "\x1b[36m",
    FgWhite: "\x1b[37m",
    BgBlack: "\x1b[40m",
    BgRed: "\x1b[41m",
    BgGreen: "\x1b[42m",
    BgYellow: "\x1b[43m",
    BgBlue: "\x1b[44m",
    BgMagenta: "\x1b[45m",
    BgCyan: "\x1b[46m",
    BgWhite: "\x1b[47m",
};

module.exports.Color = C;