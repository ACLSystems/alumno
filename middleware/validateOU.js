const {
	body,
	header,
	param,
	// query,
	validationResult
} 	= require('express-validator');
const StatusCodes = require('http-status-codes');

module.exports = {
	register: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('name','Se requiere nombre "name"')
			.exists(),
		body('longName', 'Se requiere nombre largo "longName"')
			.exists(),
		body('org','Se requiere organización "org"')
			.exists(),
		body('parent', 'Se requiere la organización padre "parent"')
			.exists()
	],
	list: [
		param('org', 'Se requiere la organización')
			.exists(),
	],
	publiclist: [
		param('org', 'Se requiere la organización')
			.exists(),
		param('parent', 'Se require la ou padre')
			.exists()
	],
	get: [
		param('ou', 'Se requiere orgUnit name')
			.exists()
	],
	results(req,res,next) {
		const errors = validationResult(req);
		if(!errors.isEmpty()) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: 'Error: Favor de revisar los errores siguientes',
				errors: errors.array()
			});
		} else {
			next();
		}
	}
};
