const Validator 				= require('express-route-validator');
const StatusCodes 			= require('http-status-codes');
const GetNothing 				= require('../controllers/get_nothing'				);
const auth 							= require('./auth');
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
	app.post('/login', Validator.validate({
		body: {
			username: {
				isRequired: true, isEmail: true, toLowerCase: true
			},
			password: {
				isRequired: true
			}
		},
		headers: {
			'content-type': {isRequired: true, equals: 'application/json'}
		},
		errorHandler: function(err,req,res){
			res.status(StatusCodes.BAD_REQUEST).json({
				'message': 'Error: se requiere email (usuario@dominio.raiz) y password'
			});
			return;
		}
	}), auth.login);


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
	app.post('/api/user/register', Validator.validate({
		body: {
			name: {
				isRequired: true, isEmail: true, toLowerCase: true
			},
			password: {
				isRequired: true
			},
			person: {
				isRequired: true
			},
			org: {
				isRequired: true
			},
			orgUnit: {
				isRequired: true
			}
		},
		headers: {
			'content-type': {isRequired: true, equals: 'application/json'}
		},
		errorHandler: function(err,req,res){
			let returnMessage = {
				message: 'Error: se requieren las siguientes propiedades',
				name: req.body.name  || 'FALTA {String} (email válido)',
				password: req.body.name || 'FALTA {String}',
				person: req.body.person || 'FALTA {Object}',
				org: req.body.org || 'FALTA {String}',
				orgUnit: req.body.orgUnit || 'FALTA {String}',
			};
			res.status(StatusCodes.BAD_REQUEST).json(returnMessage);
			return;
		}
	}),UserController.register);

	/** @api {get} /api/user/near
		* @apiName Búsqueda de plantel más cercano
		* @apiPermission none
		* @apiGroup User
		* @apiParam {String} [lng] longitud
		* @apiParam {String} [lat] latitud
		* @apiSuccess (200) {Object}
		*/
	app.get ('/api/user/near', Validator.validate({
		body: {
			lng: {
				isRequired: true
			},
			lat: {
				isRequired: true
			}
		},
		headers: {
			'content-type': {isRequired: true, equals: 'application/json'}
		},
		errorHandler: function(err,req,res){
			let returnMessage = {
				message: 'Error: se requieren las siguientes propiedades',
				lat: req.body.lat  || 'FALTA {Number}',
				lng: req.body.name || 'FALTA {Number}'
			};
			res.status(StatusCodes.BAD_REQUEST).json(returnMessage);
			return;
		}
	}),OrgUnitController.index);


	app.get ('/api/user/getdetails', 				UserController.getDetailsPublic);
	app.put ('/api/user/confirm', 					UserController.confirm);
	app.get ('/api/user/validateemail',			UserController.validateEmail);
	app.put ('/api/user/passwordrecovery',	UserController.passwordRecovery);
	app.get ('/api/help',										HelpController.help);
	app.get ('/api/orgunit/list',						OrgUnitController.publiclist);
	app.get ('/api/career/list',						CareerController.list);
	app.get ('/api/career/listareas',				CareerController.listAreas);
	app.get ('/api/term/list', 							TermController.list);
	app.get ('/api/term/listtypes', 				TermController.listTypes);
	app.get ('/api/course/getblocklist',		CourseController.getBlocklistStudents);
	app.get ('/api/course/list', 						CourseController.listCoursesStudents);
	app.get ('/api/course/count', 					CourseController.countCourses);
	app.get ('/api/cert/get', 							CertController.getCertificate);
};
