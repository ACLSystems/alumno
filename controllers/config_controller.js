
const Config = require('../src/config');
const Err 					= require('../controllers/err500_controller');

module.exports = {

	create(req,res) {
		if(!req.body.org) {
			res.status(200).json({
				'message': 'Org missing'
			});
			return;
		}
		Config.findOne({})
			.then((config) => {
				if(config) {
					res.status(200).json({
						'message': 'Config already exists. Please use modify'
					});
				} else {
					Config.create(req.body)
						.then(() => {
							res.status(200).json({
								'message': 'config was created'
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'config_controller','create -- Create config --');
						});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'config_controller','create -- Create config --');
			});

	}, // create
};


// Private Functions -----------------------------------------------------------
