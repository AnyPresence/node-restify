var util = require('util');
var assert = require('assert-plus');
var xml2js = require('xml2js');
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
    assert.ok(body !== undefined, 'body');
    assert.object(body, 'body');

    var builder = new xml2js.Builder();
    body = (typeof body === 'undefined' || body === null) ? "" : builder.buildObject(body);
    return (this._super.write.call(this, options, body, callback));
};


XmlClient.prototype.parse = function parse(req, callback) {
    var log = this.log;

    function parseResponse(err, req2, res, data) {
        
        var parser = new xml2js.Parser();
        
        parser.addListener('end', function(result) {
          if (res && res.statusCode >= 400) {
            if (result.code || (result.error && result.error.code)) {
              var c = result.code || (result.error ? result.error.code : '') || '';
              var m = result.message || (result.error ? result.error.message : '') || '';

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
          
          if (err) {
            err.body = result;
          }
          
          callback(err, req2, res, result);
        });
          
        parser.addListener('error', function(error) {
          callback(error || "Unable to parse response", req2, res, null);
        });
          
        try {
          parser.parseString(data);
        } catch(e) {
          // ignore -- error was already handled by listener function for error events
        }
        
    }

    return (this._super.parse.call(this, req, parseResponse));
};

module.exports = XmlClient;