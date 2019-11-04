const UserController 				= require('../controllers/user_controller'					);
const MassUsersController 	= require('../controllers/massiveUsers_Controller'	);
const OrgController 				= require('../controllers/org_controller'						);
const OrgUnitController 		= require('../controllers/orgUnit_controller'				);
const CareerController 			= require('../controllers/career_controller'				);
const TermController 				= require('../controllers/term_controller'					);
const ReportController 			= require('../controllers/report_controller'				);
const WorkShiftController		= require('../controllers/workShifts_controller'		);

require('../shared/cache');

module.exports = (app) => {

	app.all	('/api/v1/orgadm/*', 									[require('../middleware/validateParams')]);

	// RUTAS ---------------------------------------------------------------------------------

	// ORG
	app.get ('/api/v1/orgadm/org/getdetails', 					OrgController.getDetails);
	// ORGUNIT
	app.post('/api/v1/orgadm/orgunit/massiveregister', 	OrgUnitController.massiveRegister);
	app.post('/api/v1/orgadm/orgunit/register', 				OrgUnitController.register);
	app.get ('/api/v1/orgadm/orgunit/list', 						OrgUnitController.list);
	app.get ('/api/v1/orgadm/orgunit/get', 							OrgUnitController.get);
	// CAREER
	app.post('/api/v1/orgadm/career/create', 						CareerController.create);
	app.post('/api/v1/orgadm/career/massivecreate',			CareerController.massiveCreation);
	// TERM
	app.post('/api/v1/orgadm/term/create', 							TermController.create);
	app.post('/api/v1/orgadm/term/massivecreate', 			TermController.massiveCreation);
	// USERS
	app.get ('/api/v1/orgadm/user/list', 								UserController.list);
	app.get ('/api/v1/orgadm/user/count', 							UserController.count);
	app.put ('/api/v1/orgadm/user/passwordreset', 			UserController.adminPasswordReset);
	// MASSIVE USERS
	app.post('/api/v1/orgadm/user/massiveregister', 		MassUsersController.massiveRegister);
	// REPORTS
	app.get ('/api/v1/orgadm/report/totalusers', 				ReportController.totalUsers);
	app.get ('/api/v1/orgadm/report/usersbyou', 				ReportController.usersByOrgUnit);
	// SHIFTS
	app.post('/api/v1/orgadm/shift/create',							WorkShiftController.create);
	app.get ('/api/v1/orgadm/shift/list', 							WorkShiftController.list);

};
