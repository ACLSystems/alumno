const logger = require('../shared/winston-logger');

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

				logger.error(err);
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
