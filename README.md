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

endpoint.sync(['target-node'], 
    function onSuccess() { /* ... */ }, 
    function onError(err) { /* ... */ });

```

> under construction

```
var GroundFork = require('groundfork-js');
```

## Storage

|                     |    |          |        |   |   |
|---------------------|----|----------|--------|---|---|
| namespace           |    | required | string |   |   |

## Api

|                     |           |           |          |   |
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

|                     |                         |           |           |   |
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
