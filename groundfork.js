"use strict";
var $          = require('jquery');
var UrlPattern = require('url-pattern');
var request    = require('request');
var LZString   = require('lz-string');

var _localStorage;

if (typeof localStorage === 'undefined' || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    _localStorage = new LocalStorage('./scratch');
} else {
    _localStorage = localStorage;
}

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
    TYPE_SUCCESS : 'success',
    TYPE_ERROR   : 'error'
};

function embedCollection(resource, collection) {
    var links = collection['_links'][resource],
        items = [];
    for (var i = 0; i < links.length; i++) {
        var item = this.getItem(links[i].href);
        if (item) {
            var _item = {};
            for (var key in item) {
                if ('_embedded' !== key) 
                    _item[key] = item[key];
            }
            items.push(_item);
        }
    }
    if (!collection.hasOwnProperty('_embedded')) 
        collection['_embedded'] = {};
    collection['_embedded'][resource] = items;
}

function addToParent(linked, uri, resource) {
    this.updateCollectionWith(linked, function(collection) {
        if (!collection.hasOwnProperty('_links')) 
            collection['_links'] = {};
        collection['_links'][resource] = {
            'href': uri
        };
        var item = this.getItem(uri);
        if (item) {
            if (!collection.hasOwnProperty('_embedded')) 
                collection['_embedded'] = {};
            var _item = {};
            for (var key in item) {
                if ('_embedded' !== key) 
                    _item[key] = item[key];
            }
            collection['_embedded'][resource] = _item;
        }
    }.bind(this));
}

function removeFromParent(linked, resource) {
    this.updateCollectionWith(linked, function(collection) {
        if (collection.hasOwnProperty('_links')) {
            delete collection['_links'][resource];
        }
        if (collection.hasOwnProperty('_embedded')) {
            delete collection['_embedded'][resource];
        }
    });
}

