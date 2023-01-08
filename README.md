
# LUX Web System

Entirely node.js based web framework including REST API and socket.io support, script compression and SQL integration. AND: Newly added plugin support and SQL pooling.

## Basic Usage

To set up the server runtime,

```js
const LxWebApplication = require("lux-web-system")

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
		endpoint: '/api',
		middlewares: []
	},
	api_cors: false,
	ddos: {
		weight: 1,
		maxWeight: 10,
		checkInterval: 1000
	},
	template_fields: {}
}

const {Query, Conf, Log, Color, Use} = LxWebApplication(options);
```

The application initializer will create all directories needed and furthermore returns some useful functions to interact with the running server. These functions are:

- `Query` <br>Promise-based SQL caller. This is using the managed SQL connection pool created within the application and returns a Promise resolving into the call result.<br>**Usage**: `Query(query_string, fields)`
	- `Query.GetConnection()`<br>Promise-based. Returns a dedicated, free connection from the SQL pool (`Connection`).
		- `Connection()` Identical to `Query()`, but using the dedicated connection instead of a randomly free connection every time (like `Query()` does)
		- `Connection.Release()` **IMPORTANT:** Release the connection after using it, so it can be reused.
- `Conf` <br>Configuration holder. Contains all configuration elements named by the pattern defined in the `configs`-section within the options object (Case Sensitive)<br>For example the "program.yml" configuration from the default options will be accessible at `Conf.Program`
- `Log` <br>Strongly recommended to use this instead of `console.log`.<br>**Usage**: `Log(env_name, ...args)`
- `Color` <br>Console color holder. See reference for more.
- `Use` <br>Register a plugin instance on the system. For more details, refer to the [plugins](#plugins) section below.<br>**Usage**: `Use(plugin_constructor, ?permissions)`
	- `permissions` *(optional)*: An object declaring the plugin's permissions. At the moment, there is only need for this if the plugin requires to use SQL querying, in which case `permissions` should look like this:<br>`{ sql: true }`. Otherwise, this field can be completely omitted.

> ***Notice:** Plugins will modify the automatically generated lux.js file. If you add or remove plugins, it may be required to clear the cache manually in your browser. An easy workaround for this is to append an increasing query to the src tag (`js:lux.js?2` etc.)*

Please try not to overwrite these functions, because a second call of the LxWebApplication function is not possible.

> **IMPORTANT:** There is *no default and built-in DDoS protection / rate limiting in the system anymore.* This way users can address security concerns on their own and the way they prefer best. It is though highly recommended to set up a protection mechanism such as [rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible) or [dddos](https://github.com/ololoepepe/dddos) yourself, which can be added as a *middleware* to `options.server.middlewares`.


#### `LxWebApplication` Options

The following options are available to modify the initializer of LxWebApplication

- `name` *: string* <br>The environment name. Will be shown in Logs and API not-found prompts
- `configs` *: Array&lt;string&gt;* <br>All the configurations that should be read. More information about that in the config section
- `directories` *: Object*
  - `config` *: string* <br>Root-relative path of the folder the config files will be stored in. Has to end with **/**
  - `workspace` *: string* <br>Root-relative path of the folder the endpoint and frontend folders will be placed. Has to end with **/**
- `sql` *: Object* - Defaults to `false`, meaning no SQL manager will be loaded and `Query` will not be working. Once an object is submitted, it will overwrite the defaults
  - `connectionLimit` *:number* . Defazkts to `60`<br>The maximum number of connections managed by the connection pool
  - `host` *: string* - Defaults to `localhost`<br>SQL server host
  - `user` *: string* - Defaults to `root`<br>SQL username
  - `password` *: string* - Defaults to `root`<br>SQL user password
  - `charset` *: string* - Defaults to `utf8mb4`<br>SQL charset to use.
  - `database` *: string* - Defaults to `""`<br>SQL database to select
- `ssl` *: Object* **(required)**
  - `key` *: string* <br>Path to the SSL private key file
  - `cert` *: string* <br>Path to the SSL certificate file
- `session` *: boolean* <br>Whether or not to use sessions in the API endpoint
- `session_expire_time` *: number* <br>Time in seconds sessions will last until they expire
- `session_domain` *: string* <br>If set, stores the session cookie for this domain
- `server` *: Object*
  - `port` *: number* <br>Port to bind the application to
  - `frontend` *: string* <br>URL where the frontend will be found. **Not** ending with **/**
  - `endpoint` *: string* <br>URL where the endpoint and the socket will be found. **Not** ending with **/**
  - `middlewares` : *Function[]* <br>An array of express.js middleware functions to use on a global scope. It is recommended to use a **rate limiter** at this point, to prevent too many requests or DDoS attacks.
- `api_cors` *: string* <br>Defaults to `false` meaning that no CORS policy will be loaded <br>If set to a domain string, API will use this domain string as CORS policy domain
- `template_fields` *: Object | string* <br>Assign the fields for the template replacement to assign. This replacement is primarily dedicated to CSS and JS resource files.<br>If is a **string**, it will specify a config file and path to look after. This shall be provided in the format `confname:path.to.holder` *(with `confname` being the name of the config file)*. If there is no sub object that holds the field information, the path can be left empty: `confname:`

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

These folders are meant to serve the resource files, where the files will automatically be wrapped up in a single compressed file. Resource files can be accessed at the URL `<frontend>/css:main.css` or similar.

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
const {Call, Socket, Page, Plugins} = Lux({
	backend:  "<PATH-TO-ENDPOINT>",		// Optional, defaults to /api
	socket: true						// Whether or not a socket connecion
										//   should be created
})
```

- `Call(api, data, method)`<br>Calls a REST API endpoint <br>Returns a **Promise** resolving to the call result.
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
- `Page`
  - `Page(path)`<br>Dynamic URL handling. Calling this function switches to the desired path without reloading the page. Path changes, as well as Browser Navigation Events, can be handled with:
  - `Page(callback)`<br>This should **always happen first**. Within this function you can handle what happens if a specific URL has been called.
  - `Page.Args`<br>Array that contains all arguments of the path (`/arg0/arg1/arg2 ...`)<br>Will be updated *before the page handle callback is invoked*
  - `Page.Path`<br>Similar to window.location.href
- `Plugins`<br>Collection of all loaded plugin frontend libraries. Because plugins are loaded asynchronously, it is possible for the plugins to load a little bit later. To capture this, 

## Working with the BACKEND

On first run, an `endpoints` folder will be created inside the `directories.workspace` folder. This folder will by default contain two template files, that **never should be renamed or deleted**: `api.js` and `socket.js`.

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
module.exports = (On, Log, Query, Conf, Util, Sock) => {
	On('test', data  => {
		Log("Received data", data)
		return {received:  data, time:  Util.time()};
	})
}
```

- `On(event, handler)`<br>Registers an event handler at the socket.io instance
  - `event` Name of the event the server should listen to
  - `handler(data)` Handler function that returns the response sent back to the requesting client.
- `Sock` <br>Contains the server's socket information
  - `.socket` The socket the command has been issued from
  - `.io` The global socket.io `io` object
- *All other fields identical to api.js*



## Plugins
Plugins can extend the functionality of the web system dramatically by being able to hook into both backend and frontend. They are an easy, flexible and reusable way of adding new or complicated behavior to the web application.

### Loading a plugin

It's just as simple as that:
```js
const plugin1 = require('./my-local-plugin');			// Loads a JS file
const plugin2 = require('some-other-plugin-module');	// Loads a npm module

const App = LxWebApplication(options);
App.Use(plugin1);
App.Use(plugin2, {sql: true});
```

Or if you prefer to use it inline:
```js
const App = LxWebApplication(options);
App.Use(require('./my-local-plugin'));
```
Unfortunately you cannot stack these into one function because of the optional `permissions` parameter. But hey - there are worse problems, don't you think?

For example the case in which you prefer to declare your plugins completely hardcore-inline - which you can, but definately shouldn't.
```js
const App = LxWebApplication(options);
App.Use(($) => {
	$.Begin('iamcrazy');

	...
});
```
> **IMPORTANT**: Please keep in mind, that any changes to plugin usage within the system will affect the automatically generated lux.js file, which is cache controlled by browsers. You may need to manually force a cache revalidation on this file once you apply modifications to your plugin setup.

### Writing a plugin

If you decide to write your own plugins for LUX Web System, theres alomst nothing easier than that. Either you create a new, dedicated node.js module for being able to easily reuse and redistribute your libraries in the future, or you do it locally. Either way, the first step should be creating the main plugin file. Whether or not you work with further modules or not is completely up to you, but the main syntax and workflow of the plugin creation process shoult be maintained.
> Please try to give your plugin an identifier name, that has a low chance of being used by other developers, due to the fact that names can only be used once inside a system instance.

<br>

#### **`main.js`** 
*The main plugin and/or module index file. This one should be imported with `Use(...)`.*
```js
module.exports = ($) => {
	// Before anything can happen, the plugin should tell the system how it is called.
	// This step is inevitable and MUST happen first.
	//
	// (Please replace <plugin_name> with the unique name of your plugin)
    $.Begin('<plugin_name>');

	// We can now add some resource files to the plugin that the plugin
	// uses at the frontend.
    // Unfortunately, the full system path must be passed to this.
    $.FrontendFile(__dirname + '/frontend.js');
    $.FrontendFile(__dirname + '/fancy-design.css');

    // Let's register an API endpoint for our plugin.
    // In this instance, the endpoint can be found
    // at /<api_path>/@/<plugin_name>/123
    $.API('get', '/123', (req, res) => {
        res.json({result: 'OK'});
    })

    // Now, let's create a websocket command handler.
    // In this case, the command this handler responds to
    // will be named @<plugin_name>:123
    $.Socket('123', (data) => {
        return {message: 'Got your data!', received: data};
    })

    // We can even register one ore more globally scoped express 
    // middlewares on the server if we desire.
    $.Middleware((req, res, next) => {
        $.Log('Plugin middleware was just called on path', req.path);
        next();
    })
}
```

There are some other useful helper functions and objects that you can use from inside the plugin. They work similar to their equally named counterparts in api.js and socket.js.

```js
$.Query()
	// Use the async SQL query function. FALSE if no permission
	// Requires a permission scope to function and depends on whether
	// or not the sql option has been set on initialization.        
$.Config
	// Access the programs configuration section.
$.Log()
	// Outputs "Plugin (<name>): ..." log message
$.Emit()
	// Emits a global web socket event
$.Util
	// Utility helper
$.WorkspacePath
	// The OPTIONS value for the workspace directory
```

In case you declared some frontend files, they will be automatically added to the main framework and, once loaded by the frontend, can be accessed as described in the FRONTEND section. The only real requirement is for the `Lux()` constructor being called. The system will then try and load the respective frontend scripts, style sheets will as well be applied to the document automatically.

> **IMPORTANT**: Please keep in mind, that any changes to plugin usage within the system will affect the automatically generated lux.js file, which is cache controlled by browsers. You may need to manually force a cache revalidation on this file once you apply modifications to your plugin setup.

<br>

#### **`frontend.js`** 

*The javascript that gets served as frontend plugin.*
```js
const plugin = {};

plugin.SomePublicFunction = () => {
    alert('Hey everybody! This is the plugin speaking.');
}

export const Enable = ($) => {
    plugin.CallMyBackend = async () => {
	    const result = await $.Call('123');
	    console.log(result);
    }
    return plugin;
}
```
Your frontend file needs the `Enable`-function being exported, which is being called once at startup. The `$`-object being passed to it contains the exact same fields as the `Lux()`-Constructor returns. The only real difference is the behavior of `Call`, which, by default, calls the plugin's internal APIs located at `<api_path>/@/<plugin_name>/...`. To make a non-scoped, global API call, you can prepend a slash to the path.  *`$.Call('/123')`*

> Notice, that `$.Plugins` will most likely not contain every plugin on startup, due to the plugins being loaded asynchronously.



## Credits

This system uses many external modules that are included as peer dependencies, and without which the system would not work that good. You can find a list of all dependencies in the dependencies tab. Many, ***many*** thanks to all the authors, developers and extensions making this project possible!

## License

Released under the [MIT](https://github.com/thelaumix/lux-web-system/blob/main/LICENSE) license
