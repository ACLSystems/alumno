const Validate = require('../middleware/validateOU');
const OUControllers = require('../controllers/orgUnit_controller');

module.exports = (app) => {
	app.post('/api/v1/orgunit',
		Validate.register,
		Validate.results,
		OUControllers.register
	);

	app.get('/api/v1/orgunits/:org',
		Validate.list,
		Validate.results,
		OUControllers.list
	);

	app.get('/api/orgunits/:org/:parent',
		Validate.publiclist,
		Validate.results,
		OUControllers.publiclist
	);

	app.get('/api/orgunit/:ou',
		Validate.get,
		Validate.results,
		OUControllers.get
	);
};
