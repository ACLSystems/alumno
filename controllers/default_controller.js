const Default 		= require('../src/default');
const Err 				= require('../controllers/err500_controller');
const StatusCodes = require('http-status-codes');

module.exports = {
	async create(req,res) {
		const key_user = res.locals.user;
		var defaultConfig = new Default({
			module: req.body.module,
			code: req.body.code,
			config: req.body.config,
			instance: req.body.instance,
			mod: [{
				who: `${key_user.person.name} ${key_user.person.fatherName} (${key_user.name})`,
				what: 'Default config creation',
				when: new Date()
			}]
		});
		try {
			await defaultConfig.save();
			res.status(StatusCodes.OK).json({
				'message': `Default creado para módulo ${defaultConfig.module} y code ${defaultConfig.code} - ${defaultConfig._id}`
			});
		} catch (e) {
			Err.sendError(res,e,'default_controller','Creando default');
		}
	}, //create

	async list(req,res) {
		try {
			const defaultConfigs = await Default.find({});
			if(defaultConfigs && Array.isArray(defaultConfigs) && defaultConfigs.length > 0) {
				res.status(StatusCodes.OK).json(defaultConfigs);
			} else {
				res.status(StatusCodes.OK).json({
					'message': 'No hay configuraciones'
				});
			}
		} catch (e) {
			Err.sendError(res,e,'default_controller','Listando defaults');
		}
	} //list
};
