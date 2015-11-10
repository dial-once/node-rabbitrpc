var rabbitrpc = require('../index')( { AMQP_URL: 'amqp://localhost' }),
  http = require('http');

var startDate;
var tick = 0;
var receivedTotal = 0;

rabbitrpc.consumer
.connect()
.then(function() {
  for (var i = 0; i < 4; i++) {
    (function(index){
      rabbitrpc.consumer.createQueue('queue:name:' + index, function(msg) {
        receivedTotal++;
        rabbitrpc.producer.send('queue:name:' + index, {message: 'A random message sent in the queue!'});
      });
    })(i)
  }

  for(var i = 0; i < 4; i++) {
    console.log('Sending init message', i);
    rabbitrpc.producer.send('queue:name:' + i, {message: 'A random message sent in the queue!'});
  }

  startDate = new Date();

  setInterval(function(){
    console.log('Running for:', (new Date() - startDate) / 1000, 'secs. Current tick:', tick);
    console.log('Current bitrate (this tick):', receivedTotal / 10, '/sec.');
    console.log('Memory usage:', process.memoryUsage().rss / 1000, 'kb');
    receivedTotal = 0;
    tick++;
  }, 10000);
});

var gracefulShutdown = function () {
  server.close();
  process.exit();
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

var server = http.createServer().listen(process.env.PORT || 3000);