const $             = require('./lane'),
      uuid          = require('uuid').v1,
      fs            = require('fs'),
      path          = require('path'),
      {Log, Color}  = require('./console'),
      Util          = require('./utils');

/**
 * Session Log function
 * @param  {...any} args Elements to print
 */
function SesLog(...args) {
    Log(Color.FgMagenta + "Session", ...args);
}

module.exports = (EXPIRE_TIME = 3600, DOMAIN = null) => {
    //const Buffer = new (require('./config.js').Class)(, true);
    const PATH   = path.resolve(__dirname + "/../.session/");
    if (!fs.existsSync(PATH)) fs.mkdirSync(PATH);

    /**
     * Session middleware for express
     */
    const RETURN = async (req, res, next) => {
                var P = false,
                    Buffer = {},
                    ID,
                    changedSomething = false;
                
                /**
                 * Session set up
                 */
                function SetUpSession() {
                    ID = req.cookies.GSESS;
                    P = PATH + "/" + ID;

                    /**
                     * Create a new session if none recognized or session expired
                     */
                    function NewSession() {
                        ID = uuid().replace(/[\-]+/ig, "");
                        P = PATH + "/" + ID;
                        Buffer = {};
                        res.cookie('GSESS', ID, {
                            domain: typeof DOMAIN === 'string' ? DOMAIN : null,
                            expires: null,
                        });
                        fs.writeFileSync(P, JSON.stringify(Buffer));
                    }

                    /**
                     * Check for existance or set up
                     */
                    if (!ID || !fs.existsSync(P)) {
                        NewSession();
                    } else if (Math.round((Date.now() - fs.statSync(P).mtime.getTime()) / 1000) >= EXPIRE_TIME) {
                        fs.unlinkSync(P);
                        NewSession();
                    } else {
                        try {
                            Buffer = JSON.parse(fs.readFileSync(P, 'utf-8')) || {};
                        } catch (e) {console.error(e)}
                    }
                }

                /**
                 * Session getter / Setter
                 * @param {*} key Session storage key
                 * @param {*} write Session storage value
                 * @returns If write is unset, return value at key in Session
                 */
                req.session = (key, write) => {
                    if (P === false) SetUpSession();

                    if (write == null) {
                        return Buffer[key] || false;
                    } else {
                        Buffer[key] = write;
                        changedSomething = true;
                    }
                }

                /**
                 * Session save
                 */
                req.session.Save = () => {
                    if (fs.existsSync(P))
                        fs.writeFileSync(P, JSON.stringify(Buffer));
                }
                next();
          };

    /**
     * Cleanup function to delete all session files older than session expire time
     */
    this.Cleanup = async () => {
        SesLog("Starting session cleanup routine...")
        const now = Date.now();

        let files = fs.readdirSync(PATH);
        for(let file of files) {
            const pth = path.join(PATH, file);
            let stat = fs.statSync(pth);
            if (Math.round((now - fs.statSync(pth).mtime.getTime()) / 1000) >= EXPIRE_TIME)
                fs.unlinkSync(pth)
        }
        SesLog("Cleanup routine ended")
    }

    /**
     * Initiating session cleanup
     */
    this.CleanupInterval = setInterval(this.Cleanup, 60000 * 60 * 3);
    this.Cleanup();

    return RETURN;
}