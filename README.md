# groundfork-js

JavaScript-client for building offline-capable web applications using the GroundFork synchronization framework.

```
var store = new GroundFork.BrowserStorage({
    namespace : 'myApp'
});

var api = new GroundFork.Api({
    storage            : store,
    onBatchJobStart    : function() {},
    onBatchJobComplete : function() {}
});

var endpoint = new GroundFork.BasicHttpEndpoint({
    api                : api,
    url                : 'http://localhost:3333/',
    clientKey          : 'root-user',
    clientSecret       : 'password',
    onRequestStart     : function() {},
    onRequestComplete  : function() {}
});

api.command({
   method   : 'POST'
   resource : 'recipes'
   payload  : {
       title       : 'Paneer Tikka Masala',
       ingredients : ['Cottage Cheese', 'Lemon Juice', 'Ginger-Garlic Paste', 'Red Chili Powder']
   }
});
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

|                     |   |   |   |   |
|---------------------|---|---|---|---|
| debugMode           |   |   |   |   |
| patterns            |   |   |   |   |
| storage             |   |   |   |   |
| onBatchJobStart     |   |   |   |   |
| onBatchJobComplete  |   |   |   |   |
| interval            |   |   |   |   |


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
