const {
	body,
	header,
	param,
	// query,
	validationResult
} 	= require('express-validator');
const StatusCodes = require('http-status-codes');

module.exports = {
	create: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('code')
			.exists()
			.withMessage('El código (code) del grupo es requerido'),
		body('course')
			.exists()
			.withMessage('Id del curso (course) es requerida')
			.isMongoId()
			.withMessage('Id del curso (course) debe ser un ObjectID válido'),
		body('org')
			.exists()
			.withMessage('Org es requerido'),
		body('orgUnit')
			.exists()
			.withMessage('OrgUnit es requerido'),
		body('project')
			.optional()
			.isMongoId()
			.withMessage('Project debe ser un ObjectID válido'),
	],
	listGroups: [
		param('ou')
			.exists()
			.withMessage('Unidad organizacional(ou) es requerida')
			.isMongoId()
			.withMessage('Unidad organizacional(ou) debe ser un ObjectId válido'),
		param('course')
			.exists()
			.withMessage('Curso(course) es requerido')
			.isMongoId()
			.withMessage('Curso(course) debe ser un ObjectId válido'),
	],
	get: [
		param('groupid')
			.exists()
			.withMessage('groupid es requerido. Puede ser el code de grupo también')
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
