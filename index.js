const version = require('./version/version');
const app 		= require('./app');
const logger	= require('./shared/winston-logger');

app.set('port', process.env.PORT || 3050);

var server = app.listen(app.get('port'),() => {
	console.log(version.app + '@' + version.version + ' ' + version.vendor + ' \u00A9' + version.year ); // eslint-disable-line
	console.log('Listening on port ' + server.address().port); // eslint-disable-line
	logger.info('Listening on port ' + server.address().port);
});
