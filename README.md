# LUX Web System

Entirely node.js based web framework including REST API and socket.io support, script compression and SQL integration.

## Basic Usage

To set up the server runtime, 
```js
const  LxWebApplication = require("lux-web-system")

/**
 * This is the DEFUALT options object, that
 * can be overwritten partially or even completely
 * by submitted options. Also works recursively.
 * 
 * You DO NOT NEED to assign every field, but if you encounter
 * errors it might help to try setting the .sql option.
 * 
 * The SSL option is REQUIRED
 */
const options = {
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
	api_cors: false,
	template_fields: {}
}
const {Query, Conf, Log, Color} = LxWebApplication(options);
```

The application initializer will create all directories needed and furthermore returns some useful functions to interact with the running server. These functions are:
- `Query` Promise-based SQL caller. This is using the managed SQL connection created within the application and returns a Promise resolving into the call result.<br>**Usage**: `Query(query_string, fields)`
- `Conf` Configuration holder. Contains all configuration elements named by the pattern defined in the `configs`-section within the options object (Case Sensitive)<br>For example the "program.yml" configuration from the default options will be accessible at `Conf.Program`
- `Log` Strongly recommended to use this instead of `console.log`.<br>**Usage**: `Log(env_name, ...args)`
- `Color` Console color holder. See reference for more.

Please try not to overwrite these functions, because a second call of the LxWebApplication function is not possible.

#### `LxWebApplication` Options
The following options are available to modify the initializer of LxWebApplication
- `name` *: string*<br>The environment name. Will be shown in Logs and API not-found prompts
- `configs` *: Array&lt;string&gt;*<br>All the configurations that should be read. More information about that in the config section
- `directories` *: Object*
  - `config` *: string*<br>Root-relative path of the folder the config files will be stored in. Has to end with **/**
  - `workspace` *: string*<br>Root-relative path of the folder the endpoint and frontend folders will be placed. Has to end with **/**
- `sql` *: Object* - Defaults to `false`, meaning no SQL manager will be loaded. Once an object is submitted, it will overwrite the defaults
  - `host` *: string* - Defaults to `localhost`<br>SQL server host
  - `user` *: string* - Defaults to `root`<br>SQL username
  - `password` *: string* - Defaults to `root`<br>SQL user password
  - `charset` *: string* - Defaults to `utf8mb4`<br>SQL charset to use.
  - `database` *: string* - Defaults to `""`<br>SQL database to select
- `ssl` *: Object*
  - `key` *: string*<br>Path to the SSL private key file
  - `cert` *: string*<br>Path to the SSL certificate file
- `session` *: boolean*<br>Whether or not to use sessions in the API endpoint
- `session_expire_time` *: number*<br>Time in seconds sessions will last until they expire
- `session_domain` *: string*<br>If set, stores the session cookie for this domain
- `server` *: Object*
  - `port` *: number*<br>Port to bind the application to
  - `frontend` *: string*<br>URL where the frontend will be found. **Not** ending with **/**
  - `endpoint` *: string*<br>URL where the endpoint and the socket will be found. **Not** ending with **/**
- `api_cors` *: string*<br>Defaults to `false` meaning that no CORS policy will be loaded<br>If set to a domain string, API will use this domain string as CORS policy domain
- `template_fields` *: Object | string*<br>Assign the fields for the template replacement to assign. This replacement is primarily dedicated to CSS and JS resource files.<br>If is a **string**, it will specify a config file and path to look after. This shall be provided in the format `confname:path.to.holder` *(with `confname` being the name of the config file)*. If there is no sub object that holds the field information, the path can be left empty: `confname:`

## Working with the FRONTEND
The fronend working environment can be found inside the folder `frontend`, generated inside of `directories.workspace`. Its structure must not be changed and looks like this:
```
frontend
└───css
└───html
└───img
└───js
```
Depending on the `server.frontend` setting, all of the frontends content will be found at this very path.

### The HTML folder...
... is comparable to the www/html directory of Apache servers. It MUST contain an index.html file, along with all other regular files that should be used with the frontend. When a specific file at a given URL cannot be found, the app will automatically fallback to the index.html. Otherwise, the folder works similar to a normal web server structure, meaning any file can be found at its relative path URL.

### The CSS and JS folders
These folders are meant to serve the resource files, where the files will automatically be wrapped up in a single compressed file. Resource files can be accessed at the URL `<frontend>/js:app.js` or similar.

#### Automatic compression
The system will wrap multiple source files of the same name group into one compressed source file. Example: `app.js`, `app.test.js` and `app.system.js` will be found compressed together at `<frontend>/js:app.js`.

#### Template Replacement
The system will automatically replace any template strings inside CSS and JS files before compression. If you have set up some object fields on `template_fields` in the `LxWebApplication(...)` constructor options, they will be applied.

For instance, if `template_fields` looks like so:
```js
{
	something: "bananas",
	number: 23
}
```

The compressor will output something like this:
```js
// Before replacement
const {{something}}_info = "I have got {{number}} {{something}}";

// After replacement
const bananas_info = "I have got 23 bananas";
```

### The IMG folder
Even though images can also be stored inside the HTML folder, the `<frontend>/img:*` URL provides some kind of uniformness. Primarily intended to serve images only.

### LUX frontend library
This library is located at `<frontend>/js:lux.js`. It already contains the jQuery and socket.io libraries, along with a LUX Web System API.
> **NOTICE**: Due to the reserved namespace of `lux.js`, files in the frontends `js`-folder named after a `lux.*.js` pattern will not be served.

