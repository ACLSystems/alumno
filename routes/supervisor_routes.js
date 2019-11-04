const UserController 				= require('../controllers/user_controller'					);
const MassUsersController 	= require('../controllers/massiveUsers_Controller'	);
const GroupController 			= require('../controllers/group_controller'					);
const ReportController 			= require('../controllers/report_controller'				);
const ProjectController 		= require('../controllers/projects_controller'			);
const SessionController			= require('../controllers/session_controller'				);

module.exports = (app) => {

	app.all ('/api/v1/supervisor/user/*',					[require('../middleware/validateParams')]);

	// RUTAS ---------------------------------------------------------------------------------

	// USERS
	app.get ('/api/v1/supervisor/user/getdetails',				UserController.getDetailsSuper);
	app.put ('/api/v1/supervisor/user/passwordreset', 		UserController.adminPasswordReset);
	app.put ('/api/v1/supervisor/user/changeuser', 				UserController.changeUser);
	// USERS MASSIVE
	app.get ('/api/v1/supervisor/user/get', 							MassUsersController.get);
	app.post('/api/v1/supervisor/user/massiveregister', 	MassUsersController.massiveRegister);
	// GROUPS
	app.get ('/api/v1/supervisor/group/list', 						GroupController.list);
	app.get ('/api/v1/supervisor/group/get',							GroupController.get);
	app.get ('/api/v1/supervisor/group/listroster', 			GroupController.listRoster);
	app.get ('/api/v1/supervisor/group/notify', 					GroupController.notify);
	app.get ('/api/v1/supervisor/group/studentgrades',		GroupController.studentGrades);
	app.get ('/api/v1/supervisor/group/studenthistoric',	GroupController.studentHistoric);
	app.put ('/api/v1/supervisor/group/savedates', 				GroupController.saveDates);
	// GROUPS REPORT
	app.get ('/api/v1/supervisor/report/userswoactivity',	GroupController.usersWOActivity);
	// GROUPS USER
	app.get ('/api/v1/supervisor/user/settracking', 			GroupController.setTracking);
	app.get ('/api/v1/supervisor/user/getgroups', 				GroupController.getGroups);
	app.get ('/api/v1/supervisor/user/getgroupsbyrfc', 		GroupController.getGroupsByRFC);
	// REPORTS
	app.get ('/api/v1/supervisor/report/gradesbycampus',	ReportController.gradesByCampus);
	app.get ('/api/v1/supervisor/report/percentil',				ReportController.percentil);
	app.get ('/api/v1/supervisor/report/rostersummary', 	ReportController.rosterSummary);
	app.get ('/api/v1/supervisor/report/gradesbygroup', 	ReportController.gradesByGroup);
	app.get ('/api/v1/supervisor/report/orgtree', 				ReportController.orgTree);
	app.get ('/api/v1/supervisor/report/groupsquery', 		ReportController.groupsQuery);
	app.get ('/api/v1/supervisor/report/minicube', 				ReportController.minicube);
	app.get ('/api/v1/supervisor/report/minicubet', 			ReportController.minicubeT);
	app.get ('/api/v1/supervisor/report/minicubep', 			ReportController.minicubeP);
	app.get ('/api/v1/supervisor/report/listroster', 			ReportController.listRoster);
	app.get ('/ap1/v1/supervisor/report/eval', 						ReportController.repEval);
	// REPORTS USER
	app.get ('/api/v1/supervisor/user/gethistory', 				ReportController.studentHistory);
	app.post('/api/v1/supervisor/user/masssearch',				ReportController.userMassSearch);
	// REPORTS GROUP
	app.get ('/api/v1/supervisor/group/getfilelist', 			ReportController.filesBygroup);
	// PROJECTS
	app.get ('/api/v1/supervisor/projects', 							ProjectController.my);
	app.put ('/api/v1/supervisor/projects/current', 			ProjectController.current);
	// SESSION GROUP
	app.get ('/api/v1/supervisor/group/userscube', 				SessionController.usersCube);

};
