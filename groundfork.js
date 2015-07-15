var $ = require('jquery');
var UrlPattern = require('url-pattern');

function extend() {
    for (var i = 1; i < arguments.length; i++) {
        for (var key in arguments[i]) {
            if (arguments[i].hasOwnProperty(key)) {
                arguments[0][key] = arguments[i][key];
            }
        }
    }
    return arguments[0];
}

var ApiResponse = {
    TYPE_SUCCESS: 'success',
    TYPE_ERROR: 'error'
};

function embedCollection(resource, collection) {
    var links = collection['_links'][resource],
        items = [];
    for (var i = 0; i < links.length; i++) {
        var item = this.getItem(links[i].href);
        if (item) {
            delete item['_embedded'];
            items.push(item);
        }
    }
    if (!collection.hasOwnProperty('_embedded')) 
        collection['_embedded'] = {};
    collection['_embedded'][resource] = items;
}

var defaultPatterns = {
    "POST/:resource": function(context, request) {
        var payload = request.payload,
            uri = getSelfHref(payload),
            linked = null;
        this.insertItem(uri, payload);
        if ((linked = getLink(payload, 'collection'))) {
            this.addToCollection(linked, uri, context.resource);
            this.updateCollectionWith(linked, embedCollection.bind(this, context.resource));
        } 
        this.addToCollection(context.resource, uri);
        return {
            "status" : ApiResponse.TYPE_SUCCESS,
            "data"   : payload
        };
    },
    "DELETE/:resource/:id": function(context) {
        var resource = context.resource,
            key = resource + '/' + context.id,
            item = this.getItem(key),
            linked = null;
        if (!item) {
            return { 
                "status"   : ApiResponse.TYPE_ERROR,
                "_error"   : "MISSING_KEY", 
                "resource" : key 
            };
        }
        this.removeItem(key);
        if ((linked = getLink(item, 'collection'))) {
            this.removeFromCollection(linked, key, context.resource);
            this.updateCollectionWith(linked, embedCollection.bind(this, context.resource));
        } 
        this.removeFromCollection(resource, key);
        return {
            "status"   : ApiResponse.TYPE_SUCCESS,
            "resource" : resource,
            "data"     : item
        };
    },
    "PATCH/:resource/:id": function(context, request) {
        var key = context.resource + '/' + context.id,
            item = this.getItem(key);
        if (!item) {
            return { 
                "status"   : ApiResponse.TYPE_ERROR,
                "_error"   : "MISSING_KEY", 
                "resource" : key 
            };
        }
        var restore = {};
        for (var attr in request.payload) {
            restore[attr] = item[attr];
            item[attr] = request.payload[attr];
        }
        this.insertItem(key, item);
        return {
            "status" : ApiResponse.TYPE_SUCCESS,
            "data"   : restore
        };
    },
    "PUT/:resource/:id": function(context, request) {
        var key = context.resource + '/' + context.id,
            item = this.getItem(key);
        if (!item) {
            return { 
                "status"   : ApiResponse.TYPE_ERROR,
                "_error"   : "MISSING_KEY", 
                "resource" : key 
            };
        }
        this.insertItem(key, request.payload);
        return {
            "status" : ApiResponse.TYPE_SUCCESS,
            "data"   : item
        };
    }
};

function setSelfHref(obj, uri) {
    if (!obj.hasOwnProperty('_links')) {
        obj['_links'] = {"self": null};
    }
    obj['_links']['self'] = {"href": uri};
}

function getLink(obj, resource) {
    if (!obj || !obj.hasOwnProperty('_links') || !obj['_links'].hasOwnProperty(resource))
        return null;
    return obj['_links'][resource].href;
}

function getSelfHref(obj) {
    return getLink(obj, 'self');
}

function Api(config) {

    this._onBatchJobStart    = null;
    this._onBatchJobComplete = null;
    this._storage            = null;
    this._busyStatus         = false;
    this._patternMap         = {};
    this._messageLog         = [];
    this._debugMode          = false;
    this._interval           = 15;

    if (config) {
        if (true === config.debugMode) {
            this._debugMode = true;
        }
        if ('object' === typeof config.patterns) {
            this._initPatterns(config.patterns);
        }
        if ('object' === typeof config.storage) {
            this._storage = config.storage;
        }
        if ('function' === typeof config.onBatchJobStart) {
            this._onBatchJobStart = config.onBatchJobStart;
        }
        if ('function' === typeof config.onBatchJobComplete) {
            this._onBatchJobComplete = config.onBatchJobComplete;
        }
        if ('number' === typeof config.interval) {
            this._interval = config.interval;
        }
    }

    this._initPatterns(defaultPatterns);
}

