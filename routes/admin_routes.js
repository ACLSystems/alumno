const ErrorMessController 	= require('../controllers/errmessage_controller'		);
const UserController 				= require('../controllers/user_controller'					);
const MassUsersController 	= require('../controllers/massiveUsers_Controller'	);
const OrgController 				= require('../controllers/org_controller'						);
const GroupController 			= require('../controllers/group_controller'					);
const ReportController 			= require('../controllers/report_controller'				);
const logController 				= require('../controllers/log_controller'						);
const SessionController			= require('../controllers/session_controller'				);
const ConfigController 			= require('../controllers/config_controller'				);
const CacheController 			= require('../controllers/cache_controller'					);
const JobController 				= require('../controllers/job_controller'						);
const ProjectController 		= require('../controllers/projects_controller'			);
const SocketConstroller 		= require('../controllers/socket_controller');
const DefaultController 		= require('../controllers/default_controller');
const InstanceController		= require('../controllers/instance_controller');

module.exports = (app) => {

	// RUTAS ---------------------------------------------------------------------------------


	// CONFIG
	app.post('/api/v1/admin/config/create',				ConfigController.create);
	// ORG
	app.post('/api/v1/admin/org/register', 				OrgController.register);
	app.get ('/api/v1/admin/org/list', 						OrgController.list);
	app.get ('/api/v1/admin/org/get', 						OrgController.getDetailsAdmin);
	// ORGUNIT
	// app.get ('/api/v1/admin/orgunit/list', 		OrgUnitController.list); <--- Esta le pertenece a isOrg
	// app.get ('/api/v1/admin/orgunit/get', 			OrgUnitController.get); <--- Esta le pertenece a isOrg
	// USERS
	app.post('/api/v1/admin/user/register', 			UserController.register);
	app.get ('/api/v1/admin/user/list', 					UserController.list);
	app.get ('/api/v1/admin/user/getdetails',			UserController.getDetailsSuper);
	app.get ('/api/v1/admin/user/count', 					UserController.count);
	app.put ('/api/v1/admin/user/modify', 				UserController.modify);
	app.get ('/api/v1/admin/user/getroles', 			UserController.getRoles);
	app.put ('/api/v1/admin/user/setroles', 			UserController.setRoles);
	app.get ('/api/v1/admin/user/encrypt', 				UserController.encrypt);
	app.get ('/api/v1/admin/user/validate', 			UserController.validateUsers);
	app.put ('/api/v1/admin/user/passwordreset',  UserController.adminPasswordReset);
	app.put ('/api/v1/admin/user/changeuser', 		UserController.changeUser);
	app.put ('/api/v1/admin/user/correctusers', 	UserController.correctUsers);
	app.get ('/api/v1/admin/user/valpwd', 				UserController.validatePassword);
	app.delete ('/api/v1/admin/user/:name/delete', 		UserController.delete);
	app.put ('/api/v1/admin/user/actas', 					UserController.actAs);
	// MASS USERS
	app.get ('/api/v1/admin/user/minget', 				MassUsersController.minimalGet);
	app.get ('/api/v1/admin/user/get', 						MassUsersController.get);
	// USERS - GROUP
	app.put ('/api/v1/admin/user/modrs',					GroupController.modifyRosterStatus);
	app.put ('/api/v1/admin/user/resetattempt', 	GroupController.resetAttempt);
	app.put ('/api/v1/admin/user/setgrade', 			GroupController.setGrade);
	// GROUPS
	app.get ('/api/v1/admin/group/repair',				GroupController.repairGroup);
	app.get ('/api/v1/admin/group/repairtir',			GroupController.repairTasksInRoster);
	app.put ('/api/v1/admin/repairrosv2', 				GroupController.repairRosterV2);
	app.put ('/api/v1/admin/group/setrubric',			GroupController.setRubric);
	app.put ('/api/v1/admin/group/change', 				GroupController.changeCourse);
	app.put ('/api/v1/admin/group/addblockdates', GroupController.addBlockDates);
	app.put ('/api/v1/admin/group/changetutor',   GroupController.changeInstructor);
	app.put ('/api/v1/admin/group/moveroster', 		GroupController.moveRoster);
	app.put ('/api/v1/admin/group/unreport', 			ReportController.unReport);
	app.get ('/api/v1/admin/certs/rosters', 			GroupController.addCertToRoster);
	// LOGS
	app.get ('/api/v1/admin/log/read', 						logController.read);
	app.delete ('/api/v1/admin/log/truncate', 		logController.truncate);
	// ERRORS
	app.get ('/api/v1/admin/error/get', 					ErrorMessController.get);
	app.put ('/api/v1/admin/error/close', 				ErrorMessController.close);
	app.put ('/api/v1/admin/error/closeseveral', 	ErrorMessController.closeSeveral);
	// SESSIONS
	app.get ('/api/v1/admin/sessions',						SessionController.users);
	app.get ('/api/v1/admin/sessiondetails',			SessionController.userSessionDetails);
	// CACHE
	app.get ('/api/v1/admin/cache/flushall', 			CacheController.flushall);
	// JOBS
	app.post('/api/v1/admin/job/create', 					JobController.create);
	app.get ('/api/v1/admin/job/get', 						JobController.get);
	app.put ('/api/v1/admin/job/activate', 				JobController.activate);
	// PROJECTS
	app.post('/api/v1/admin/proyect/create', 			ProjectController.create);
	app.get ('/api/v1/admin/proyect/list', 				ProjectController.list);
	app.get ('/api/v1/admin/roster/migrate', 			GroupController.rosterMigrateV2);
	app.post('/api/v1/admin/message', 						SocketConstroller.sendMessage);
	app.post('/api/v1/admin/default', 						DefaultController.create);
	app.get ('/api/v1/admin/defaults', 						DefaultController.list);
	app.post('/api/v1/admin/instance',
		InstanceController.create
	);
	app.get('/api/v1/admin/instances',
		InstanceController.list
	);
};
