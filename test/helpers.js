var memcached = require("../");

module.exports.client = function  () {
  return memcached('localhost');
}
