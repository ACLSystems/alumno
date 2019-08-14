const Validator 				= require('express-route-validator');
const StatusCodes 			= require('http-status-codes');
const CourseController 	= require('../controllers/course_controller'	);


module.exports = (app) => {

	/** @api {post} /api/user/register
		* @apiName Registro de usuario
		* @apiPermission none / isAdmin
		* @apiGroup User
		* @apiParam {String} [name] name - en formato de email
		* @apiParam {String} [password] password
		* @apiParam {Object} [person] mixed Datos del usuario
		* @apiParam {String} [org] organización
		* @apiParam {String} [orgUnit] Unidad organizacional
		* @apiSuccess (200) {Object}
		*/
	app.get('/api/v1/admin/export/course', Validator.validate({
		query: {
			id: {
				isMongoId:true
			}
		},
		errorHandler: function(err,req,res){
			let returnMessage = {
				message: 'Error: se requiere cualquiera de las siguientes propiedades',
				code: req.body.name  || 'FALTA {String}',
				id: req.body.name || 'FALTA {ObjectId}'
			};
			res.status(StatusCodes.BAD_REQUEST).json(returnMessage);
			return;
		}
	}),CourseController.export);

};
