const $             = require('./lane.js'),
      uuid          = require('uuid').v1,
      fs            = require('fs'),
      path          = require('path'),
      {Log, Color}  = require('./console.js'),
      Util          = require('./utils.js');

function SesLog(...args) {
    Log(Color.FgMagenta + "Session", ...args);
}

module.exports = (EXPIRE_TIME = 3600, DOMAIN = null) => {
    //const Buffer = new (require('./config.js').Class)(, true);
    const PATH   = path.resolve(__dirname + "/../.session/");
    if (!fs.existsSync(PATH)) fs.mkdirSync(PATH);

    const RETURN = async (req, res, next) => {
                var P = false,
                    Buffer = {},
                    ID,
                    changedSomething = false;
                
                function SetUpSession() {
                    ID = req.cookies.GSESS;
                    P = PATH + "/" + ID;

                    // Check for file

                    function NewSession() {
                        console.log("Creating new session id at request", req.method)
                        ID = uuid().replace(/[\-]+/ig, "");
                        P = PATH + "/" + ID;
                        Buffer = {};
                        res.cookie('GSESS', ID, {
                            domain: typeof DOMAIN === 'string' ? DOMAIN : null,
                            expires: null,
                        });
                        fs.writeFileSync(P, JSON.stringify(Buffer));
                    }

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

                req.session = (key, write) => {
                    if (P === false) SetUpSession();

                    if (write == null) {
                        return Buffer[key] || false;
                    } else {
                        Buffer[key] = write;
                        changedSomething = true;
                    }
                }

                req.session.Save = () => {
                    fs.writeFileSync(P, JSON.stringify(Buffer));
                }
                next();
          };

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

    this.CleanupInterval = setInterval(this.Cleanup, 60000 * 60 * 3);
    this.Cleanup();

    return RETURN;
}