var c = require("../index")("localhost", { connectionsPerServer: 2 });

suite('basic', function() {
  before(function (next) {
    c.set('gettest1', "VALUE", 1000, next);
  });

  set('concurrency', 20);

  bench('get', function (next) {
    c.get('gettest1', next);
  });

  bench('set', function (next) {
    c.set('settest1' + Math.random(), "VALUE", 100, next);
  });
});