The LUX API can be constructed as follows:
```js
const {Call, Socket, Page} = Lux({
	backend:  "<PATH-TO-ENDPOINT>",		// Optional, defaults to /api
	socket: true						// Whether or not a socket connecion
										//   should be created
})
```

- `Call(api, data, method)`<br>Calls a REST API endpoint<br>Returns a **Promise** resolving to the call result.
  - `api`: The backend relative API endpoint. Ex: `/api/test` would be called with `Call('test')`
  - `data` *(optional)* The data object. If set, the method will automatically change to `POST`
  - `method` *(optional)* The HTTP method the request should be sent with. Defaults to `GET` without data and `POST` with data.
  - `Call.use(middleware)`<br>Registers a middleware that will be executed before the Call Promise resolves. `middleware` represents a function with one argument object passed:
	  - `xhr` The XHR request object
	  - `data` The returned data
	  - `cancel` By default set to `true`. If set to `false` by the middleware, the request will be canceled and the Promise will resolve with status code -1
  - **Resolves to** `{code, data}`
	  - `code` The HTTP status / response code
	  - `data` The data returned from the endpoint
- `Socket`<br>Object that holds the most important socket handling functons
	- `.Emit(event, ...args)`<br>Emits a socket.io event. Returns a **Promise** resolving to the server response, if existing.<br>*Unanswered events will never resolve the Promise!*
		- `event` The event that should be sent to the server
		- `...args` All arguments that should be passed with the event
	- `.On(event, callback)`<br>Registers a global callback for when the server sends an event
	- `.Connection(callback)`<br>Registers a callback for connection changes. Passed `true` on connection, `false` on disconnection
- `Page(path)`<br>Dynamic URL handling. Calling this function switches to the desired path without reloading the page. Path changes, as well as Browser Navigation Events, can be handled with:
- `Page(callback)`<br>This should **always happen first**. Within this function you can handle what happens if a specific URL has been called.
- `Page.Args`<br>Array that contains all arguments of the path (`/arg0/arg1/arg2 ...`)<br>Will be updated *before the page handle callback is invoked*
- `Page.Path`<br>Similar to window.location.href


## Working with the BACKEND
On first run, there will be created an `endpoints` folder inside the `directories.workspace` folder. This folder will by default contain two template files, that **never should be renamed or deleted**: `api.js` and `socket.js`.

Both contain examples of their basic usage. All changes to these files will be monitored by the system, and once any changes get detected, the API or the Socket will be refreshed automatically. You always can create subfiles with a similar name scheme (`api.v1.js` or `socket.test.js` etc.), which will be monitored too.

### api.js

```js
module.exports = (On, Log, Query, Conf, Util, Emit) => {
	On('get', '/test', (req, res) => {
		res.json({
			result:  "This is an example response",
			second_value:  11880
		})
	})

	...
}
```
- `On(method, path, ...handlers)`<br>Will act exactly like `app.<method>(path, ...handlers)` in express.js
	- `method` The HTTP method that should be listened to
	- `path` express-pattern matched path
	- `... handler(req, res[, next])` express.js handler / middlewares
- `Log(...args)`<br>Web framed logger
- `Query` <br>Identical with `LxWebApplication.Query`
	- `.UID(table, ?length, ?fieldname, ?charset])` Generates a random ID on a table fields in the SQL database
		- `table` The name of the SQL table to address
		- `length` *(optional)* The ID length. Default 30
		- `fieldname` *(optional)* The table column name. Default 'id'
		- `charset` *(optional)* String of characters the UID will be generated from. Defaults to `Util.UID.CHSET_64`
- `Conf` <br>Identical with `LxWebApplication.Conf`
- `Util` <br>Utility holder
	- `.time(?ms)` Returns current UNIX timestamp
		- `ms` *(optional)* A millisecond timestamp to convert from. Otherwise, will be Date.now()
	- `.daystamp(?ts)` Returns the current daystamp
		- `ts` *(optional)* A unix timestamp. Otherwise, will be the current unix timestamp.
	- `.Wait(ms)` Promise-based waiting function
	- `.Assign(source, ...assignables)` Multi-Level object assign helper function
	- `.UID(length, ?charset)` Generates a random ID
		- `length` Character Length
		- `charset` *(optional)* string containing the characters to use. Defaults to `Util.UID.CHSET_64`
	- `.UID`
		- `.CHSET_64` A base 64 charset for UIDs
		- `.CHSET_FULL` A full alphabet & numbers charset
		- `.CHSET_UPPER` A full uppercase alphabet & numbers charset
		- `.CHSET_UCLET` An uppercase letters charset
- `Emit(event, ...args)` socket.io event emitter

### socket.js

Works similar to `api.js`, but with a slightly different handler function:
```js
module.exports = (On, Log, Query, Conf, Util, Storage) => {
	On('test', data  => {
		Log("Received data", data)
		return {received:  data, time:  Util.time()};
	})
}
```
- `On(event, handler)`<br>Registers an event handler at the socket.io instance
	- `event` Name of the event the server should listen to
	- `handler(data)` Handler function that returns the response sent back to the requesting client.
- `Storage` A socket unique storage object 
- *All other fields identical to api.js*


## Credits
This system uses many external modules that are included as peer dependencies, and without which the system would not work that good. You can find a list of all dependencies in the dependencies tab. Many thanks to all the authors, developers and extensions making this project possible!

## License
Released under the [MIT](https://github.com/thelaumix/lux-web-system/blob/main/LICENSE) license