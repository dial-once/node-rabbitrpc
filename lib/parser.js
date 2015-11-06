module.exports = function(msg) {
  return new Promise(function(resolve) {
    try {
      resolve(JSON.parse(msg));
    } catch(e) {
      resolve(msg);
    };
  });
}

