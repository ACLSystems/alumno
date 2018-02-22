// Bring Mongoose into the app
const mongoose = require( 'mongoose' );
const init = require('./init');
const version = require('../shared/version');
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
var dbURI = 'mongodb://operator:Password01@mongo/alumno';
if(process.env.MONGO_URI) { dbURI = process.env.MONGO_URI; }

//console.log('Using ' + dbURI); // eslint-disable-line

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
	message = 'DB connection open successfully';
	logger.info(message);
	console.log(message); // eslint-disable-line
	init.init(version);
});

// If the connection throws an error
mongoose.connection.on('error',function (err) {
	message = 'DB connection error: ' + err;
	logger.info(message);
	console.log(message); // eslint-disable-line
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
	message = 'DB connection disconnected';
	logger.info(message);
	console.log(message); // eslint-disable-line
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function() {
	mongoose.connection.close(function () {
		message = 'DB connection disconnected through app termination. Server process ends successfully';
		logger.info(message);
		console.log(message); // eslint-disable-line
		process.exit(0);
	});
});
