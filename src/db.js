// Bring Mongoose into the app
const mongoose = require( 'mongoose' );
mongoose.Promise = global.Promise;

// Bring winston
const winston = require('winston');
require('winston-daily-rotate-file');

var transport = new(winston.transports.DailyRotateFile) ({
  filename: './logs/log',
  datePattern: 'yyyy-MM-dd.',
  prepend: true,
  localTime: true,
  level: process.env.ENV === 'development' ? 'debug' : 'info'
});

var logger = new(winston.Logger) ({
  transports: [
    transport
  ]
});


// Build the connection string
if(process.env.MONGO_URI) {
  let dbURI = process.env.MONGO_URI;
} else {
  let dbURI = 'mongodb://mongo/alumno';
}

// Build connection options
let options = {
  useMongoClient: true,
  autoReconnect: true,
  reconnectTries: 2,
  //reconnectTries: 3600, // Intenta conectarte cada segundo hasta en una hora
  reconnectInterval: 1000,
  poolSize: 10
};

// Create the database connection
mongoose.connect(dbURI, options);

var message = '';

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function () {
  message = 'Mongoose default connection open to ' + dbURI;
  logger.info(message);
  console.log(message);
});

// If the connection throws an error
mongoose.connection.on('error',function (err) {
  message = 'Mongoose default connection error: ' + err;
  logger.info(message);
  console.log(message);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
  message = 'Mongoose default connection disconnected';
  logger.info(message);
  console.log(message);
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function() {
  mongoose.connection.close(function () {
    message = 'Mongoose default connection disconnected through app termination. Server process ends successfully';
    logger.info(message);
    console.log(message);
    process.exit(0);
  });
});