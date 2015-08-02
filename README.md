# groundfork-js

JavaScript-client for GroundFork -- a synchronization framework for creating offline-capable web applications.

##### Use cases: 

1. SPAs running in a browser or browser-like environment where local storage is used for device-local persistence.
2. For syncing data in mobile applications (distributed storage). 
3. As a wrapper, for managing replication and adding offline capabilities to existing systems that run on a local web server.

A typical implementation entails three parts:

* a storage,
* a synchronization endpoint, and 
* the offline api.

##### Storage

A device cache. The default backend uses the browser's local storage object. 

##### Endpoint

Points to a running [GroundFork Antenna](https://github.com/johanneshilden/groundfork-antenna-postgres) service. The server handles replication and synchronization.

##### Api

Application resources are exposed through a client-side REST interface. Commands are encapsulated in a format suitable for logging ([command pattern](https://sourcemaking.com/design_patterns/command)) and resources are stored on the device for subsequent synchronization with other devices. 

#### Contrived example

```javascript
var GroundFork = require('./groundfork');

/*
 * Initialization; only done once in the application.
 */ 

var store = new GroundFork.BrowserStorage({
    namespace : 'myApp'
});

var api = new GroundFork.Api({
    storage   : store
});

var endpoint = new GroundFork.BasicHttpEndpoint({
    api          : api,
    url          : 'http://localhost:3333',
    clientKey    : 'demo',
    clientSecret : 'demo'
});

/*
 * This is how you would interact with application resources. In this example, we 
 * create a new 'recipe'. Nothing is commited to the server, so there is no network 
 * activity involved.
 */ 

var recipe = {
   title       : 'Paneer Tikka Masala',
   ingredients : ['Cottage Cheese', 'Lemon Juice', 'Ginger-Garlic Paste', 'Red Chili Powder']
};

var response = api.command({
   method   : 'POST'
   resource : 'recipes'
   payload  : recipe
});

/* or equivalently; api.post('recipes', recipe);  */

/*
 * At any point, We can sync our local timeline with other nodes. This requires a 
 * Groundfork Antenna server to be set up and running. 'target-node' refers to a
 * device registered with the service. (A device may sync against itself.)
 */ 

endpoint.sync(['target-node']);
```

## Storage

### BrowserStorage

```javascript
var store = new GroundFork.BrowserStorage({
    namespace: 'myApp'
});
```

#### Config keys

| Property            | Default   | Required? | Type      |  Description  |
|---------------------|-----------|-----------|-----------|----|
| namespace           |           | required  | string    | A prefix used for local storage key names. |
| useCompression      | true      |           | boolean   | Data is stored in compressed format. (Local storage is limited to 5MB in most browsers.) |

## Api

```javascript
var api = new GroundFork.Api(config);
```

#### Config keys

| Property            | Default   | Required? | Type     | Description  |
|---------------------|-----------|-----------|----------|---|
| debugMode           | false     |           | boolean  | Enables logging of various debug data to the console. |
| patterns            |           |           | object   |   |
| storage             |           | required  | object   | A `GroundFork.Storage` instance. |
| onBatchJobStart     |           |           | function |   |
| onBatchJobComplete  |           |           | function |   |
| useProxy            | true      |           | boolean  | If true, local data is copied to memory during batch operations for better performance. |
| interval            | 15        |           | number   | A timeout interval used to avoid busy looping during post-sync batch jobs. |

##### Overriding route patterns

```javascript
var api = new GroundFork.Api({
    storage  : store,
    patterns : {
        'POST/recipes': function() {
            // save recipe
        }
    },
});
```

#### Methods

##### command (request)

##### isBusy ()

##### syncPoint ()

##### setSyncPoint (timestamp)

##### log ()

#### Convenience request methods

##### post (resource, payload, options)

###### Example:

```javascript
var post = {
   title  : 'My first post',
   body   : 'You are in the house. You can see an altar and a painting of a dragon on the far wall.'
};

var response = api.post('posts', post);
var myFirstPost = response.id;          // == 'posts/1'

var comment = {
    contents : 'Cool story, bro!',
    created  : Date.now() / 1000 | 0
};

api.post('comments', comment, {
    collection: myFirstPost             // cons this comment to the post's comments
});
```

##### put (resource, payload, options)

##### patch (resource, payload)

##### delete (resource)

## Endpoint

```javascript
var endpoint = new GroundFork.BasicHttpEndpoint(config);
```

#### Config keys

| Property            | Default                 | Required? | Type      | Description  |
|---------------------|-------------------------|-----------|-----------|---|
| api                 |                         | required  | object    |   |
| clientKey           |                         | required  | string    |   |
| clientSecret        |                         | required  | string    |   |
| onRequestStart      |                         |           | function  |   |
| onRequestComplete   |                         |           | function  |   |
| syncSuffix          | `'sync'`                  |           | string    |   |
| url                 | `'http://localhost:3333'` |           | string    |   |
| requestHandler      | `ajaxRequestHandler` |           | function  | See below. | 

#### Request handler

##### Available options:

* `BasicHttpEndpoint.ajaxRequestHandler`
* `BasicHttpEndpoint.nodeRequestHandler`

Default is to use jQuery's `$.ajax` api. For node.js implementations, use `BasicHttpEndpoint.nodeRequestHandler` instead.

##### Example:

```javascript
var endpoint = new GroundFork.BasicHttpEndpoint({
    api            : api,
    clientKey      : 'demo',
    clientSecret   : 'demo', 
    requestHandler : GroundFork.BasicHttpEndpoint.nodeRequestHandler
});
```

#### Methods

##### sync (target, onSuccess, onError, onProgress)