var defaultPatterns = {
    "POST/:resource": function(context, request) {
        var payload = request.payload,
            uri = getSelfHref(payload),
            linked = null;
        this.insertItem(uri, payload);
        if ((linked = getLink(payload, '_collection'))) {
            this.addToCollection(linked, uri, context.resource);
            this.updateCollectionWith(linked, embedCollection.bind(this, context.resource));
        } 
        if ((linked = getLink(payload, '_parent'))) {
            addToParent.call(this, linked, uri, context.resource);
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
        if ((linked = getLink(item, '_collection'))) {
            this.removeFromCollection(linked, key, context.resource);
            this.updateCollectionWith(linked, embedCollection.bind(this, context.resource));
        } 
        if ((linked = getLink(item, '_parent'))) {
            removeFromParent.call(this, linked, context.resource);
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
        var restore = {},
            selfHref = getSelfHref(item);
        for (var attr in request.payload) {
            restore[attr] = item[attr];
            item[attr] = request.payload[attr];
        }
        if (!item.hasOwnProperty('_links')) 
            item['_links'] = {};
        if (selfHref)
            item['_links']['self'] = { "href": selfHref };
        this.insertItem(key, item);
        var oldLinked = getLink(restore, '_collection');
        var newLinked = getLink(item, '_collection');
        if (oldLinked !== newLinked) {
            if (oldLinked) {
                this.removeFromCollection(oldLinked, key, context.resource);
                this.updateCollectionWith(oldLinked, embedCollection.bind(this, context.resource));
            }
            if (newLinked) {
                this.addToCollection(newLinked, key, context.resource);
                this.updateCollectionWith(newLinked, embedCollection.bind(this, context.resource));
            }
        }
        oldLinked = getLink(restore, '_parent');
        newLinked = getLink(item, '_parent');
        if (oldLinked !== newLinked) {
            if (oldLinked) 
                removeFromParent.call(this, oldLinked, context.resource);
            if (newLinked) 
                addToParent.call(this, newLinked, key, context.resource);
        }
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
        if (!request.payload.hasOwnProperty('_links')) 
            request.payload['_links'] = {};
        request.payload['_links']['self'] = { "href": getSelfHref(item) };
        this.insertItem(key, request.payload);
        var oldLinked = getLink(item, '_collection');
        var newLinked = getLink(request.payload, '_collection');
        if (oldLinked !== newLinked) {
            if (oldLinked) {
                this.removeFromCollection(oldLinked, key, context.resource);
                this.updateCollectionWith(oldLinked, embedCollection.bind(this, context.resource));
            }
            if (newLinked) {
                this.addToCollection(newLinked, key, context.resource);
                this.updateCollectionWith(newLinked, embedCollection.bind(this, context.resource));
            }
        }
        oldLinked = getLink(item, '_parent');
        newLinked = getLink(request.payload, '_parent');
        if (oldLinked !== newLinked) {
            if (oldLinked) 
                removeFromParent.call(this, oldLinked, context.resource);
            if (newLinked) 
                addToParent.call(this, newLinked, key, context.resource);
        }
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
    this._useProxy           = true;

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
        if ('boolean' === typeof config.useProxy) {
            this._useProxy = config.useProxy;
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
            if (!response)
                continue;
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
        if (!this._data.hasOwnProperty(key) && key.indexOf('_') !== 0) {
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
    if (true === this._debugMode) {
        console.log(JSON.stringify(batch, null, 3));
    }
    var messages = [];
    var memstore = (true === this._useProxy 
            && typeof localStorage !== 'undefined' 
            && localStorage !== null) ? new StorageProxy(this._storage) : null;
            // Only use storage proxy in browser environments
    var len = batch.length;
    var processOne = function() {
        if ('function' === typeof onProgress) {
            onProgress(len-batch.length, len);
        }
        if (!batch.length) {
            if (memstore)
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
            response = this._route(req, memstore ? memstore : this._storage);
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

Api.prototype.post = function(resource, payload, options) {
    if (options && payload) {
        if (!payload.hasOwnProperty('_links')) 
            payload['_links'] = {};
        if (options.hasOwnProperty('collection')) {
            payload['_links']['_collection'] = { 'href': options['collection'] };
        }
        if (options.hasOwnProperty('parent')) {
             payload['_links']['_parent'] = { 'href': options['parent'] };
        }
    }
    var response = this.command({
        "method"   : 'POST',
        "resource" : resource,
        "payload"  : payload
    });
    if (response.status === ApiResponse.TYPE_SUCCESS) {
        response.id = getSelfHref(response.data);
    }
    return response;
};

Api.prototype.delete = function(resource) {
    return this.command({
        "method"   : 'DELETE',
        "resource" : resource
    });
};

Api.prototype.patch = function(resource, payload) {
    return this.command({
        "method"   : 'PATCH',
        "resource" : resource,
        "payload"  : payload
    });
};

Api.prototype.put = function(resource, payload, options) {
    if (options && payload) {
        if (!payload.hasOwnProperty('_links')) 
            payload['_links'] = {};
        if (options.hasOwnProperty('collection')) {
            payload['_links']['_collection'] = { 'href': options['collection'] };
        }
        if (options.hasOwnProperty('parent')) {
             payload['_links']['_parent'] = { 'href': options['parent'] };
        }
    }
    return this.command({
        "method"   : 'PUT',
        "resource" : resource,
        "payload"  : payload
    });
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

    this._useCompression = true;

    if ('string' === typeof config.namespace) {
        this.namespace = config.namespace;
    }
    if ('boolean' === typeof config.useCompression) {
        this._useCompression = config.useCompression;
    }
}

BrowserStorage.prototype.updateCollectionWith = function(key, update) {
    var _key = this.namespaced(key),
        cached = _localStorage.getItem(_key),
        collection = {
            "_links": {
                "self": {"href": key}
            },
            "count": 0
        };
    collection['_links'][key] = [];
    if (cached) {
        collection = parseWithDefault(true === this._useCompression ?  LZString.decompress(cached) : cached, collection);
    }
    update(collection);
    var value = JSON.stringify(collection);
    _localStorage.setItem(_key, true === this._useCompression ? LZString.compress(value) : value);
};

BrowserStorage.prototype.embed = function(obj, link) {
    if (obj && 'object' === typeof obj && obj.hasOwnProperty('_links') && obj['_links'].hasOwnProperty(link)) {
        var target = obj['_links'][link];
        if (Array.isArray(target)) {
            embedCollection.call(this, link, obj);
        } else {
            var item = this.getItem(target.href);
            if (!obj.hasOwnProperty('_embedded')) {
                obj['_embedded'] = {};
            }
            if (item) {
                var _item = {};
                for (var key in item) {
                    if ('_embedded' !== key) 
                        _item[key] = item[key];
                }
                obj['_embedded'][link] = _item;
            }
        }
    }
};

BrowserStorage.prototype.namespaced = function(str) {
    return this.namespace ? this.namespace + '.' + str : str;
};

BrowserStorage.prototype.insertItem = function(key, value) {
    var str = JSON.stringify(value);
    _localStorage.setItem(this.namespaced(key), true === this._useCompression ? LZString.compress(str) : str);
};

BrowserStorage.prototype.getItem = function(key) {
    var cached = _localStorage.getItem(this.namespaced(key));
    return parseWithDefault(true === this._useCompression ?  LZString.decompress(cached) : cached, null);
};

BrowserStorage.prototype.removeItem = function(key) {
    _localStorage.removeItem(this.namespaced(key));
};

BrowserStorage.prototype.hasItem = function(key) {
    return (null !== _localStorage.getItem(this.namespaced(key)));
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
    if (typeof localStorage === 'undefined' || localStorage === null) {
        var storageKeys = _localStorage.keys;
        for (var i = 0; i < storageKeys.length; i++) {
            var key = storageKeys[i];
            if (0 == key.indexOf(this.namespace)) {
                keys.push(key.substr(len));
            }
        }
    } else {
        for (var key in _localStorage) {
            if (0 == key.indexOf(this.namespace)) {
                keys.push(key.substr(len));
            }
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
                var item  = items[i],
                    regex = new RegExp(item + '(/.*)?$');
                obj[key] = obj[key].replace(regex, '||' + item + '||$1');
            }
        }
    }
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
        this._requestHandler = BasicHttpEndpoint.ajaxRequestHandler;
    }

}

BasicHttpEndpoint.prototype.sync = function(targets, onSuccess, onError, onProgress, debugScript) {
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
            items.push(getSelfHref(obj.up.payload));
        decorate(obj.up, items);
        decorate(obj.down, items);
        data.commit.push(obj);
    }
    if (this._onRequestStart) {
        this._onRequestStart(); 
    }
    var requestHandler = this._requestHandler.bind(this);
    var _request = {
        url     : this._url + '/' + this._syncSuffix,
        type    : 'POST',
        data    : data
    };
    requestHandler(_request, 
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
            if ('function' === typeof debugScript) {
                debugScript(script);
            }
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

BasicHttpEndpoint.prototype.syncPoint = function(onSuccess, onError) {
    if (true == this._device.isBusy()) {
        return false;
    }
    if (this._onRequestStart) {
        this._onRequestStart(); 
    }
    var requestHandler = this._requestHandler.bind(this);
    var _request = {
        url     : this._url + '/sp',
        type    : 'GET',
        headers : {
            "Authorization": "Basic " + btoa(this._clientKey + ':' + this._clientSecret)
        }
    };
    requestHandler(_request, 
        function(resp) {
            if (this._onRequestComplete) {
                this._onRequestComplete(); 
            }
            onSuccess(resp.body)
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
}

BasicHttpEndpoint.ajaxRequestHandler = function(request, onSuccess, onError) {
    $.support.cors = true;
    var ajax = {
        url     : request.url,
        type    : request.type,
        headers : {
            "Authorization": "Basic " + btoa(this._clientKey + ':' + this._clientSecret)
        },
        error   : onError,
        success : onSuccess
    };
    if (request.data) {
        ajax.data = JSON.stringify(request.data);
    }
    $.ajax(ajax);
}

BasicHttpEndpoint.nodeRequestHandler = function(_request, onSuccess, onError) {
    var obj = {
        url    : _request.url,
        method : _request.type,
        json   : true
    };
    if (_request.data) {
        obj.body = _request.data;
    }
    request(obj, function(err, httpResponse, resp) {
        if (err) {
            onError(err);
        } else {
            if (('' + httpResponse.statusCode).match(/^2\d\d$/)) {
                onSuccess(resp);
            } else {
                onError(httpResponse);
            }
        }
    }.bind(this)).auth(this._clientKey, this._clientSecret, true);
}

module.exports = {
    Api               : Api,
    ApiResponse       : ApiResponse,
    BasicHttpEndpoint : BasicHttpEndpoint,
    BrowserStorage    : BrowserStorage
}; 
