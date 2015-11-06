//you can also just require('amqprpc')(); if your broker is local
var amqprpc = require('rabbitrpc')( { AMQP_URL: 'amqp://localhost' });
amqprpc.consumer
.connect() //this create your channels and setup the amqp connexion
.then(function(){
  amqprpc.consumer.createQueue('queue:name', function(msg){
    //handle your msg, you can create a promise, or return a value. Result will be sent to producer
  });
});