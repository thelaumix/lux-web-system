const fs    		= require('fs'),
	  YAML  		= require('yaml'),
	  $				= require('./lane.js'),
	  {Log, Color}  = require('./console.js');

const LOG_PRE = Color.FgYellow + "Config";

class ConfigSection {
    /**
     * Configuration section manager
     * @param {object*} data Optional data to fill in
     */
	constructor(data = {}) {
		if (typeof data != "object") data = {}
		this._data = data;
	}

    /**
     * Setup default parameter. Does not override already existing value
     * @param {string} path Element Path 
     * @param {*} value Value to set as default 
     * @returns {ConfigSection} The updated Config Section
     */
	AddDefault(path, value) {
		if (this.Get(path) === undefined) this.Set(path, value);
		return this;
	}

    /**
     * Return a subsection at specified path
     * @param {*} path Section Path
     * @returns {ConfigSection} The updated Config Section
     */
	GetSection(path) {
		let tmp = this.Get(path);
		if (tmp instanceof Object) return new ConfigSection(tmp);
		return new ConfigSection()
	}

    /**
     * Fetch section keys
     * @param {boolean} deep Whether or not the key search should be recursive in sub paths
     * @returns {Array} Array of all requested keys
     */
	GetKeys(deep = false) {
		let keys = [];
        // Subkey iterator
		function getSubkeys(obj, prefix="") {
			for(let k in obj) {
				keys.push(prefix+k);
				if (deep && obj[k] instanceof Object) getSubkeys(obj[k], k+".");
			}
		}
		getSubkeys(this._data);
		return keys;
	}

    /**
     * Fetch value on specified path
     * @param {string} path The config path the value shall be searched in for
     * @param {*} defaultValue Default value if none was found
     * @returns {*} The found or default value
     */
	Get(path, defaultValue) {
		function index(obj,is, value) {
			if (typeof is == 'string')
				return index(obj,is.split('.'), value);
			else if (is.length==1 && value!==undefined)
				return obj[is[0]] = value;
			else if (is.length==0)
				return obj;
			else
				return index(obj[is[0]],is.slice(1), value);
		}

		try {
			let val = index(this._data, path);
			if (val != null) return val;
		} catch {}
		
		return defaultValue;
	}
    /**
     * Updates value on specified path
     * @param {string} path The target path to update
     * @param {*} value The value to inject
     * @param {boolean} unset If true, the target value will be unlinked
     * @returns {ConfigSection} The updated config section
     */
	Set(path, value, unset = false) {
		function index(obj,is, value) {
			if (typeof is == 'string')
				return index(obj,is.split('.'), value);
			else if (is.length==1 && value!==undefined)
				{
					if (unset) return delete obj[is[0]];
					else return obj[is[0]] = value;
				}
			else if (is.length==0)
				return obj;
			else
				return index(obj[is[0]],is.slice(1), value);
		}

		let pathspl = path.split(".");

        // Find target path struct
		for(let i=1; i<pathspl.length; i++) {
			let cpath = "";
			for(let c=0; c<i; c++) {
				if (c>0) cpath += ".";
				cpath += pathspl[c];
			}
			if (typeof index(this._data, cpath) != "object") {
				index(this._data, cpath, new Object());
			}

		}

		index(this._data, path, value);
		
		return this;
	}
}

class Config extends ConfigSection {
    /**
     * Configuration Master
     * @param {string} name Configuration definer
     */
	constructor(name, path = null) {
		super();
		if (path != null)
			this._path = path;
		else
			this._path = `${P_CONFIG}${name}.yml`;
		this.Reload();
	}

    /**
     * Reloads the configuration from file
     * @returns {Config} Updated configuration
     */
	Reload() {
		this._data = {};
        Log(LOG_PRE, 'Loading up ' + Color.FgYellow + this._path + Color.Reset + "...")
		if (fs.existsSync(this._path)) {
			let data = fs.readFileSync(this._path).toString();

			try {
				let tmp = YAML.parse(data);
				this._data = tmp;
                Log(LOG_PRE, 'Parsed YAML Data...');
			} catch { }
		} else {
			// Handle defaults
			this.Save();
            Log(LOG_PRE, 'Saving defaults...');
		}
		if (this._data == null || this._data === undefined) {
            this._data = {};
            
            Log(LOG_PRE, 'Empty file buffer. Setting clean');
        }
        Log(LOG_PRE, ' > Finished CONF loading for ' + Color.FgGreen + this._path);
		return this;
	}

    /**
     * Saves the configuration to file
     */
	async Save() {
		let yaml = YAML.stringify(this._data);
		fs.writeFileSync(this._path, yaml);
	}
}

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
	for(let name of configs) {
		buffer[name] = new Config(name.replace(/[^a-z0-9\_]/ig, "").toLowerCase());
	}
	Log(LOG_PRE, "Built configuration tree")
	return buffer;
}
