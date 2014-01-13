/**
 * A basic client for semantria endpoints
 */

"use strict";

var Q = require('q');
var https = require('https');
var url = require('url');
var EventEmitter = require('events').EventEmitter;
//var fs = require('fs');
var AuthRequest = require('./AuthRequest');

/**
 * Empty constructor
 * @private
 */
var __ = function() {
  EventEmitter.call(this);
};

/**
 * Creates an instance of SemantriaClient
 * @returns {__}
 */
__.create = function(key, secret) {
    //TODO return false when no key or consumerSecret or given? Throw error?
    var instance = new __();
    instance.consumerKey = key;
    instance.consumerSecret = secret;
    return instance;
};

__.prototype = Object.create(EventEmitter.prototype);

/**
 * Queues a document to Semantria for processing
 * https://semantria.com/developer/data-processing/queuing/queuing-document
 * @param content
 * @param id
 * @returns {promise}
 */
__.prototype.queueDocument = function(content, id) {
    var url = 'https://api30.semantria.com/document.json';
    var postData = {
        id : id,
        text : content
    };
    return this.execute('POST', url, postData);
};

/**
 * Returns a promise containing an array of all existing Semantria Configurations
 * https://semantria.com/developer/analysis-settings/categories
 * @returns {promise}
 */
__.prototype.retrieveConfigurations = function() {
  var url = 'https://api30.semantria.com/configurations.json';
  return this.execute('GET', url, null);
};

/**
 * Updates a specific Semantria configuration based on a config file. That config file must contain
 * the matching configId. Any listed elements are updated on the Semantria service.
 * https://semantria.com/developer/analysis-settings/categories
 * @param settings : A json object for the configuration settings
 * @returns {promise}
 */
__.prototype.updateConfiguration = function(settings) {
  var url = 'https://api30.semantria.com/configurations.json';
  //var settings =  JSON.parse(fs.readFileSync(__dirname + '/../config/' + settingsLoc).toString());
  return this.execute('POST', url, settings);
};

/**
 * Delete a specific Semantria configuration(s) when given an array of Semantria ConfigIds
 * https://semantria.com/developer/analysis-settings/categories
 * @param configIds
 * @returns {promise}
 */
__.prototype.deleteConfiguration= function(configIds) {
  var url = 'https://api30.semantria.com/configurations.json';
  return this.execute('DELETE', url, configIds)
};

/**
 * Queues a batch of documents to Semantria
 * https://semantria.com/developer/data-processing/queuing/queuing-batches-documents
 * @param docs - max size of 10, the Semantria default
 * @returns {promise}
 */
//TODO: Add in document size check?
__.prototype.queueDocumentBatch = function(docs) {
    if(docs.length > 10) {
        return Q.reject('batch too large');
    }
    var url = 'https://api30.semantria.com/document/batch.json';
    return this.execute('POST', url, docs);
};

/**
 * Queries semantria by ID for a single document's analysis results
 * https://semantria.com/developer/data-processing/requesting/requesting-documents
 * @param id
 * @returns {promise}
 */
__.prototype.retrieveDocument = function(id) {
    var url = 'https://api30.semantria.com/document/' + id + '.json';
    return this.execute('GET', url, null);
};

/**
 * Retrieves all currently active categories for this semantria account.
 * https://semantria.com/developer/analysis-settings/categories
 * @param id
 * @returns {promise}
 */
__.prototype.retrieveCategories = function(id) {
    var url = 'https://api30.semantria.com/categories.json';
    var postData = {
      config_id : id || ''
    };
    return this.execute('GET', url, postData);
};

/**
 * Generic method to hit the semantria end point
 * @param method - 'GET' or 'POST'
 * @param endpoint
 * @param postData
 * @returns {promise}
 */
__.prototype.execute = function(method, endpoint, postData) {
    var d = Q.defer();

    var self = this;
    var q = this.sign(method, endpoint);
    var options = url.parse(q.query);

    if(postData) {
        var writeData = JSON.stringify(postData);
        q.headers['Content-Length'] = encodeURI(writeData).split(/%..|./).length - 1;
        q.headers['Content-Type'] = 'application/json';
    }

    options['headers'] = q.headers;
    options.method = method || 'POST';

    var request = https.request(options, function(res) {
        var body = '';

        res.setEncoding('utf-8');

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            //202 == no data, 200 == processed data
            if (res.statusCode === 200 ) { //200 == Data returned because Semantria config set 'auto_response' to true
              d.resolve(body);
              self.emit('processed', body); //Emit the auto_response query results
            }  else if (res.statusCode === 202) { //202 == no data returned
                d.resolve(body);
            } else {
                d.reject(body);
            }
        });

    });

    request.on('error', function(err) {
        d.reject(err);
    });

    if(postData) {
        request.write(writeData, 'utf8');
    }

    request.end();

    return d.promise;
};

/**
 * Taken from the semantria sdk for signing requests
 * https://semantria.com/developer/building-signature-base-string
 * @param method
 * @param url
 * @returns {{query: *, headers: *}}
 */
__.prototype.sign = function(method, url) {
    var authWebRequest = AuthRequest.create(this.consumerKey,this.consumerSecret, 'JavaScript/3.0.70/json', null);
    var nonce = authWebRequest.generateNonce();
    var timestamp = authWebRequest.generateTimestamp();
    var query = authWebRequest.generateQuery(method, url, timestamp, nonce);
    var headers = authWebRequest.getRequestHeaders(method, nonce, timestamp, query);

    return {query : query, headers : headers};

};

module.exports = __;

if(require.main === module) {

}