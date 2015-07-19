"use strict";

var GroundFork = require('../groundfork');

var store = new GroundFork.BrowserStorage({
    namespace : 'sphere.installer'
});

var api = new GroundFork.Api({
    storage            : store,
    debugMode          : false,
    onBatchJobStart    : function() { console.log('Batch job start.'); },
    onBatchJobComplete : function() { console.log('Batch job complete.'); }
});

var config = {
    url                : 'http://localhost:3333/',
    key                : 'root',
    secret             : 'root'
};

var endpoint = new GroundFork.BasicHttpEndpoint({
    api                : api,
    url                : config.url,
    clientKey          : config.key,
    clientSecret       : config.secret,
    requestHandler     : GroundFork.BasicHttpEndpoint.nodeRequestHandler,
    onRequestStart     : function() { console.log('Request start.'); },
    onRequestComplete  : function() { console.log('Request complete.'); }
});

function assert(label, predicate, message) {
    if (true !== predicate) {
        console.log('Test ' + label + ' failed: ' + message);
    } else {
        console.log('Test ' + label + ' passed.');
    }
}

module.exports = {
    store    : store,
    api      : api,
    endpoint : endpoint,
    assert   : assert
};
