var assert = require("assert");
var helpers = require("./helpers.js")

global.testn = 0;

describe('get / set', function () {
  var c = helpers.client();

  it('should set and get a value', function (next) {
    var n = global.testn++;

    c.set('getset:' + n, "TEST MESSAGE", 100, function (err, data) {
      if (err) return next(err);
      assert.ok(data);
      assert.ok(data.cas);
      assert.equal(data.status.key, "NO_ERROR");

      c.get('getset:' + n, function (err, gdata, meta) {
        if (err) return next(err);
        assert.equal(gdata, "TEST MESSAGE");
        assert.ok(meta);
        assert.equal(meta.status.key, "NO_ERROR");
        assert.equal(meta.cas, data.cas);
        next();
      });
    });
  });

  it('should set and get empty string', function (next) {
    var n = global.testn++;

    c.set('getset:' + n, "", 100, function (err, data) {
      if (err) return next(err);
      assert.ok(data);
      assert.ok(data.cas);
      assert.equal(data.status.key, "NO_ERROR");

      c.get('getset:' + n, function (err, gdata, meta) {
        if (err) return next(err);
        assert.equal(gdata, "");
        assert.ok(meta);
        assert.equal(meta.status.key, "NO_ERROR");
        assert.equal(meta.cas, data.cas);
        next();
      });
    });
  });

  it('should set and get json object', function (next) {
    var n = global.testn++;

    c.set('getset:' + n, { x: 1, y: 'value' }, 100, function (err, data) {
      if (err) return next(err);
      assert.ok(data);
      assert.ok(data.cas);
      assert.equal(data.status.key, "NO_ERROR");

      c.get('getset:' + n, function (err, gdata, meta) {
        if (err) return next(err);
        assert.deepEqual(gdata, { x: 1, y: 'value' });
        assert.ok(meta);
        assert.equal(meta.status.key, "NO_ERROR");
        assert.equal(meta.cas, data.cas);
        next();
      });
    });
  });

  it('should set and get a number', function (next) {
    var n = global.testn++;

    c.set('getset:' + n, n, 100, function (err, data) {
      if (err) return next(err);
      assert.ok(data);
      assert.ok(data.cas);
      assert.equal(data.status.key, "NO_ERROR");

      c.get('getset:' + n, function (err, gdata, meta) {
        if (err) return next(err);
        assert.equal(typeof gdata, 'number');
        assert.equal(gdata, n);
        assert.ok(meta);
        assert.equal(meta.status.key, "NO_ERROR");
        assert.equal(meta.cas, data.cas);
        next();
      });
    });
  });

  it('should set and get a number', function (next) {
    var n = global.testn++;
    var d = new Date();

    c.set('getset:' + n, d, 100, function (err, data) {
      if (err) return next(err);
      assert.ok(data);
      assert.ok(data.cas);
      assert.equal(data.status.key, "NO_ERROR");

      c.get('getset:' + n, function (err, gdata, meta) {
        if (err) return next(err);
        assert.equal(gdata.getTime(), d.getTime());
        assert.ok(meta);
        assert.equal(meta.status.key, "NO_ERROR");
        assert.equal(meta.cas, data.cas);
        next();
      });
    });
  });

  it('should get a non existing key', function (next) {
    var n = global.testn++;

    c.get('getset:' + n, function (err, gdata, meta) {
      if (err) return next(err);
      assert.ok(typeof gdata == 'undefined')
      assert.ok(meta);
      assert.equal(meta.status.key, "KEY_NOT_FOUND");
      assert.ok(!meta.cas);
      next();
    });
  });
});
