const version = require('./shared/version');
const winston = require('winston');
require('winston-daily-rotate-file');
const app = require('./app');

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

app.set('port', process.env.PORT || 3050);

var server = app.listen(app.get('port'),() => {
	console.log(version.app + '@' + version.version); // eslint-disable-line
	console.log('Listening on port ' + server.address().port); // eslint-disable-line
	logger.info('Listening on port ' + server.address().port);
});
