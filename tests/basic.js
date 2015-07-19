"use strict";

var Test         = require('./init.js');
var LocalStorage = require('node-localstorage').LocalStorage;

var localStorage = new LocalStorage('./scratch');

var api          = Test.api;
var store        = Test.store;
var endpoint     = Test.endpoint;

// ==================================================================================

var ts = Date.now(),
    response;

response = api.post('posts', {
    'title'   : 'The first post',
    'body'    : 'In omnium maluisset eum, per putent singulis tincidunt id. Ea mea invidunt posidonium efficiantur, sit tota eius labores ea.',
    'created' : ts
});

var firstPostId = response.id;

Test.assert(
    '1.1', 
    'success' === response.status, 
    'Expected response status "success", instead got "' + response.status + '"'
);

// Inspect command

Test.assert(
    '1.2', 
    'DELETE' === response.command.down.method, 
    'Expected "DELETE" as response.command.down.method, instead got "' + response.command.down.method + '"'
);

Test.assert(
    '1.3', 
    firstPostId === response.command.down.resource, 
    'Expected id to be "' + firstPostId + '", instead got "' + response.command.down.resource + '"'
);

// ==================================================================================

response = api.post('comments', {
    'body'    : 'Great story, dude!',
    'created' : ts,
    '_links'  : {
        '_collection' : { 'href': firstPostId }
    }
});

Test.assert(
    '2.1', 
    'success' === response.status, 
    'Expected response status "success", instead got "' + response.status + '"'
);

//

/* ---------- Offline operations ---------- */

/* POST */

/* PUT */

/* PATCH */

/* DELETE */

/* _collection */

/* _parent */

/* ---------- Syncing ---------- */

/* ... */

