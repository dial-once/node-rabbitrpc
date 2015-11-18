var uuid = require('node-uuid');
var amqp = require('amqplib');
var when = require('when');
var defer = when.defer;

var conn, channel, queue, config;
var connected, connecting = false;
var answerQueue = {};

function maybeAnswer(msg) {
  var corrIdA = msg.properties.correlationId;
  if (answerQueue[corrIdA] !== undefined) {
    answerQueue[corrIdA].resolve(msg.content.toString());
    delete answerQueue[corrIdA];
  }
}

var reqQueue = [];

function connect() {
  connecting = true;

  return amqp.connect(config.AMQP_URL || process.env.AMQP_URL || 'amqp://localhost')
  .then(function(_conn) {
    conn = _conn;
    conn.on('close', connectAfterTimeout);
    conn.on('error', connectAfterTimeout);

    return conn.createChannel().then(function(_channel) {
      channel = _channel;
      return channel.assertQueue('', {exclusive: true})
        .then(function(qok) { return qok.queue; })
        .then(function(_queue) {
          queue = _queue;
          connected = true;
          for (var i = 0; i < reqQueue.length; i++) {
            reqQueue[i]();
          }

          return channel.consume(queue, maybeAnswer, {noAck: true}).then(function() { return queue; });
        });
    });
  });
}

function connectAfterTimeout() {
  setTimeout(connect, 1000);
}

module.exports = function(_config) {
  config = _config;
  return {
    connect: connect,
    send: function(_queue, msg) {
      if (!msg) return Promise.resolve();

      var corrId = uuid();
      answerQueue[corrId] = defer();

      if (typeof msg === 'object') {
        msg = JSON.stringify(msg);
      }

      if (!connected) {
        reqQueue.push(function() {
          channel.sendToQueue(_queue, new Buffer(msg), {
            correlationId: corrId,
            replyTo: queue
          });
        });
        if (!connecting) {
          connect();
        }
      } else {
        channel.sendToQueue(_queue, new Buffer(msg), {
          correlationId: corrId, replyTo: queue
        });
      }

      return answerQueue[corrId].promise;
    }
  };
};
