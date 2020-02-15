const version = require('./version/version');
const app 		= require('./app');
const server	= require('http').Server(app);
const logger	= require('./shared/winston-logger');
const io			= require('socket.io')(server);

/**
	* CONFIG
	* Todo se extrae de variables de Ambiente
	*/
/** @const {number}	- URL de libreta
	* @default 				- Puerto default 3050
*/

const port 		= parseInt(process.env.NODE_PORT) || 3050;

app.set('port', port);

server.listen(app.get('port'),() => {
	console.log(version.app + '@' + version.version + ' ' + version.vendor + ' \u00A9' + version.year ); // eslint-disable-line
	console.log('Listening on port ' + server.address().port); // eslint-disable-line
	logger.info('Listening on port ' + server.address().port);
});

require('./controllers/io_controller')(io);
