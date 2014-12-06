# memcached-lite

`memcached-lite` is a lightweight and *fast* memcached client for Node.JS. It has been developed due to some pain points with alternatives. **It's still in active development and nowhere nas mature as alternatives such as [node-memcached](https://github.com/3rd-Eden/node-memcached). Use with caution.**

 - Uses binary memcached protocol rather than the ASCII version.
 - Distributes keys over multiple memcached servers using a consistent hashing algorithm.
 - Auto reconnect / failover mechanisms built in.
 - Pipelines requests for improved throughtput.
 - Can pool connections.

## install

```
npm install memcached-lite
```

## connecting

```js
var memcached = require("memcached-lite");
var client = memcached(servers, options);
```

### servers
The server list can either be a string, array or object. This is directly based on [node-memcached](https://github.com/3rd-Eden/node-memcached) and compatible.

  - *string*: single server. use `hostname:port` or `hostname` for default port.
  - *array*: array of strings, keys will be distributed over these hosts.
  - *object*: different weights for different servers. `{"hostname1": 1, "hostname2": 2}` will cause hostname2 to have twica as many load as the hostname1.

### options

  - `socketNoDelay`: (default: `true`) set no delay setting on underlying sockets. set false to improve throughput but that would increase latency.
  - `socketKeepAlive`: (default: `true`) enable keep alive functionality on underlying sockets.
  - `retryDelay`: (default: `2000`) wait milliseconds before trying to reconnect a failed server connection.
  - `removeTimeout`: (default: `null`) wait milliseconds before marking a server dead and removing it from distribution. this will cause the keys on this server to be shifted onto others. by default, unavailable servers will be tried indefinately for reconnection.
  - `replacementHosts`: (default: `[]`) supply additional hostnames for failover. this setting requires a `removeTimeout` duration, however, client will replace dead servers with one from this list instead of simply removing them.
  - `connectionsPerServer`: (default: `1`) use n connections for each server. note that the client already does pipelining on a single connection, you do not need a lot of connections.
  - `enableOfflineQueue`: (default: `true`) if there is no active connection to a specific server, queue commands until we can acquire one.

```
var client = memcached("localhost:11211", { retryDelay: 5000, removeTimeout: 20000 });
```

## api

**client.touch** reset ttl on a key

```js
client.touch('key', 10 /** 10 seconds **/, function(err) {});
```

**client.get** get value of a key

`data` field contains the stored data on memcached or `undefined` if the key is not found.
`meta` is an optional parameter on the callback, it contains 2 fields: `meta.cas` is a string that can be used in `client.cas` method. additionally, `meta.status` contains the response status information returned by server.

```js
client.get('key', function(err, data, meta) {})
```

**client.del** delete a key

```js
client.del('key', function(err, meta) {})
```

**client.set**, **client.add**, **client.replace** store data on server. `set` always sets the value, `add` only works if the specified key does not exist on the server and `replace` works when the key exists.

`value` can be a `string`, `buffer`, `date`, `boolean`, `number` or arbitrary object that can be serialized with JSON. client will make sure that you receive the object in its original form on `client.get` calls.

```js
client.set('key', value, 10 /** 10 seconds lifetime **/, function(err, meta) {})
```

**client.cas** set a key only if matches the `cas` value obtained from other methods (`meta.cas`)

```js
client.cas('key', value, ttl, cas, function(err, meta) {})
```

**client.append**, **client.prepend** append or prepend data to an already stored value.

```js
client.append('key', value, function(err, meta) {});
client.prepend('key', value, function(err, meta) {});
```

**client.incr**, **client.decr** increment or decrement numeric value on a key

 - `delta` the increment / decrement amount.
 - `ttl` the default ttl value if key does not already exists
 - `initial` default value to work on if the key does not already exists.

```js
client.incr('key', delta, ttl, initial, function(err, count) {})
```

## author

Ekin Koc

## license

MIT
