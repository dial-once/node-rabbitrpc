var amqp = require('amqplib'),
  parser = require('./parser'),
  winston = require('winston');

var conn,channel,config,queues;
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
    return parser(msg.content.toString())
      .then(callback)
      .then(function(response) {
        if (typeof response === 'object') {
          response = JSON.stringify(response);
        }
        send(msg, response);
      })
      .catch(function(e){
        winston.warn(e);
        send(msg, e);
      });
  };
}

function connect() {
  winston.info('[AMQP-RPC] Connecting...');
  return amqp.connect(config.AMQP_URL || process.env.AMQP_URL || 'amqp://localhost')
  .then(function(_conn) {
    conn = _conn;
    winston.info('[AMQP-RPC] Connected');
    conn.on('close', connectAfterTimeout);
    conn.on('error', connectAfterTimeout);
    return conn.createChannel().then(function(_channel) {
      channel = _channel;

      for (var qName in queues) {
        if(queues.hasOwnProperty(qName)) {
          createQueue(qName, queues[qName]);
        }
      }
    });
  }).catch(function(err){
    console.log(err);
    connectAfterTimeout();
  });
}

function createQueue(queue, callback) {
  queues[queue] = callback;

  queue += (process.env.LOCAL_QUEUE ? process.env.LOCAL_QUEUE : '');
  
  return channel.assertQueue(queue, {durable: true})
    .then(function() {
      channel.prefetch(1);
      return channel.consume(queue, reply(queue, callback));
    })
    .then(function() {
      winston.info('[AMQP-RPC] Awaiting RPC requests on', queue);
    });
}

function connectAfterTimeout() {
  setTimeout(connect, 1000);
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
