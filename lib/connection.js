var EventEmitter = require('events').EventEmitter;
var util = require('util');
var net = require("net");
var protocol = require("memcached-protocol");

util.inherits(Connection, EventEmitter);

function Connection(host, options) {
  if (!(this instanceof Connection))
    return new Connection(host, options);

  EventEmitter.call(this);

  this.host            = host;
  this.retryDelay      = options.retryDelay | 2000;
  this.socketNoDelay   = typeof options.socketNoDelay == 'undefined' ? true : !!options.socketNoDelay;
  this.socketKeepAlive = typeof options.socketKeepAlive == 'undefined' ? true : !!options.socketKeepAlive;
  this.seq             = 0;

  this.stream = net.createConnection(this.host.port, this.host.host);

  if (this.socketNoDelay)
    this.stream.setNoDelay(true);

  this.stream.setKeepAlive(this.socketKeepAlive);
  this.stream.setTimeout(0);

  this.reader = new protocol.Reader();
  this.writer = new protocol.Writer();

  this.handlers = {};

  this._attachEvents();
}

Connection.prototype.write = function(pack, handler) {
  pack.opaque = this._seq();
  this.handlers[pack.opaque] = handler;
  this.stream.write(this.writer.write(pack));
};

Connection.prototype._attachEvents = function() {
  var self = this;

  self.stream.on('connect', function () {
    self.connected = true;
    self.emit('connect');
    self.reader.reset();
  });

  self.stream.on('close', self._connectionLost.bind(self, 'close'));
  self.stream.on('end', self._connectionLost.bind(self, 'end'));
  self.stream.on('error', function (msg) {
    self.emit('error', new Error("memcached-lite connection to " + self.host.string + " failed: " + msg));
    self._connectionLost('error');
  })

  self.stream.on('data', function (data) {
    self.reader.read(data).forEach(function (data) {
      var handler = self.handlers[data.opaque];

      if (handler) {
        delete self.handlers[data.opaque];
        handler(null, data);
      } else
        self.emit('error', 'Unexpected packet received from server.');
    });
  });
};

Connection.prototype._connectionLost = function(reason) {
  if (this.ended || this.reconnecting)
    return;

  this.connected = false;
  this.reconnecting = true;

  Object.keys(this.handlers).forEach(function (hkey) {
    this.handlers[hkey](new Error("Server connection lost to " + this.host.string));
  }.bind(this));

  this.handlers = {};
  this.emit('reconnect');

  this._retryTimer = setTimeout(function() {
    this.reconnecting = false;
    this.stream.connect(this.host.port, this.host.host);
  }.bind(this), this.retryDelay);
};

Connection.prototype._seq = function() {
  if (this.seq > 2000000000)
    this.seq = 0;

  return this.seq++;
};

Connection.prototype.end = function() {
  if (this.ended)
    return;

  this.stream.end();
  this.ended = true;
  this.connected = false;
  this.emit('end');

  clearTimeout(this._retryTimer);
};

module.exports = Connection;
