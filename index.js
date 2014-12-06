var Client = require("./lib/client.js");

module.exports = function(options) {
  return new Client(options);
}

module.exports.Client = Client;
