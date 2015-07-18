# groundfork-js

Synchronization framework for ground computing

> under construction

```
var GroundFork = require('groundfork-js');
```

## Storage

```
var store = new GroundFork.BrowserStorage({
    namespace : 'myApp'
});
```

```
namespace
```

## Api

```
var api = new GroundFork.Api({
    storage            : store,
    onBatchJobStart    : function() {},
    onBatchJobComplete : function() {}
});
```

|             |   |   |   |   |
|-------------|---|---|---|---|
| debugMode   |   |   |   |   |
| patterns    |   |   |   |   |
| storage     |   |   |   |   |

```
debugMode
patterns
storage
onBatchJobStart
onBatchJobComplete
interval
```

### command (request)

### isBusy ()

### syncPoint ()

### setSyncPoint (ts)

### log ()

## Endpoint

```
var endpoint = new GroundFork.BasicHttpEndpoint({
    api               : api,
    url               : 'http://localhost:3333/',
    clientKey         : 'root-user',
    clientSecret      : 'password',
    onRequestStart    : function() {},
    onRequestComplete : function() {}
});
```

```
api
clientKey
clientSecret
onRequestStart
onRequestComplete
syncSuffix            default: 'sync'
url                   default: 'http://localhost:3333'
requestHandler
```

### sync (target, onSuccess, onError, onProgress)
