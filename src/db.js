const mongoose 	= require( 'mongoose' );
const uriFormat = require( 'mongodb-uri' );
const init 			= require('./init');
const version		= require('../shared/version');
mongoose.Promise = global.Promise;

const logger = require('../shared/winston-logger');

var dbURI = 'mongodb://operator:Password01@mongo:27017/alumno';
if(process.env.MONGO_URI) { dbURI = process.env.MONGO_URI; }

let options = {
	//useMongoClient: true,
	autoReconnect: true,
	reconnectTries: 2,
	//reconnectTries: 3600, // Intenta conectarte cada segundo hasta en una hora
	reconnectInterval: 1000,
	poolSize: 10,
	useNewUrlParser: true
};

// Create the database connection
mongoose.connect(encodeMongoURI(dbURI), options);

// Agregado para hacer debug. Apagar inmediatamente y por ningún motivo prenderlo en producción
if(process.env.NODE_ENV &&
	(
		process.env.NODE_ENV === 'development' ||
		process.env.NODE_ENV === 'test'
	) &&
	process.env.NODE_DEBUG &&
	process.env.NODE_DEBUG === 'on'){
	mongoose.set('debug',true);
}

var message = '';

var systemInit = true;

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function () {
	message = 'DB connection open successfully';
	logger.info(message);
	console.log(message); // eslint-disable-line
	init.initDB(version);
	if(systemInit) {
		// Colocar los procesos que deben arrancar junto con el servidor

		systemInit = false;
	}
});

// If the connection throws an error
mongoose.connection.on('error',function (err) {
	message = 'DB connection error: ' + err;
	logger.error(message);
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


// Private Functions

function encodeMongoURI (urlString) {
	if (urlString) {
		let parsed = uriFormat.parse(urlString);
		urlString = uriFormat.format(parsed);
	}
	return urlString;
}
