# node-amqprpc
Some modules to require to create producers / consumers using AMQP-RPC

# features
  - Auto reconnect
  - Built on top of amqplib
  - Full promise support

# how to use it

### consumer  
listen on a queue and send back a message
```js
//you can also just require('amqprpc')(); if your broker is local
var amqprpc = require('rabbitrpc')( { AMQP_URL: 'amqp://localhost' });
amqprpc.consumer
.connect() //this create your channels and setup the amqp connexion
.then(function(){
  amqprpc.consumer.createQueue('queue:name', function(msg){
    //handle your msg, you can create a promise, or return a value. Result will be sent to producer
  });
});
```

### producer
send a message to a queue and listen for a response
```js
//you can also just require('amqprpc')(); if your broker is local
var amqprpc = require('rabbitrpc')( { AMQP_URL: 'amqp://localhost' });
amqprpc.consumer
.connect() //this create your channels and setup the amqp connexion
.then(function(){
  amqprpc.consumer.createQueue('queue:name', function(msg){
    //handle your msg, you can create a promise, or return a value. Result will be sent to producer
  });
});
```
