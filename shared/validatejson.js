const winston = require('winston');
var transport = new(winston.transports.DailyRotateFile) ({
	filename: '../logs/log',
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

module.exports = function(log) {

	return function(err, req, res, next) {

		if (err) {
			if (err instanceof SyntaxError) {
				res.status(400).json({
					'status': 400,
					'message': 'Error: Invalid JSON body'
				});
				return;
			} else {

				if (log) {
					log.error(err);
				}

				logger.info(err);
				res.status(500).json({
					'status': 500,
					'message': 'Error',
					'Error': err.message
				});

				return;
			}
		}

		next();
	};

};
