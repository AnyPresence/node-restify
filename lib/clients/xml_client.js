var util = require('util');
var assert = require('assert-plus');
var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var xpath = require('xpath');
var codeToHttpError = require('../errors/http_error').codeToHttpError;
var RestError = require('../errors').RestError;
var StringClient = require('./string_client');

function XmlClient(options) {
    assert.object(options, 'options');

    options.accept = 'application/xml';
    options.name = options.name || 'XmlClient';
    options.contentType = 'application/xml';

    StringClient.call(this, options);

    this._super = StringClient.prototype;
}

util.inherits(XmlClient, StringClient);

XmlClient.prototype.write = function write(options, body, callback) {
    if (typeof body === 'undefined' || body === null || body === "" || body === {}) {
      body = "";
    } else if (body.constructor !== String) {
      body = new XMLSerializer().serializeToString(body);
    }
    return (this._super.write.call(this, options, body, callback));
};


XmlClient.prototype.parse = function parse(req, callback) {
    var log = this.log;

    function parseResponse(err, req2, res, data) {
        var doc;
        var errors = "";
        
        if (data == '') {
          doc = null;
        } else {  
          doc = new DOMParser({
            errorHandler: function(level, msg) {
              if (level === 'fatal') {
                errors += "fatal: " + msg + "; ";
              } else if (level === 'error') {
                errors += "error: " + msg + "; ";
              } 
            }
          }).parseFromString(data);
        
          if (!errors && res && res.statusCode >= 400) {
            var c = xpath.select("/*/code/text()", doc) || xpath.select("/*/error/code/text()", doc) || '';
            var m = xpath.select("/*/message/text()", doc) || xpath.select("/*/error/message/text()", doc) || '';

            if (c) {
              err = new RestError({
                message: m,
                restCode: c,
                statusCode: res.statusCode
              });
              err.name = err.restCode;
              if (!/Error$/.test(err.name)) {
                err.name += 'Error';
              }
            } else if (!err) {
              err = codeToHttpError(res.statusCode, result.message || '', data);
            }
          }
        }
        
        if (err) {
          err.body = doc;
        }
          
        callback(err || errors || null, req2, res, doc);
    }

    return (this._super.parse.call(this, req, parseResponse));
};

module.exports = XmlClient;