Api.prototype.pushToLog = function(orig) {
    var action = {},
        log = this._storage.getItem('_log') || [];
    for (var key in orig) 
        if ('data' != key && 'status' != key && 'command' != key)
            action[key] = orig[key];
    if (orig.command) {
        action.up = orig.command.up;
        action.down = orig.command.down;
        if (action.up.hasOwnProperty('payload') && action.up.payload.hasOwnProperty('_local'))
            delete action.up.payload._local;
    }
    action.index = log.length + 1;
    action.timestamp = Date.now() / 1000 | 0;
    log.push(action);
    this._storage.insertItem('_log', log);
};

Api.prototype._route = function(request, store) {
    if (!store) {
        store = this._storage;
    }
    for (var key in this._patternMap) {
        var route   = this._patternMap[key],
            context = route.pattern.match(request.method + '/' + request.resource);
        if (context) {
            if ('POST' == request.method && !getSelfHref(request.payload)) {
                setSelfHref(request.payload, store.firstAvailableKey(request.resource));
            }
            var response = route.method.call(store, context, request);
            if (response.status === ApiResponse.TYPE_ERROR) {
                if (true == this._debugMode) {
                    console.log(response);
                    console.log(response._error + ' (' + response.resource + ')');
                }
                response.request = request;
                return response;
            }
            switch (request.method) {
                case 'POST':
                    response.command = {
                        "up": {
                            "method"   : "POST",
                            "resource" : request.resource,
                            "payload"  : request.payload
                        },
                        "down": {
                            "method"   : "DELETE",
                            "resource" : getSelfHref(response.data)
                        }
                    };
                    return response;
                case 'DELETE':
                    response.command = {
                        "up": {
                            "method"   : "DELETE",
                            "resource" : request.resource
                        },
                        "down": {
                            "method"   : "POST",
                            "resource" : response.resource,
                            "payload"  : response.data
                        }
                    };
                    return response;
                case 'PATCH':
                case 'PUT':
                    response.command = {
                        "up": {
                            "method"   : request.method,
                            "resource" : request.resource,
                            "payload"  : request.payload
                        },
                        "down": {
                            "method"   : request.method,
                            "resource" : request.resource,
                            "payload"  : response.data
                        }
                    };
                    return response;
                default:
                    return {
                        "status"       : ApiResponse.TYPE_ERROR,
                        "_error"       : 'METHOD_NOT_SUPPORTED',
                        "description"  : 'Unsupported or invalid method: ' + request.method,
                        "request"      : request
                    };
            }
        }
    }
    return {
        "status"  : ApiResponse.TYPE_ERROR,
        "_error"  : 'NOT_FOUND',
        "request" : request
    };
};

Api.prototype._initPatterns = function(patterns) {
    for (var key in patterns) {
        var pattern = new UrlPattern(key);
        this._patternMap[key] = {
            pattern : pattern,
            method  : patterns[key]
        }
    }
};

Api.prototype.route = function(request) {
    if (true == this._busyStatus) {
        return { 
            "status"   : ApiResponse.TYPE_ERROR,
            "_error"   : "DEVICE_BUSY"
        };
    }
    return this._route(request);
};

function StorageProxy(storage) {
    this._storage = storage;
    var obj = {},
        keys = storage.keys();
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.indexOf('_') != 0) {
            obj[key] = this._storage.getItem(key);
        }
    }
    this._data = obj;
}

StorageProxy.prototype.deploy = function() {
    var keys = this._storage.keys();
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!this._data.hasOwnProperty(key) && key.indexOf('_') != 0) {
            this._storage.removeItem(key);
        }
    }
    for (var key in this._data) {
        this._storage.insertItem(key, this._data[key]);
    }
};

StorageProxy.prototype.updateCollectionWith = function(key, update) {
    var collection = this._data[key];
    if (!collection) {
        collection = {
            "_links": {
                "self": {"href": key}
            },
            "count": 0
        };
        collection['_links'][key] = [];
    }
    update(collection);
    this._data[key] = collection;
};

StorageProxy.prototype.insertItem = function(key, value) {
    this._data[key] = value;
};

StorageProxy.prototype.getItem = function(key) {
    return this._data[key];
};

StorageProxy.prototype.removeItem = function(key) {
    delete this._data[key];
};

StorageProxy.prototype.hasItem = function(key) {
    return this._data.hasOwnProperty(key);
};

StorageProxy.prototype.addToCollection = function(key, value, item) {
    var addToCollection = this._storage.addToCollection.bind(this); 
    return addToCollection(key, value, item);
};

StorageProxy.prototype.removeFromCollection = function(key, value, item) {
    var removeFromCollection = this._storage.removeFromCollection.bind(this);
    return removeFromCollection(key, value, item);
};

StorageProxy.prototype.firstAvailableKey = function(resource) {
    var i = 1;
    while (this.hasItem(resource + '/' + i))
        i++;
    return resource + '/' + i;
};

StorageProxy.prototype.getSelfHref = function(obj) {
    return this._storage.getSelfHref(obj);
};

