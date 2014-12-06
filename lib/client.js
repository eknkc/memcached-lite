var EventEmitter = require('events').EventEmitter;
var Server = require("./server.js");
var util = require('util');
var consistent = require("consistent");
var conparse = require("connection-parse");

util.inherits(Client, EventEmitter);

var flags = {
  STRING: 0,
  BINARY: 1,
  NUMBER: 2,
  DATE: 3,
  BOOL: 4,
  JSON: 5
};

function Client(hosts, options) {
  if (!(this instanceof Client))
    return new Client(hosts, options);

  EventEmitter.call(this);

  options = options || {};

  this.hosts = conparse(hosts).servers;
  this.replacementHosts = conparse(options.replacementHosts || []).servers;

  this.serverOptions = {
    socketNoDelay        : options.socketNoDelay,
    socketKeepAlive      : options.socketKeepAlive,
    removeTimeout        : options.removeTimeout,
    retryDelay           : options.retryDelay,
    connectionsPerServer : options.connectionsPerServer,
    enableOfflineQueue   : options.enableOfflineQueue
  }

  this.ring = consistent();
  this._createServers();
}

Client.prototype.sendCommand = function(command, options, next) {
  if (typeof options == 'function') {
    next = options;
    options = {};
  }

  var skey = this.ring.get(command.key);
  var server = this.servers[skey];

  if (!server)
    return next(new Error("Unable to acquire any server connections."));

  if (typeof command.value != 'undefined') {
    command.extras = command.extras || {};

    if (Buffer.isBuffer(command.value)) {
      command.extras.flags = flags.BINARY;
    } else if (typeof command.value == 'number') {
      command.extras.flags = flags.NUMBER;
      command.value = command.value.toString();
    } else if (typeof command.value == 'boolean') {
      command.extras.flags = flags.BOOL;
      command.value = command.value ? "1" : "0";
    } else if (Object.prototype.toString.call(command.value) == "[object Date]") {
      command.extras.flags = flags.DATE;
      command.value = String(command.value.getTime());
    } else if (typeof command.value != 'string') {
      command.extras.flags = flags.JSON;
      command.value = JSON.stringify(command.value);
    }
  }

  server.sendCommand(command, function (err, data) {
    if (err) return next(err, data);

    if (data && data.value && !options.returnBuffer) {
      var flag = data.extras.flags || 0;

      if (flag == flags.STRING)
        data.value = data.value.toString();
      else if (flag == flags.NUMBER)
        data.value = Number(data.value.toString());
      else if (flag == flags.BOOL)
        data.value = data.value.toString() === "1";
      else if (flag == flags.DATE)
        data.value = new Date(Number(data.value.toString()));
      else if (flag == flags.JSON)
        data.value = JSON.parse(data.value.toString());
    }

    next(null, data);
  });
};

Client.prototype.touch = function(key, ttl, next) {
  this.sendCommand({
    opcode: "TOUCH",
    key: key,
    extras: {
      expiry: ttl
    }
  }, function (err, data) {
    if (err) return next(err);
    if (data.status.key == "KEY_NOT_FOUND") return next(null, undefined, { status: data.status.message });
    if (data.statuscode) return next(this._makeError(data.status));
    next(null, data.value, { cas: data.cas, status: data.status });
  }.bind(this));
};

Client.prototype.get = function(key, next) {
  this.sendCommand({
    opcode: "GET",
    key: key
  }, function (err, data) {
    if (err) return next(err);
    if (data.status.key == "KEY_NOT_FOUND") return next(null, undefined, { status: data.status.message });
    if (data.statuscode) return next(this._makeError(data.status));
    next(null, data.value, { cas: data.cas, status: data.status });
  }.bind(this));
};

Client.prototype.del = function(key, next) {
  this.sendCommand({
    opcode: "DELETE",
    key: key
  }, function (err, data) {
    if (err) return next(err);
    if (data.status.key == "KEY_NOT_FOUND") return next(null, undefined, { status: data.status.message });
    if (data.statuscode) return next(this._makeError(data.status));
    next(null, { cas: data.cas, status: data.status });
  }.bind(this));
};

['set', 'add', 'replace'].forEach(function (name) {
  Client.prototype[name] = function(key, value, ttl, next) {
    this.sendCommand({
      opcode: name.toUpperCase(),
      key: key,
      value: value,
      extras: {
        expiry: ttl
      }
    }, function (err, data) {
      if (err) return next(err);
      if (data.statuscode) return next(this._makeError(data.status));
      next(null, { cas: data.cas, status: data.status });
    }.bind(this));
  };
});

Client.prototype.cas = function(key, value, cas, ttl, next) {
  this.sendCommand({
    opcode: "SET",
    key: key,
    value: value,
    extras: {
      expiry: ttl
    },
    cas: cas
  }, function (err, data) {
    if (err) return next(err);
    if (data.statuscode) return next(this._makeError(data.status));
    next(null, { cas: data.cas, status: data.status });
  }.bind(this));
};

['append', 'prepend'].forEach(function (name) {
  Client.prototype[name] = function(key, value, next) {
    this.sendCommand({
      opcode: name.toUpperCase(),
      key: key,
      value: value
    }, function (err, data) {
      if (err) return next(err);
      if (data.statuscode) return next(this._makeError(data.status));
      next(null, { cas: data.cas, status: data.status });
    }.bind(this));
  };
});

['incr', 'decr'].forEach(function (name) {
  Client.prototype[name] = function(key, delta, ttl, initial, next) {
    if (typeof delta == 'function') {
      next = delta;
      delta = 1;
      ttl = 0xffffffff;
      initial = 0;
    } else if (typeof ttl == 'function') {
      next = ttl;
      ttl = 0xffffffff;
      initial = 0;
    } else if (typeof initial == 'function') {
      next = initial;
      initial = 0;
    }

    this.sendCommand({
      opcode: name == 'incr' ? "INCREMENT" : "DECREMENT",
      key: key,
      extras: {
        delta: delta,
        initial: initial,
        expiry: ttl
      }
    }, {
      returnBuffer: true
    }, function (err, data) {
      if (err) return next(err);
      if (data.statuscode) return next(this._makeError(data.status));
      var resp = (data.value.readUInt32BE(0) << 32) + data.value.readUInt32BE(4);
      next(null, String(resp), { cas: data.cas, status: data.status });
    }.bind(this));
  };
});

Client.prototype._makeError = function(status) {
  var err = new Error(status.message);
  err.code = status.code;
  err.key = status.key;
  return err;
}

Client.prototype._createServers = function() {
  this.servers = {};

  var addServer = function(host, replacementOf) {
    host.port = host.port || 11211;
    var server = this.servers[host.string] = new Server(host, this.serverOptions);

    server.on('remove', function () {
      delete this.servers[host.string];

      if (this.replacementHosts.length) {
        var nhost = this.replacementHosts.shift();
        addServer(nhost, host);
      } else {
        this.ring.remove(host.string);
      }
    }.bind(this));

    if (replacementOf)
      this.ring.replace({ key: replacementOf.string }, { key: host.string, weight: host.weight });
    else
      this.ring.add({ key: host.string, weight: host.weight });
  }.bind(this);

  this.hosts.forEach(function(host) {
    addServer(host);
  });
};

module.exports = Client;
