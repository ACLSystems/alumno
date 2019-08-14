const StatusCodes = require('http-status-codes');
const version 		= require('../version/version');

module.exports = {
	greeting(req, res) {
		res.status(StatusCodes.OK).json({
			app: version.app,
			version: version.version,
			vendor: `${version.vendor} @${version.year}`,
			time: version.time.toString()
		});
	}
};
