//you can also just require('amqprpc')(); if your broker is local
var amqprpc = require('amqprpc')( { AMQP_URL: 'amqp://localhost' });
amqprpc.producer
.send('queue:name', { message: 'ok', data: {/* whatever */} })
.then(function(response){
  //handle your response here!
  //see consumer example to check how to respond to a producer
});