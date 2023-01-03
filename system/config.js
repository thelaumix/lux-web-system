const fs    		= require('fs'),
	  $				= require('./lane'),
	  {Log, Color}  = require('./console'),
	  Config		= require('lux-config');

const LOG_PRE = Color.FgYellow + "Config";


// Path to config files


/**
 * Builds the configuration tree
 * @param {Array<string>} configs Configuration name fields
 * @param {string} path The path to the configuration yaml files
 */
var P_CONFIG;
module.exports = function(configs = [], path = false) {
	if (path == null || path === false) throw (new Error("No configuration path specified")).name("LxNoConfigPathException")
	
	P_CONFIG = path;
	if ((configs || []).length <= 0) {
		Log(LOG_PRE, "No configuration to build")
		return;
	}
	if (!fs.existsSync(path)) fs.mkdirSync(path);
	
	// Tree to build
	let buffer = {};

	const newBuffer = (name, nobuffer = false) => {
		const cname = name.replace(/[^a-z0-9\_\-\.\@]/ig, "").toLowerCase() + ".yml";
		if (nobuffer === true) {
			Log(LOG_PRE, " > Silent linking", Color.FgYellow + cname)
			return new Config(P_CONFIG + cname);
		} else {
			Log(LOG_PRE, " > Linking", Color.FgYellow + cname)
			buffer[name] = new Config(P_CONFIG + cname);
		}
	}

	for(let name of configs) {
		newBuffer(name);
	}
	Log(LOG_PRE, "Built configuration tree")

	buffer._MakeNew = newBuffer;
	return buffer;
}


module.exports.Class = Config;