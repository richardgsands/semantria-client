/**
 * AuthRequest class for handling the logic behind Semantria authentication
 */

"use strict";

var crypto = require('crypto');

/**
 * Empty constructor
 * @private
 */
var __ = function() {

};

/**
 * Factory method for creating an AuthRequest object.
 * @param consumerKey
 * @param consumerSecret
 * @param applicationName
 * @param useCompression
 * @returns {__}
 */
__.create = function(consumerKey, consumerSecret, applicationName, useCompression) {
  var instance = new __();
  instance.oAuthVersion = "1.0";
  //this.oAuthParameterPrefix = "oauth_";
  instance.oAuthConsumerKeyKey = "oauth_consumer_key";
  instance.oAuthVersionKey = "oauth_version";
  instance.oAuthSignatureMethodKey = "oauth_signature_method";
  instance.oAuthSignatureKey = "oauth_signature";
  instance.oAuthTimestampKey = "oauth_timestamp";
  instance.oAuthNonceKey = "oauth_nonce";
  instance.applicationName = applicationName ? applicationName + '/' : '';
  instance.acceptEncoding = useCompression ? 'gzip, deflate' : 'identity';
  instance.consumerKey = consumerKey;
  instance.consumerSecret = consumerSecret;

  return instance;
};

/**
 * A nonce is a one-time-use number in cryptography
 * @returns {number}
 */
__.prototype.generateNonce = function () {
  return Math.floor(Math.random() * 9999999);
};

__.prototype.generateTimestamp = function() {
  return Date.now();
};

__.prototype.getNormalizedParameters = function(timestamp, nonce) {
  var items = {};
  items[this.oAuthConsumerKeyKey] = this.consumerKey;
  items[this.oAuthNonceKey] = nonce;
  items[this.oAuthSignatureMethodKey] = "HMAC-SHA1";
  items[this.oAuthTimestampKey] = timestamp;
  items[this.oAuthVersionKey] = this.oAuthVersion;

  var parameters = [];
  for (var key in items) {
    if(items.hasOwnProperty(key)) {
     parameters.push(key + "=" + items[key]);
    }
  }
  return parameters.join('&');
};

__.prototype.generateQuery = function(method, url, timestamp, nonce) {
  var normalizedParameters = this.getNormalizedParameters(timestamp, nonce);

  if (url.indexOf("?") != -1) {
    url += '&';
  } else {
    url += '?';
  }

  return url + normalizedParameters;
};

/**
 * Build the authorization header
 * https://semantria.com/developer/api-overview/authentication/authorization-header
 * @param query
 * @param timestamp
 * @param nonce
 * @returns {string}
 */
__.prototype.generateAuthHeader = function(query, timestamp, nonce) {
  var escape_query = encodeURIComponent(query);
  var md5cs = crypto.createHash('md5').update(this.consumerSecret).digest('hex');
  var hash = encodeURIComponent(crypto.createHmac('sha1', md5cs).update(escape_query).digest('base64'));

  var items = {};
  items["OAuth"] = "";
  items[this.oAuthVersionKey] = '"' + this.oAuthVersion + '"';
  items[this.oAuthSignatureMethodKey] = '"HMAC-SHA1"';
  items[this.oAuthNonceKey] = "\"" + nonce + "\"";
  items[this.oAuthConsumerKeyKey] = "\"" + this.consumerKey + "\"";
  items[this.oAuthTimestampKey] = "\"" + timestamp + "\"";
  items[this.oAuthSignatureKey] = "\"" + hash + "\"";

  var parameters = [];
  for (var key in items) {
    if(items.hasOwnProperty(key)){
      if (items[key] != '') {
        parameters.push(key + "=" + items[key]);
      } else {
        parameters.push(key);
      }
    }
  }

  return parameters.join(',');
};

__.prototype.getRequestHeaders = function(method, nonce, timestamp, query) {
  var headers = {};
  headers["Authorization"] = this.generateAuthHeader(query, timestamp, nonce);

  if (method == "POST") {
    headers["Content-type"] = "application/x-www-form-urlencoded";
  }

  headers["x-app-name"] = this.applicationName;
  headers["Accept-Encoding"] = this.acceptEncoding;

  return headers;
};

module.exports = __;