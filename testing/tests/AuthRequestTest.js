/**
 *  Tests for SemantriaClient.js
 */

"use strict";

var AuthRequest = require('../../lib/AuthRequest');
var crypto = require('crypto');
var MonkeyPatcher = require('capsela-util').MonkeyPatcher;

exports['create'] = {
  'Success, given application name' : function(test) {
    var ar = AuthRequest.create('','','test', false);
    test.ok(ar);
    test.equal(ar.applicationName, 'test/');
    test.done();
  },
  'Success, no application name' : function(test) {
    var ar = AuthRequest.create('','','', false);
    test.ok(ar);
    test.equal(ar.applicationName, '');
    test.done();
  },
  'Success, given compression flag' : function(test) {
    var ar = AuthRequest.create('','','', true);
    test.ok(ar);
    test.equal(ar.acceptEncoding, 'gzip, deflate');
    test.done();
  },
  'Success, no compression flag' : function(test) {
    var ar = AuthRequest.create('','','', false);
    test.ok(ar);
    test.equal(ar.acceptEncoding, 'identity');
    test.done();
  }
};

exports['getNormalizedParameters'] = {
  setUp: function(cb) {
    MonkeyPatcher.setUp();
    MonkeyPatcher.patch(Date, 'now', function() {
      return 42;
    });
    cb();
  },
  tearDown: function(cb) {
    MonkeyPatcher.tearDown(cb);
  },
  'Success' : function(test) {
    var ar = AuthRequest.create('','','', false);
    var expected = 'oauth_consumer_key=&oauth_nonce=1&oauth_signature_method=HMAC-SHA1&oauth_timestamp=42&oauth_version=1.0';
    var result = ar.getNormalizedParameters(Date.now(), '1');
    test.equal(result, expected);
    test.done();
  }
};

exports['generateQuery'] = {
  setUp: function(cb) {
    MonkeyPatcher.setUp(cb);
  },
  tearDown: function(cb) {
    MonkeyPatcher.tearDown(cb);
  },
  'Success, no url params' : function(test) {
    var ar = AuthRequest.create('','','', false);
    var url = "mockUrl";
    ar.getNormalizedParameters = function () {
      return 'mockParams';
    };
    var result = ar.generateQuery('', url, '', '');

    test.equal(result, 'mockUrl?mockParams');
    test.done();
  },
  'Success, with url params' : function(test) {
    var ar = AuthRequest.create('','','', false);
    var url = "mockUrl?=test";
    ar.getNormalizedParameters = function () {
      return 'mockParams';
    };
    var result = ar.generateQuery('', url, '', '');

    test.equal(result, 'mockUrl?=test&mockParams');
    test.done();
  }
};

exports['generateAuthHeader'] = {
  setUp: function(cb) {
    MonkeyPatcher.setUp(cb);
  },
  tearDown: function(cb) {
    MonkeyPatcher.tearDown(cb);
  },
  'Success' : function(test) {
    test.expect(3);
    var ar = AuthRequest.create('','','', false);
    var mockHash = {
      update: function() {
        return {
          digest: function() {
            return 'whaaaaa';
          }
        }
      }
    };

    MonkeyPatcher.patch(crypto, 'createHash', function() {
      test.ok(true);
      return mockHash;
    });

    MonkeyPatcher.patch(crypto, 'createHmac', function() {
      test.ok(true);
      return mockHash;
    });
    var expected = "OAuth,oauth_version=\"1.0\",oauth_signature_method=\"HMAC-SHA1\",oauth_nonce=\"\",oauth_consumer_key=\"\",oauth_timestamp=\"\",oauth_signature=\"whaaaaa\"";

    var result = ar.generateAuthHeader('','','');
    test.deepEqual(result, expected);
    test.done();
  }
};

exports['getRequestHeaders'] = {
  setUp: function(cb) {
    MonkeyPatcher.setUp(cb);
  },
  tearDown: function(cb) {
    MonkeyPatcher.tearDown(cb);
  },
  'Success' : function(test) {
    var ar = AuthRequest.create('','','', false);
    var expected = {
      Authorization: 'mockAuthHeader',
      'x-app-name': '',
      'Accept-Encoding': 'identity'
    };
    ar.generateAuthHeader = function () {
      return 'mockAuthHeader';
    };
    var result = ar.getRequestHeaders('','','','');
    test.deepEqual(result, expected);

    test.done();
  },
  'Success with POST' : function(test) {
    var ar = AuthRequest.create('','','', false);
    var expected = {
      Authorization: 'mockAuthHeader',
      'Content-type': 'application/x-www-form-urlencoded',
      'x-app-name': '',
      'Accept-Encoding': 'identity'
    };
    ar.generateAuthHeader = function () {
      return 'mockAuthHeader';
    };
    var result = ar.getRequestHeaders('POST','','','');
    test.deepEqual(result, expected);

    test.done();
  }
};