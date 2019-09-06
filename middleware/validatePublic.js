const {
	body,
	header,
	param,
	query,
	validationResult
} 	= require('express-validator');
const StatusCodes = require('http-status-codes');

module.exports = {
	login: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('username','Se requiere email para ingresar').exists().isEmail(),
		body('password','Se requiere password').exists(),
	],
	userRegister:[
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('name','name(email) es obligatorio').exists().isEmail(),
		body('password','password es obligatorio').exists(),
		body('person.name','nombre (person.name) es obligatorio').exists(),
		body('person.fatherName','apellido paterno (person.fatherName) es obligatorio').exists(),
		body('person.motherName','apellido materno (person.motherName) es obligatorio').exists(),
		body('org','organización(org) es obligatorio').exists(),
		body('orgUnit','unidad organizacional (orgUnit) es obligatorio').exists()
		// Llenar todas las propiedades que faltan
	],
	orgUnitNear: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('lng').exists(),
		body('lat').exists()
	],
	getDetailsPublic: [
		param('name').exists().isEmail()
	],
	confirm: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('email').exists().isEmail(),
		body('token').exists(),
		body('name').exists(),
		body('fatherName').exists(),
		body('motherName').exists()
	],
	validateEmail: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('email').exists().isEmail()
	],
	passwordRecovery: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('email').exists().isEmail(),
		body('emailID').exists(),
		body('password').exists(),
	],
	getCertificate: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		query('certificate').exists()
	],
	captcha: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('response').exists()
	],
	results(req,res,next) {
		//console.log(req.headers);
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