Api.prototype.batchRun = function(batch, onComplete, onProgress) {
    if (true == this._busyStatus) {
        return false;
    }
    this._busyStatus = true;
    if (this._onBatchJobStart) {
        this._onBatchJobStart(); 
    }
    var messages = [],
        memstore = new StorageProxy(this._storage),
        len = batch.length;
    var processOne = function() {
        if ('function' === typeof onProgress) {
            onProgress(len-batch.length, len);
        }
        if (!batch.length) {
            memstore.deploy();
            this._busyStatus = false;
            if (this._onBatchJobComplete) {
                this._onBatchJobComplete(); 
            }
            if ('function' === typeof onComplete) {
                onComplete(messages); 
            }
            return;
        }
        if (true == this._debugMode)
            console.log('<' + batch.length + '>');
        var req = batch[0],
            response = this._route(req, memstore);
        if (true == this._debugMode)
            console.log(response);
        if (response.status === ApiResponse.TYPE_ERROR) {
            messages.push(response);
        }
        batch = batch.slice(1);
        setTimeout(processOne, this._interval);
    }.bind(this);
    setTimeout(processOne, 1);
    return true;
};

Api.prototype.command = function(request) {
    var response = this.route(request);
    if (response.status === ApiResponse.TYPE_SUCCESS) {
        this.pushToLog(response);
    }
    return response;
};

Api.prototype.isBusy = function() {
    return this._busyStatus;
};

Api.prototype.syncPoint = function() {
    return this._storage.getItem('_syncPoint') || 0;
};

Api.prototype.setSyncPoint = function(syncPoint) {
    this._storage.insertItem('_syncPoint', syncPoint);
};

Api.prototype.log = function() {
    return this._storage.getItem('_log') || [];
};

Api.prototype.takeLog = function(items) {
    var log = this.log();
    this._storage.insertItem('_log', log.slice(items));
    return log;
}

function parseWithDefault(data, _default) {
    try {
        return JSON.parse(data);
    } catch (e) {
        return _default;
    }
};

function BrowserStorage(config) {
    if (!config) {
        throw 'No configuration object provided.';
    }
    if ('string' === typeof config.namespace) {
        this.namespace = config.namespace;
    }
}

BrowserStorage.prototype.updateCollectionWith = function(key, update) {
    var _key = this.namespaced(key),
        cached = localStorage.getItem(_key),
        collection = {
            "_links": {
                "self": {"href": key}
            },
            "count": 0
        };
    collection['_links'][key] = [];
    if (cached) 
        collection = parseWithDefault(cached, collection);
    update(collection);
    localStorage.setItem(_key, JSON.stringify(collection));
};

BrowserStorage.prototype.embed = function(obj, link) {
    if ('object' === typeof obj && obj.hasOwnProperty('_links') && obj['_links'].hasOwnProperty(link)) {
        var target = obj['_links'][link];
        if (Array.isArray(target)) {
            embedCollection.call(this, link, obj);
        } else {
            var item = this.getItem(target.href);
            if (item) {
                if (!obj.hasOwnProperty('_embedded'))
                    obj['_embedded'] = {};
                obj['_embedded'][link] = item;
            }
        }
    }
};

BrowserStorage.prototype.namespaced = function(str) {
    return this.namespace ? this.namespace + '.' + str : str;
};

BrowserStorage.prototype.insertItem = function(key, value) {
    localStorage.setItem(this.namespaced(key), JSON.stringify(value));
};

BrowserStorage.prototype.getItem = function(key) {
    var cached = localStorage.getItem(this.namespaced(key));
    return parseWithDefault(cached, null);
};

BrowserStorage.prototype.removeItem = function(key) {
    localStorage.removeItem(this.namespaced(key));
};

BrowserStorage.prototype.hasItem = function(key) {
    return (null !== localStorage.getItem(this.namespaced(key)));
};

BrowserStorage.prototype.addToCollection = function(key, value, item) {
    this.updateCollectionWith(key, function(collection) {
        if (!item)
            item = key;
        if (!collection.hasOwnProperty('_links')) {
            collection['_links'] = {};
        }
        if (!collection['_links'].hasOwnProperty(item)) {
            collection['_links'][item] = [];
        }
        var items = collection['_links'][item];
        for (var i = 0; i < items.length; i++) {
            if (items[i].href === value) 
                return;
        }
        items.push({"href": value});
        collection['_links'][item] = items;
        if (collection.hasOwnProperty('count'))
            collection.count++;
    });
};

BrowserStorage.prototype.removeFromCollection = function(key, value, item) {
    this.updateCollectionWith(key, function(collection) {
        if (!item)
            item = key;
        if (!collection.hasOwnProperty('_links')) 
            return;
        var items = collection['_links'][item];
        if (!items)
            return;
        for (var i = 0; i < items.length; i++) {
            if (items[i].href === value) {
                items.splice(i, 1);
                collection['_links'][item] = items;
                if (collection.hasOwnProperty('count'))
                    collection.count--;
                return;
            }
        }
    });
};

