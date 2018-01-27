const UserController = require('../controllers/user_controller');
const OrgController = require('../controllers/org_controller');
const OrgUnitController = require('../controllers/orgUnit_controller');
const GetNothing = require('../controllers/get_nothing');
const auth = require('./auth');
const MassUsersController = require('../controllers/massiveUsers_Controller');
const HelpController = require('../controllers/help_controller');
const CourseController = require('../controllers/course_controller');

module.exports = (app) => {

	app.all('/*', function(req, res, next) {
	// CORS headers
		res.header('Access-Control-Allow-Origin', '*'); // restrict it to the required domain
		res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
		// Set custom headers for CORS
		res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
		if (req.method == 'OPTIONS') {
			res.status(200).end();
		} else {
			next();
		}
	});

	// Auth Middleware - This will check if the token is valid
	// Only the requests that start with /api/v1/* will be checked for the token.
	// Any URL's that do not follow the below pattern should be avoided unless you
	// are sure that authentication is not needed
	app.all('/api/v1/*', [require('../controllers/validateRequest')]);

	// Rutas que cualquiera puede acceder

	app.get('/', GetNothing.greeting);
	app.post('/login', auth.login);
	app.all('/api/user/*', [require('../controllers/validateParams')]);
	app.post('/api/user/register', UserController.register);
	app.get('/api/user/near', OrgUnitController.index);
	app.get('/api/user/validateEmail', UserController.validateEmail);
	app.get('/api/help', HelpController.help);

	// Rutas que pueden acceder solo usuarios autenticados

	// Rutas para usuarios

	app.all('/api/v1/user/*', [require('../controllers/validateParams')]);
	app.get('/api/v1/user/getdetails', UserController.getDetails);
	app.get('/api/v1/user/getroles', UserController.getRoles);
	app.put('/api/v1/user/setroles', UserController.setRoles);
	app.put('/api/v1/user/passwordchange', UserController.passwordChange);
	app.put('/api/v1/user/modify', UserController.modify);

	// Rutas para cursos

	app.get('/api/v1/course/listcategories', CourseController.listCategories);
	app.get('/api/v1/course/listcourses', CourseController.listCourses);


	// Rutas que pueden acceder solo usuarios autenticados y autorizados

	// Rutas para roles de 'isAdmin'

	app.post('/api/v1/admin/org/register', OrgController.register);
	app.get('/api/v1/admin/user/list', UserController.list);
	app.get('/api/v1/admin/user/count', UserController.count);
	app.get('/api/v1/admin/org/list', OrgController.list);
	app.get('/api/v1/admin/orgunit/list', OrgUnitController.list);
	app.get('/api/v1/admin/org/getdetailsadmin', OrgController.getDetailsAdmin);

	// Rutas para roles de 'isOrg'

	app.all('/api/v1/orgadm/*', [require('../controllers/validateParams')]);
	app.post('/api/v1/orgadm/user/massiveregister', MassUsersController.massiveRegister);
	app.post('/api/v1/orgadm/orgunit/massiveregister', OrgUnitController.massiveRegister);
	app.post('/api/v1/orgadm/orgunit/register', OrgUnitController.register);
	app.get('/api/v1/orgadm/orgunit/list', OrgUnitController.list);
	app.get('/api/v1/orgadm/user/list', UserController.list);
	app.get('/api/v1/orgadm/user/count', UserController.count);
	app.get('/api/v1/orgadm/org/getdetails', OrgController.getDetails);


	// Rutas para roles de 'isAuthor'

	app.post('/api/v1/author/course/create', CourseController.create);

};
