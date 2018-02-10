const GetNothing = require('../controllers/get_nothing');
const HelpController = require('../controllers/help_controller');
const ErrorMessController = require('../controllers/errmessage_controller');
const UserController = require('../controllers/user_controller');
const auth = require('./auth');
const MassUsersController = require('../controllers/massiveUsers_Controller');
const OrgController = require('../controllers/org_controller');
const OrgUnitController = require('../controllers/orgUnit_controller');
const CourseController = require('../controllers/course_controller');
const GroupController = require('../controllers/group_controller');
const FileController = require('../controllers/file_controller');
const CareerController = require('../controllers/career_controller');
const TermController = require('../controllers/term_controller');
const multer = require('multer');
const dir = '/Users/Arturo/data';
const fileSize = 1048576;
const files = 1;

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


	// MIDDLEWARE --------------------------------------------------------------------------


	var upload = multer({
		dest: dir,
		limits: {
			fileSize: fileSize,
			files: files
		}
	});

	app.all('/api/user/*', [require('../controllers/validateParams')]);
	app.get('/api/errorcodes',[require('../controllers/validateParams')]);
	app.all('/api/v1/user/*', [require('../controllers/validateParams')]);
	app.all('/api/v1/course/*', [require('../controllers/validateParams')]);
	app.all('/api/v1/author/course/*', [require('../controllers/validateParams')]);
	app.all('/api/v1/instructor/group/*', [require('../controllers/validateParams')]);
	app.all('/api/v1/orgadm/*', [require('../controllers/validateParams')]);
	app.all('/api/orgunit/*', [require('../controllers/validateParams')]);
	app.all('/api/course/*', [require('../controllers/validateParams')]);

	// RUTAS ---------------------------------------------------------------------------------

	// Rutas que cualquiera puede acceder

	app.get('/', GetNothing.greeting);
	app.post('/login', auth.login);
	app.post('/api/user/register', UserController.register);
	app.get('/api/user/near', OrgUnitController.index);
	app.get('/api/user/confirm', UserController.confirm);
	app.get('/api/user/validateEmail', UserController.validateEmail);
	app.get('/api/help', HelpController.help);
	app.get('/api/errorcodes',ErrorMessController.errorCodes);
	app.get('/api/orgunit/list', OrgUnitController.publiclist);
	app.get('/api/career/list', CareerController.list);
	app.get('/api/career/listareas', CareerController.listAreas);
	app.get('/api/term/list', TermController.list);
	app.get('/api/term/listtypes', TermController.listTypes);
	app.get('/api/course/getblocklist', CourseController.getBlocklistStudents);
	app.get('/api/course/list', CourseController.listCoursesStudents);

	// Rutas que pueden acceder solo usuarios autenticados

	// Rutas para usuarios

	app.get('/api/v1/user/getdetails', UserController.getDetails);
	app.put('/api/v1/user/passwordchange', UserController.passwordChange);
	app.put('/api/v1/user/modify', UserController.modify);
	app.get('/api/v1/user/mygroups', GroupController.myGroups);
	app.get('/api/v1/user/nextblock', GroupController.nextBlock);

	// Rutas que pueden acceder solo usuarios autenticados y autorizados

	// Rutas para roles de 'isInstructor'

	app.post('/api/v1/instructor/group/create', GroupController.create);
	app.put('/api/v1/instructor/group/createroster', GroupController.createRoster);
	app.get('/api/v1/instructor/group/listroster', GroupController.listRoster);

	// Rutas para roles de 'isAuthor'

	app.get('/api/v1/course/listcategories', CourseController.listCategories);
	app.get('/api/v1/course/listcourses', CourseController.listCourses);
	app.post('/api/v1/author/course/create', CourseController.create);
	app.post('/api/v1/author/course/createblock', CourseController.createBlock);
	app.get('/api/v1/author/course/getblock', CourseController.getBlock);
	app.get('/api/v1/author/course/getblocklist', CourseController.getBlocklist);
	app.get('/api/v1/author/course/getblockby', CourseController.getBlockBy);
	app.get('/api/v1/author/course/get', CourseController.get);
	app.post('/api/v1/author/course/createquestionnarie', CourseController.createQuestionnarie);
	app.post('/api/v1/author/course/addquestions', CourseController.addQuestions);
	app.put('/api/v1/author/course/modify', CourseController.modify);
	app.put('/api/v1/author/course/makeavailable', CourseController.makeAvailable);
	app.post('/api/v1/author/file/upload', upload.single('file'), FileController.upload);
	app.get('/api/v1/author/file/download', FileController.download);

	// Rutas para roles de 'isAdmin'

	app.post('/api/v1/admin/org/register', OrgController.register);
	app.get('/api/v1/admin/user/list', UserController.list);
	app.get('/api/v1/admin/user/count', UserController.count);
	app.get('/api/v1/admin/org/list', OrgController.list);
	app.get('/api/v1/admin/orgunit/list', OrgUnitController.list);
	app.get('/api/v1/admin/org/getdetailsadmin', OrgController.getDetailsAdmin);
	app.get('/api/v1/admin/user/getroles', UserController.getRoles);
	app.put('/api/v1/admin/user/setroles', UserController.setRoles);

	// Rutas para roles de 'isOrg'

	app.post('/api/v1/orgadm/user/massiveregister', MassUsersController.massiveRegister);
	app.post('/api/v1/orgadm/orgunit/massiveregister', OrgUnitController.massiveRegister);
	app.post('/api/v1/orgadm/orgunit/register', OrgUnitController.register);
	app.get('/api/v1/orgadm/orgunit/list', OrgUnitController.list);
	app.get('/api/v1/orgadm/user/list', UserController.list);
	app.get('/api/v1/orgadm/user/count', UserController.count);
	app.get('/api/v1/orgadm/org/getdetails', OrgController.getDetails);
	app.post('/api/v1/orgadm/career/create', CareerController.create);
	app.post('/api/v1/orgadm/career/massivecreate', CareerController.massiveCreation);
	app.post('/api/v1/orgadm/term/create', TermController.create);
	app.post('/api/v1/orgadm/term/massivecreate', TermController.massiveCreation);


};