BrowserStorage.prototype.firstAvailableKey = function(resource) {
    var i = 1;
    while (this.hasItem(resource + '/' + i))
        i++;
    return resource + '/' + i;
};

BrowserStorage.prototype.getSelfHref = function(obj) {
    return getSelfHref(obj);
};

BrowserStorage.prototype.keys = function() {
    var keys = [],
        len = this.namespace.length + 1;
    for (var key in localStorage) {
        if (0 == key.indexOf(this.namespace)) {
            keys.push(key.substr(len));
        }
    }
    return keys;
}

function decorate(obj, items) {
    if ('object' !== typeof obj)
        return;
    for (var key in obj) {
        if ('object' === typeof obj[key]) {
            decorate(obj[key], items);
        } else if ('string' === typeof obj[key] && ('href' == key || 'resource' == key)) {
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                obj[key] = obj[key].replace(item, '||' + item + '||');
            }
        }
    }
}

function defaultRequestHandler(data, onSuccess, onError) {
    $.support.cors = true;
    $.ajax({
        url: this._url + '/' + this._syncSuffix,
        type: 'POST',
        headers: {
            "Authorization": "Basic " + btoa(this._clientKey + ':' + this._clientSecret)
        },
        data: JSON.stringify(data),
        error: onError,
        success: onSuccess
    });
}

function BasicHttpEndpoint(config) {

    if (!config) {
        throw 'No configuration object provided.';
    }
    if ('object' === typeof config.api) {
        this._device = config.api;
    } else {
        throw 'Invalid or missing config attribute: api.';
    }
    if ('string' === typeof config.clientKey) {
        this._clientKey = config.clientKey;
    } else {
        throw 'Invalid or missing config attribute: clientKey.';
    }
    if ('string' === typeof config.clientSecret) {
        this._clientSecret = config.clientSecret;
    } else {
        throw 'Invalid or missing config attribute: clientSecret.';
    }
  
    this._url        = 'http://localhost:3333';
    this._syncSuffix = 'sync';

    if ('function' === typeof config.onRequestStart) {
        this._onRequestStart = config.onRequestStart;
    }
    if ('function' === typeof config.onRequestComplete) {
        this._onRequestComplete = config.onRequestComplete;
    }
    if ('string' === typeof config.syncSuffix) {
        this._syncSuffix = config.syncSuffix;
    }
    if ('string' === typeof config.url) {
        this._url = config.url.replace(/\/$/, '');
    }
    if ('function' === typeof config.requestHandler) {
        this._requestHandler = config.requestHandler;
    } else {
        this._requestHandler = defaultRequestHandler;
    }

}

BasicHttpEndpoint.prototype.sync = function(targets, onSuccess, onError, onProgress) {
    if (true == this._device.isBusy()) {
        return false;
    }
    var log = this._device.log(),
        size = log.length,
        items = [];
    var data = {
        targets: targets,
        syncPoint: this._device.syncPoint(),
        commit: [],
    };
    for (var i = 0; i < log.length; i++) {
        var obj = {
            up        : extend({}, log[i].up),
            down      : extend({}, log[i].down),
            index     : log[i].index,
            timestamp : log[i].timestamp
        };
        if ('POST' == obj.up.method)
            items.push(obj.up.payload['_links']['self']['href']);
        decorate(obj.up, items);
        decorate(obj.down, items);
        data.commit.push(obj);
    }
    if (this._onRequestStart) {
        this._onRequestStart(); 
    }
    var requestHandler = this._requestHandler.bind(this);
    requestHandler(data, 
        function(resp) {
            if (this._onRequestComplete) {
                this._onRequestComplete(); 
            }
            var script = resp.reverse.concat(resp.forward),
                log = this._device.takeLog(size);
            // Take down the local stack before running remote script
            for (var i = 0; i < log.length; i++) 
                script.unshift(log[i].down);
            for (var i = size; i < log.length; i++) 
                script.push(log[i].up);
            this._device.batchRun(script, function(messages) {
                if ('function' === typeof onSuccess) {
                    onSuccess(messages, resp);
                }
            }, onProgress);
            this._device.setSyncPoint(resp.syncPoint);
        }.bind(this), 
        function(e) {
            if ('function' === typeof onError) {
                onError(e);
            }
            if (this._onRequestComplete) {
                this._onRequestComplete(); 
            }
        }.bind(this)
    );
    return true;
}

module.exports = {
    Api               : Api,
    ApiResponse       : ApiResponse,
    BasicHttpEndpoint : BasicHttpEndpoint,
    BrowserStorage    : BrowserStorage
}; 
