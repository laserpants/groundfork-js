# groundfork-js

JavaScript-client for GroundFork -- a synchronization framework for creating offline-capable web applications.

> under construction

##### Use cases: 

1. SPAs running in a browser or browser-like environment where local storage is used for device-local persistence.
2. As a wrapper, for managing replication and adding offline capabilities to existing systems that run on a local web server.

A typical implementation entails three parts:

* a storage,
* a synchronization endpoint, and the
* offline api.

##### Storage

The device cache. The library incorporates a default backend, operating on the browser's local storage object. 

##### Endpoint

Points to a running [GroundFork Antenna](https://github.com/johanneshilden/groundfork-antenna-postgres) service. The endpoint is used for replication and synchronization, when connectivity is available. 

##### Api

Application resources are exposed through a client-side REST interface which encapsulates commands in a format suitable for logging. Resources are stored on the device for subsequent synchronization with other devices. 

#### Contrived example

```javascript
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
 * This is how you would interact with application resources. Here we create a new 'recipe'.
 * It works the same whether the device is online or offline.
 */ 

var recipe = {
   title       : 'Paneer Tikka Masala',
   ingredients : ['Cottage Cheese', 'Lemon Juice', 'Ginger-Garlic Paste', 'Red Chili Powder']
};

api.command({
   method   : 'POST'
   resource : 'recipes'
   payload  : recipe
});

/*
 * At any point, We can sync our local resources with other nodes. This requires a 
 * Groundfork Antenna server to be set up and running. 'target-node' refers to another
 * device registered with the service.
 */ 

endpoint.sync(['target-node'], 
    function onSuccess() { /* ... */ }, 
    function onError(err) { /* ... */ });

```

```
var GroundFork = require('groundfork-js');
```

## Storage

```javascript
var store = new GroundFork.BrowserStorage({
    namespace: 'myApp'
});
```
### Config keys

| Property            | Default   | Required? | Type      |  Description  |
|---------------------|-----------|-----------|-----------|----|
| namespace           |           | required  | string    | A prefix used for local storage key names. |

## Api

```javascript
var api = new GroundFork.Api(config);
```

### Config keys

| Property            | Default   | Required? | Type     | Description  |
|---------------------|-----------|-----------|----------|---|
| debugMode           | false     |           | boolean  | Enables logging of various debug data to the console. |
| patterns            |           |           | object   |   |
| storage             |           | required  | object   | A GroundFork.Storage instance. |
| onBatchJobStart     |           |           | function |   |
| onBatchJobComplete  |           |           | function |   |
| interval            | 15        |           | number   | A timeout interval used to avoid busy looping during sync batch jobs. |

### Methods

#### command (request)

#### isBusy ()

#### syncPoint ()

#### setSyncPoint (ts)

#### log ()

## Endpoint

```javascript
var endpoint = new GroundFork.BasicHttpEndpoint(config);
```

### Config keys

| Property            | Default                 | Required? | Type      | Description  |
|---------------------|-------------------------|-----------|-----------|---|
| api                 |                         | required  | object    |   |
| clientKey           |                         | required  | string    |   |
| clientSecret        |                         | required  | string    |   |
| onRequestStart      |                         |           | function  |   |
| onRequestComplete   |                         |           | function  |   |
| syncSuffix          | 'sync'                  |           | string    |   |
| url                 | 'http://localhost:3333' |           | string    |   |
| requestHandler      |                         |           | function  | Default is to use jQuery's $.ajax api. Note that for node implementations, a different request handler must be provided. | 

### Methods

#### sync (target, onSuccess, onError, onProgress)
