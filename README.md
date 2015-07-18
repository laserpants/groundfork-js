# groundfork-js

JavaScript-client for GroundFork -- a synchronization framework for creating offline-capable web applications.

> under construction

A typical implementation entails three parts:

* storage,
* a synchronization endpoint, and the
* api.

##### Storage

The device cache. The library contains a default backend, operating on the browser's local storage object. 

##### Endpoint

Points to a running [GroundFork Antenna](https://github.com/johanneshilden/groundfork-antenna-postgres) service. The endpoint is used for replication and synchronization, when connectivity is available. 

##### Api

Application resources are exposed through a client-side REST interface which encapsulates commands in a format suitable for logging. Resources are stored on the device for subsequent synchronization with other devices, 

#### Contrived example

```
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

var recipe = {
   title       : 'Paneer Tikka Masala',
   ingredients : ['Cottage Cheese', 'Lemon Juice', 'Ginger-Garlic Paste', 'Red Chili Powder']
};

api.command({
   method   : 'POST'
   resource : 'recipes'
   payload  : recipe
});

endpoint.sync(['target-node'], 
    function onSuccess() { /* ... */ }, 
    function onError(err) { /* ... */ });

```

```
var GroundFork = require('groundfork-js');
```

## Storage

```
var store = new GroundFork.BrowserStorage({
    namespace: 'myApp'
});
```

| Property            | Default   | Required? | Type      |   |   |
|---------------------|-----------|-----------|-----------|---|---|
| namespace           |           | required  | string    |   | A prefix used for local storage key names. |

## Api

```
var api = new GroundFork.Api(config);
```

### Config keys

| Property            | Default   | Required? | Type     |   |
|---------------------|-----------|-----------|----------|---|
| debugMode           | false     |           | boolean  | Enables logging of various debug data to the console. |
| patterns            |           |           | object   |   |
| storage             |           | required  | object   | A GroundFork.Storage instance. |
| onBatchJobStart     |           |           | function |   |
| onBatchJobComplete  |           |           | function |   |
| interval            | 15        |           | number   | A timeout interval used to avoid busy looping during sync batch jobs. |

#### command (request)

#### isBusy ()

#### syncPoint ()

#### setSyncPoint (ts)

#### log ()

## Endpoint

```
var endpoint = new GroundFork.BasicHttpEndpoint(config);
```

### Config keys

| Property            | Default                 | Required? | Type      |   |
|---------------------|-------------------------|-----------|-----------|---|
| api                 |                         | required  | object    |   |
| clientKey           |                         | required  | string    |   |
| clientSecret        |                         | required  | string    |   |
| onRequestStart      |                         |           | function  |   |
| onRequestComplete   |                         |           | function  |   |
| syncSuffix          | 'sync'                  |           | string    |   |
| url                 | 'http://localhost:3333' |           | string    |   |
| requestHandler      |                         |           | function  | Default is to use jQuery's $.ajax api. Note that for node implementations, a different request handler must be provided. | 

#### sync (target, onSuccess, onError, onProgress)
