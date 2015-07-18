# groundfork-js

JavaScript-client for building offline-capable web applications using the GroundFork synchronization framework.

> under construction

A typical implementation entails three parts:

* storage,
* a synchronization endpoint, and the
* api.

##### Storage

The device cache. The library contains a default backend using the browser's local storage object. 

##### Endpoint

Points to a running GroundFork Antenna (https://github.com/johanneshilden/groundfork-antenna-postgres) service which is used for synchronization, when connectivity is available. 

##### Api

Application resources are exposed through a client-side REST interface that encapsulates commands in a format suitable for logging. Resources are stored on the device for subsequent synchronization with other devices, 

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
| namespace           |           | required  | string    |   |   |

## Api

```
var api = new GroundFork.Api(config);
```

### Config keys

| Property            | Default   | Required? | Type     |   |
|---------------------|-----------|-----------|----------|---|
| debugMode           | false     |           | boolean  |   |
| patterns            |           |           |          |   |
| storage             |           | required  |          |   |
| onBatchJobStart     |           |           | function |   |
| onBatchJobComplete  |           |           | function |   |
| interval            | 15        |           | number   |   |

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
| api                 |                         | required  |           |   |
| clientKey           |                         | required  | string    |   |
| clientSecret        |                         | required  | string    |   |
| onRequestStart      |                         |           | function  |   |
| onRequestComplete   |                         |           | function  |   |
| syncSuffix          | 'sync'                  |           | string    |   |
| url                 | 'http://localhost:3333' |           | string    |   |
| requestHandler      |                         |           |           |   | 

#### sync (target, onSuccess, onError, onProgress)
