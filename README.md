# groundfork-js

JavaScript-client for building offline-capable web applications using the GroundFork synchronization framework.

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

api.command({
   method   : 'POST'
   resource : 'recipes'
   payload  : {
       title       : 'Paneer Tikka Masala',
       ingredients : ['Cottage Cheese', 'Lemon Juice', 'Ginger-Garlic Paste', 'Red Chili Powder']
   }
});

endpoint.sync(['target-node'], function onSuccess() { /* ... */ }, function onError(err) { /* ... */ });

```

> under construction

```
var GroundFork = require('groundfork-js');
```

## Storage

|                     |          |   |   |   |
|---------------------|----------|---|---|---|
| namespace           | required |   |   |   |

## Api

|                     |           |           |   |   |
|---------------------|-----------|-----------|---|---|
| debugMode           |           |           |   |   |
| patterns            |           |           |   |   |
| storage             |           | required  |   |   |
| onBatchJobStart     |           |           |   |   |
| onBatchJobComplete  |           |           |   |   |
| interval            |           |           |   |   |


#### command (request)

#### isBusy ()

#### syncPoint ()

#### setSyncPoint (ts)

#### log ()

## Endpoint

|                     |                         |           |   |   |
|---------------------|-------------------------|-----------|---|---|
| api                 |                         | required  |   |   |
| clientKey           |                         | required  |   |   |
| clientSecret        |                         | required  |   |   |
| onRequestStart      |                         |           |   |   |
| onRequestComplete   |                         |           |   |   |
| syncSuffix          | 'sync'                  |           |   |   |
| url                 | 'http://localhost:3333' |           |   |   |
| requestHandler      |                         |           |   |   | 

#### sync (target, onSuccess, onError, onProgress)
