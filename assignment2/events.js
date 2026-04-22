const EventEmitter = require("events");
const emitter = new EventEmitter();

emitter.on("time", (message) => {
  console.log("Time received: " + message);
});

const emitTime = () => {
  const currentTime = new Date().toLocaleTimeString();
  emitter.emit("time", currentTime); // Broadcast the 'time' event
}

if (require.main === module) {
  const timer = setInterval(emitTime, 5000);
  timer.unref(); 
}

module.exports = emitter;