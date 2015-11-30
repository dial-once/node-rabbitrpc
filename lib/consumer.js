var amqp = require('amqplib');
var parser = require('./parser');
var winston = require('winston');

var conn, channel, config, queues;
queues = {};

function send(msg, content) {
  channel.sendToQueue(msg.properties.replyTo,
    new Buffer(content ? content.toString() : ''),
    {correlationId: msg.properties.correlationId});
  channel.ack(msg);
}

function reply(queue, callback) {
  return function(msg) {
    winston.log('[AMQP-RPC] Got message on', queue);
    var tmpMsg;
    return parser(msg.content.toString())
      .then(callback)
      .then(function(response) {
        if (typeof response === 'object') {
          response = JSON.stringify(response);
        } else {
          response = response.toString();
        }
        tmpMsg = response;
        send(msg, response);
      })
      .catch(function(e) {
        winston.error(e);
        send(msg, tmpMsg || e);
      });
  };
}

var intervalID;
function connect() {
  winston.info('[AMQP-RPC] Connecting...');

  return amqp.connect(config.AMQP_URL || process.env.AMQP_URL || 'amqp://localhost')
  .then(function(_conn) {
    conn = _conn;
    winston.info('[AMQP-RPC] Connected');
    conn.on('close', reconnect);
    conn.on('error', reconnect);

    intervalID = clearInterval(intervalID);

    return conn.createChannel().then(function(_channel) {
      channel = _channel;

      var promises = [];
      for (var qName in queues) {
        if (queues.hasOwnProperty(qName)) {
          promises.push(createQueue(qName, queues[qName]));
        }
      }
      return Promise.all(promises);
    });
  }).catch(function(err){
    console.log(err);
    reconnect();
  });
}

function createQueue(queue, callback) {
  queues[queue] = callback;

  if (!channel) return Promise.resolve();

  queue += (process.env.LOCAL_QUEUE ? process.env.LOCAL_QUEUE : '');

  return channel.assertQueue(queue, {durable: true})
    .then(function() {
      channel.prefetch(1);
      return channel.consume(queue, reply(queue, callback), {noAck: false});
    })
    .then(function() {
      winston.info('[AMQP-RPC] Awaiting RPC requests on', queue);
    });
}

function reconnect() {
  if (!intervalID) {
    intervalID = setInterval(connect, 1000);
  }
}

module.exports = function(_config) {
  config = _config;
  return {
    connect: connect,
    createQueue: createQueue,
    close: function() {
      if (conn) return conn.close();
    }
  };
};
