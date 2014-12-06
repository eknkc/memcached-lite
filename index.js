var Client = require("./lib/client.js");

module.exports = function(hosts, options) {
  return new Client(hosts, options);
}

module.exports.Client = Client;
