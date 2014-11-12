/**
 * A basic client for semantria endpoints
 */

"use strict";

var Q = require('q');
var https = require('https');
var url = require('url');
var EventEmitter = require('events').EventEmitter;
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
 * Returns an configurations.json file
 * If no parameters are passed, return all configurations
 * NOTE: This returns a valid object, not a String
 * @returns {promise}
 */
__.prototype.retrieveAllConfigurations = function() {
  var url = 'https://api30.semantria.com/configurations.json';
  return this.execute('GET', url, null).then(
    function (configs) {
      configs = JSON.parse(configs);
      return Q.resolve(configs);
    }
  );
};

/**
 * Returns an array of all Configurations whose chosen parameter match a selected value.
 * If no parameters are passed, return all configurations
 * NOTE: This returns a valid object, not a String, like other methods. I'm open to discussion as to
 * whether or not this should be changed to fall in line with other methods, or they should all return
 * objects
 * @param parameter The name of the parameter you wish to match against
 * @param value
 * @returns {promise}
 */
__.prototype.retrieveConfigurations = function(parameter, value) {
  //TODO: Should I add in specific handling for empty string parameters?
  if( (parameter && value) || !(parameter || value) ){ //As long as we have both args or none
    var url = 'https://api30.semantria.com/configurations.json';
    return this.execute('GET', url, null).then(
      function (configs) {
        var result = [];
        configs = JSON.parse(configs);
        configs.forEach( function (config) {
          if (config[parameter] == value) {
            result.push(config);
          }
        });
        return Q.resolve(result);
      }
    );
  }
  else {
    return Q.reject('Must include both parameter & value, or neither');
  }
};

/**
 * Updates specific Semantria configurations based on a settings parameter. If the config objects do not contain
 * a config_id field, a new config will be created. Any listed elements are updated on the Semantria
 * service.
 * https://semantria.com/developer/analysis-settings/categories
 * @param settings An array of json objects for the configuration settings
 * @returns {promise}
 */
__.prototype.updateConfiguration = function(settings) {
  var url = 'https://api30.semantria.com/configurations.json';
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
 * Queues a document to Semantria for processing
 * https://semantria.com/developer/data-processing/queuing/queuing-document
 * @param content
 * @param id
 * @param configId
 * @returns {promise}
 */
__.prototype.queueDocument = function(content, id, configId) {
  var url = 'https://api30.semantria.com/document.json';
  if (configId) {
    url += "?config_id=" + configId;
  }
  var postData = {
    id : id,
    text : content
  };
  return this.execute('POST', url, postData);
};

/**
 * Queues a batch of documents to Semantria
 * https://semantria.com/developer/data-processing/queuing/queuing-batches-documents
 * @param docs - max size of 10, the Semantria default
 * @param configId
 * @returns {promise}
 */
//TODO: Add in document size check?
__.prototype.queueDocumentBatch = function(docs, configId) {
    if(docs.length > 10) {
        return Q.reject('batch too large');
    }
    var url = 'https://api30.semantria.com/document/batch.json';
    if (configId) {
      url += "?config_id=" + configId;
    }
    return this.execute('POST', url, docs);
};

/**
 * Queries semantria by ID for a single document's analysis results
 * https://semantria.com/developer/data-processing/requesting/requesting-documents
 * @param docId
 * @param configId
 * @returns {promise}
 */
__.prototype.requestDocument = function(docId, configId) {
    var url = 'https://api30.semantria.com/document/' + docId + '.json';
    if (configId) {
      url += "?config_id=" + configId;
    }
    return this.execute('GET', url, null);
};

/**
 * Queries Semantria for a batch of processed documents, up to 100 at a time by default
 * @param configId
 * @returns {promise}
 */
__.prototype.retrieveDocumentBatch = function(configId) {
  var url = 'https://api30.semantria.com/document/processed.json';
  if (configId) {
    url += "?config_id=" + configId;
  }
  return this.execute('GET', url, null);
};

/**
 * Retrieves all currently active categories for this semantria account.
 * https://semantria.com/developer/analysis-settings/categories
 * @param configId
 * @returns {promise}
 */
__.prototype.retrieveCategories = function(configId) {
    var url = 'https://api30.semantria.com/categories.json';
    if (configId) {
      url += "?config_id=" + configId;
    }
    return this.execute('GET', url, null);
};

/**
 * Update categories on Semantria for a specific config. Any categories with new, unique names will be
 * added as new categories to the specified config
 * https://semantria.com/developer/analysis-settings/categories
 * @param categories
 * @param configId
 * @returns {promise}
 */
__.prototype.updateCategories = function(categories, configId) {
    var url = 'https://api30.semantria.com/categories.json';
    if (configId) {
      url += "?config_id=" + configId;
    }

    return this.execute('POST', url, categories);
};

/**
 * Delete categories on Semantria for a specific config
 * Note that you only need to pass in an array of category names for this method
 * https://semantria.com/developer/analysis-settings/categories
 * @param categories - An array of category names
 * @param configId - The specific config to delete categories from
 * @returns {promise}
 */
__.prototype.deleteCategories = function(categories, configId) {
    var url = 'https://api30.semantria.com/categories.json';
    if (configId) {
      url += "?config_id=" + configId;
    }

    return this.execute('DELETE', url, categories);
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