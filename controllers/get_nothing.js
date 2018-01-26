const version = require('../shared/version');

module.exports = {
	greeting(req, res) {
		res.status(200);
		res.json({
			app: version.app,
			version: version.version
		});
	}
};
