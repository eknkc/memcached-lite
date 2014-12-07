var c = require("../index")("localhost", { connectionsPerServer: 1 });

suite('basic', function() {
  before(function (next) {
    c.set('gettest1', "VALUE", 1000, next);
  });

  set('concurrency', 50);

  bench('get', function (next) {
    c.get('gettest1', next);
  });

  bench('set', function (next) {
    c.set('settest1', "VALUE", 100, next);
  });

  bench('incr', function (next) {
    c.incr('settest2', 1, 100, next);
  });

  bench('quiet set', function () {
    c.set('settest1', "VALUE", 100);
  });

  bench('quiet incr', function () {
    c.incr('settest2', 1, 100);
  });
});
