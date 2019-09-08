//const Validator 				= require('express-route-validator');
//const StatusCodes 			= require('http-status-codes');
const Validate					= require('../middleware/validatePublic');
const AuthMiddleware 		= require('../middleware/auth'								);
const GetNothing 				= require('../controllers/get_nothing'				);
const UserController		= require('../controllers/user_controller'		);
const HelpController 		= require('../controllers/help_controller'		);
const OrgUnitController = require('../controllers/orgUnit_controller'	);
const CareerController 	= require('../controllers/career_controller'	);
const TermController 		= require('../controllers/term_controller'		);
const CourseController 	= require('../controllers/course_controller'	);
const CertController 		= require('../controllers/certs_controller'		);

module.exports = (app) => {

	/** @api {get} /
		* @apiName greeting
		* @apiPermission none
		* @apiGroup none
		*/
	app.get ('/', GetNothing.greeting);

	/** @api {post} /login
		* @apiName login
		* @apiPermission none
		* @apiGroup User
		* @apiParam {String} [username] username - en formato de email
		* @apiParam {String} [password] password
		* @apiSuccess (200) {Object} mixed regresa Token y Expiración
		*/
	app.post('/login',
		Validate.login,
		Validate.results,
		AuthMiddleware.login
	);

	/** @api {post} /api/user
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
	app.post('/api/user',
		Validate.userRegister,
		Validate.results,
		UserController.register);

	/** @api {get} /api/orgunit/near
		* @apiName Búsqueda de plantel más cercano
		* @apiPermission none
		* @apiGroup OrgUnit
		* @apiParam {String} [lng] longitud
		* @apiParam {String} [lat] latitud
		* @apiSuccess (200) {Object}
		*/
	app.get ('/api/orgunit/near',
		Validate.orgUnitNear,
		Validate.results,
		OrgUnitController.index);

	/** @api {get} /api/user/:name
		* @apiName Detalles del usuario
		* @apiPermission none
		* @apiGroup User
		* @apiParam {String} [name] Nombre de usuario
		* @apiSuccess (200) {Object}
		*/
	app.get ('/api/user/:name',
		Validate.getDetailsPublic,
		Validate.results,
		UserController.getDetailsPublic);

	/** @api {post} /api/user/confirm
		* @apiName Confirmar cuenta del usuario
		* @apiPermission none
		* @apiGroup User
		* @apiParam {String} [email] email de usuario
		* @apiParam {String} [token] token temporal
		* @apiParam {String} [name] Nombre de usuario
		* @apiParam {String} [fatherName] Apellido paterno
		* @apiParam {String} [motherName] Apellido materno
		* @apiSuccess (200) {Object}
		*/
	app.post('/api/user/confirm',
		Validate.confirm,
		Validate.results,
		UserController.confirm);

	/** @api {post} /api/user/validateemail
		* @apiName Validar cuenta de correo del usuario
		* @apiPermission none
		* @apiGroup User
		* @apiParam {String} [email] email de usuario
		* @apiSuccess (200) {Object}
		*/
	app.post('/api/user/validateemail',
		Validate.validateEmail,
		Validate.results,
		UserController.validateEmail);

	/** @api {post} /api/user/passwordrecovery
		* @apiName Validar cuenta de correo para recuperar password del usuario
		* @apiPermission none
		* @apiGroup User
		* @apiParam {String} [email] email de usuario
		* @apiParam {String} [emailID] token temporal
		* @apiParam {String} [password] password de usuario
		* @apiSuccess (200) {Object}
		*/
	app.post('/api/user/passwordrecovery',
		Validate.passwordRecovery,
		Validate.results,
		UserController.passwordRecovery);

	/** @api {get} /api/help
		* @apiName Ayuda y documentación (desaparecerá)
		* @apiPermission none
		* @apiGroup Public
		* @apiSuccess (200) {Object}
		*/
	app.get ('/api/help',
		HelpController.help);

	app.get ('/api/orgunit/list',						OrgUnitController.publiclist);
	app.get ('/api/career/list',						CareerController.list);
	app.get ('/api/career/listareas',				CareerController.listAreas);
	app.get ('/api/term/list', 							TermController.list);
	app.get ('/api/term/listtypes', 				TermController.listTypes);
	app.get ('/api/course/getblocklist',		CourseController.getBlocklistStudents);
	app.get ('/api/course/list', 						CourseController.listCoursesPublic);
	app.get ('/api/course/count', 					CourseController.countCourses);

	/** @api {post} /api/user/passwordrecovery
		* @apiName Validar cuenta de correo para recuperar password del usuario
		* @apiPermission none
		* @apiGroup User
		* @apiParam {Number} [certificate] número de folio del certificado
		* @apiSuccess (200) {Object}
		*/
	app.get ('/api/cert/get',
		Validate.getCertificate,
		Validate.results,
		CertController.getCertificate);

	/** @api {post} /api/user/captcha
		* @apiName Validar respuesta captcha
		* @apiPermission none
		* @apiGroup User
		* @apiParam {String} [response] respuesta del captcha
		* @apiSuccess (200) {Object}
		*/
	app.post('/api/user/captcha',
		Validate.captcha,
		Validate.results,
		UserController.captcha);
};
