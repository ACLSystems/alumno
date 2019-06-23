const GetNothing 						= require('../controllers/get_nothing'							);
const HelpController 				= require('../controllers/help_controller'					);
const ErrorMessController 	= require('../controllers/errmessage_controller'		);
const UserController 				= require('../controllers/user_controller'					);
const auth 									= require('./auth'																	);
const MassUsersController 	= require('../controllers/massiveUsers_Controller'	);
const OrgController 				= require('../controllers/org_controller'						);
const OrgUnitController 		= require('../controllers/orgUnit_controller'				);
const CourseController 			= require('../controllers/course_controller'				);
const GroupController 			= require('../controllers/group_controller'					);
const FileController 				= require('../controllers/file_controller'					);
const CareerController 			= require('../controllers/career_controller'				);
const TermController 				= require('../controllers/term_controller'					);
const DiscussionController 	= require('../controllers/discussion_controller'		);
const CertController 				= require('../controllers/certs_controller'					);
const ReportController 			= require('../controllers/report_controller'				);
const NotificationController = require('../controllers/notification_controller'	);
const FollowController 			= require('../controllers/follow_controller'				);
const logController 				= require('../controllers/log_controller'						);
const RequestController 		= require('../controllers/request_controller'				);
const SessionController			= require('../controllers/session_controller'				);
// const multer 								= require('multer'																	);
const ConfigController 			= require('../controllers/config_controller'				);
const CacheController 			= require('../controllers/cache_controller'					);
const JobController 				= require('../controllers/job_controller'						);
const WorkShiftController		= require('../controllers/workShifts_controller'		);
const ProjectController 		= require('../controllers/projects_controller'			);
// var dir 										= process.env.ORDIR;
// const fileSize 							= 1048576;
// const files 								= 1;

require('../shared/cache');

// if(!dir) {
// 	dir = '/usr/src/data/files';
// }

module.exports = (app) => {

	// app.all('/*', function(req, res, next) {
	// // CORS headers
	// 	res.header('Access-Control-Allow-Origin', '*'); // restrict it to the required domain
	// 	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	// 	// Set custom headers for CORS
	// 	res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
	// 	if (req.method == 'OPTIONS') {
	// 		res.status(200).end();
	// 	} else {
	// 		next();
	// 	}
	// });




	// MIDDLEWARE --------------------------------------------------------------------------

	// var upload = multer({
	// 	dest: dir,
	// 	limits: {
	// 		fileSize: fileSize,
	// 		files: files
	// 	}
	// });


	// Auth Middleware - This will check if the token is valid
	// Only the requests that start with /api/v1/* will be checked for the token.
	// Any URL's that do not follow the below pattern should be avoided unless you
	// are sure that authentication is not needed
	app.all	('/api/v1/*', 												[require('../controllers/validateRequest')]);
	app.all	('/api/user/*', 											[require('../controllers/validateParams')]);
	app.get ('/api/errorcodes',										[require('../controllers/validateParams')]);
	app.all	('/api/v1/user/*', 										[require('../controllers/shifts_controllers'),
		require('../controllers/validateParams')]);
	app.all	('/api/v1/course/*', 									[require('../controllers/validateParams')]);
	app.all	('/api/v1/author/course/*', 					[require('../controllers/validateParams')]);
	//app.all	('/api/v1/author/file/*', 						[require('../controllers/validateParams')]);
	app.all	('/api/v1/instructor/group/*',				[require('../controllers/validateParams')]);
	app.all	('/api/v1/orgadm/*', 									[require('../controllers/validateParams')]);
	app.all	('/api/orgunit/*', 										[require('../controllers/validateParams')]);
	app.all	('/api/course/*', 										[require('../controllers/validateParams')]);
	app.all ('/api/v1/supervisor/user/*',					[require('../controllers/validateParams')]);
	app.all ('/api/v1/requester/user/*',					[require('../controllers/validateParams')]);
	app.all ('/api/v1/requester/request/*', 			[require('../controllers/validateParams')]);

	// RUTAS ---------------------------------------------------------------------------------

	// Rutas que cualquiera puede acceder

	app.get ('/', 													GetNothing.greeting);
	app.get ('/perf', 											GetNothing.perf);
	app.post('/login', 											auth.login);
	app.post('/api/test', 									GroupController.test);
	app.post('/api/user/register', 					UserController.register);
	app.get ('/api/user/near', 							OrgUnitController.index);
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

	// Rutas que pueden acceder solo usuarios autenticados

	// Rutas para usuarios

	app.get ('/api/v1/user/myroles', 						UserController.myRoles);
	app.get ('/api/v1/user/getdetails', 				UserController.getDetails);
	app.put ('/api/v1/user/passwordchange', 		UserController.passwordChange);
	app.put ('/api/v1/user/modify', 						UserController.modify);
	app.get ('/api/v1/user/mygroups', 					GroupController.myGroups);
	app.get ('/api/v1/user/mygroup', 						GroupController.myGroup);
	app.put ('/api/v1/user/createattempt', 			GroupController.createAttempt);
	app.get ('/api/v1/user/testcreateattempt', 	GroupController.testCreateAttempt);
	app.get ('/api/v1/user/touchgrade', 				GroupController.touchGrade);
	app.get ('/api/v1/user/mygrades', 					GroupController.myGrades);
	app.get ('/api/v1/user/getgrade',						GroupController.getGrade);
	app.get ('/api/v1/user/nextblock', 					GroupController.nextBlock);
	app.get ('/api/v1/user/getresource', 				GroupController.getResource);
	app.post('/api/v1/user/comment/create', 		DiscussionController.create);
	app.get ('/api/v1/user/comment/get',				DiscussionController.get);
	app.put ('/api/v1/user/savetask', 					GroupController.saveTask);
	app.get ('/api/v1/user/tookcert', 					GroupController.tookCertificate);
	app.post('/api/v1/user/message/create',			NotificationController.create);
	app.get ('/api/v1/user/message/my',					NotificationController.myNotifications);
	app.get ('/api/v1/user/message/new',				NotificationController.newNotifications);
	app.put ('/api/v1/user/message/close', 			NotificationController.closeNotification);
	app.put ('/api/v1/user/message/reopen', 		NotificationController.reOpenNotification);
	app.post('/api/v1/user/follow/create', 			FollowController.create);
	app.get ('/api/v1/user/follow/myfollows',		FollowController.myFollows);
	app.put ('/api/v1/user/follow/delete', 			FollowController.delete);


	// Rutas que pueden acceder solo usuarios autenticados y autorizados

	// Rutas para roles de 'isInstructor'

	app.post('/api/v1/instructor/group/create', 					GroupController.create);
	app.get ('/api/v1/instructor/group/get',							GroupController.get);
	app.put ('/api/v1/instructor/group/modify',						GroupController.modify);
	app.get ('/api/v1/instructor/group/list', 						GroupController.list);
	app.get ('/api/v1/instructor/group/mylist', 					GroupController.myList);
	app.put ('/api/v1/instructor/group/createroster',			GroupController.createRoster);
	app.get ('/api/v1/instructor/group/listroster', 			GroupController.listRoster);
	//app.post('/api/v1/instructor/group/addstudent', 			GroupController.addStudent);
	app.get ('/api/v1/instructor/group/studenttask', 			GroupController.studentTask);
	app.get ('/api/v1/instructor/group/studentgrades',		GroupController.studentGrades);
	app.get ('/api/v1/instructor/group/studenthistoric',	GroupController.studentHistoric);
	app.put ('/api/v1/instructor/group/gradetask', 				GroupController.gradeTask);
	app.get ('/api/v1/instructor/group/userswogroup',			GroupController.usersWOGroup);
	app.get ('/api/v1/instructor/group/notify', 					GroupController.notify);
	app.get ('/api/v1/instructor/group/repairroster', 		GroupController.repairRoster);
	app.get ('/api/v1/instructor/group/sor',							GroupController.searchOrphanRoster);
	app.put ('/api/v1/instructor/group/savedates', 				GroupController.saveDates);
	app.put ('/api/v1/instructor/group/releasecert',			GroupController.releaseCert);

	// Rutas para roles de 'isAuthor'

	app.get ('/api/v1/course/listcategories', 						CourseController.listCategories);
	app.get ('/api/v1/course/listcourses', 								CourseController.listCourses);
	app.post('/api/v1/author/course/create', 							CourseController.create);
	app.post('/api/v1/author/course/createblock', 				CourseController.createBlock);
	app.put ('/api/v1/author/course/modifyblock', 				CourseController.modifyBlock);
	app.get ('/api/v1/author/course/getblock', 						CourseController.getBlock);
	app.get ('/api/v1/author/course/getblocklist', 				CourseController.getBlocklist);
	app.get ('/api/v1/author/course/getblockby', 					CourseController.getBlockBy);
	app.get ('/api/v1/author/course/get', 								CourseController.get);
	app.put ('/api/v1/author/course/newsection', 					CourseController.newSection);
	app.put ('/api/v1/author/course/setnextsection', 			CourseController.setNextSection);
	app.post('/api/v1/author/course/createquestionnarie', CourseController.createQuestionnarie);
	app.post('/api/v1/author/course/createtasks', 				CourseController.createTasks);
	app.get ('/api/v1/author/course/getquestionnarie', 		CourseController.getQuestionnarie);
	app.put ('/api/v1/author/course/removequestionnarie', CourseController.removeQuestionnarie);
	app.post('/api/v1/author/course/addquestions', 				CourseController.addQuestions);
	app.put ('/api/v1/author/course/modify', 							CourseController.modify);
	app.put ('/api/v1/author/course/moveblock', 					CourseController.moveBlock);
	app.put	('/api/v1/author/course/setblockorder', 			CourseController.setBlockOrder);
	app.put ('/api/v1/author/course/makeavailable', 			CourseController.makeAvailable);
	app.post('/api/v1/author/course/createresource', 			CourseController.createResource);
	app.put ('/api/v1/author/course/modifyresource',			CourseController.modifyResource);
	app.get ('/api/v1/author/course/getresource', 				CourseController.getResource);
	app.post('/api/v1/author/course/createdependency', 		CourseController.createDependency);
	app.put ('/api/v1/author/course/clone',								CourseController.clone);


	// Rutas para roles de 'isAdmin'

	app.post('/api/v1/admin/org/register', 				OrgController.register);
	app.post('/api/v1/admin/user/register', 			UserController.register);
	app.post('/api/v1/admin/config/create',				ConfigController.create);
	app.get ('/api/v1/admin/user/list', 					UserController.list);
	app.get ('/api/v1/admin/user/get', 						MassUsersController.get);
	app.get ('/api/v1/admin/user/minget', 				MassUsersController.minimalGet);
	app.get ('/api/v1/admin/user/count', 					UserController.count);
	app.get ('/api/v1/admin/org/list', 						OrgController.list);
	app.get ('/api/v1/admin/orgunit/list', 				OrgUnitController.list);
	app.get ('/api/v1/admin/orgunit/get', 				OrgUnitController.get);
	app.get ('/api/v1/admin/org/getdetailsadmin', OrgController.getDetailsAdmin);
	app.get ('/api/v1/admin/user/getroles', 			UserController.getRoles);
	app.put ('/api/v1/admin/user/setroles', 			UserController.setRoles);
	app.get ('/api/v1/admin/user/encrypt', 				UserController.encrypt);
	app.get ('/api/v1/admin/user/validate', 			UserController.validateUsers);
	app.get ('/api/v1/admin/group/repair',				GroupController.repairGroup);
	app.get ('/api/v1/admin/group/repairtir',			GroupController.repairTasksInRoster);
	app.put ('/api/v1/admin/user/passwordreset',  UserController.adminPasswordReset);
	app.put ('/api/v1/admin/user/changeuser', 		UserController.changeUser);
	app.put ('/api/v1/admin/user/correctusers', 	UserController.correctUsers);
	app.get ('/api/v1/admin/certs/rosters', 			GroupController.addCertToRoster);
	app.get ('/api/v1/admin/log/read', 						logController.read);
	app.get ('/api/v1/admin/error/get', 					ErrorMessController.get);
	app.put ('/api/v1/admin/error/close', 				ErrorMessController.close);
	app.put ('/api/v1/admin/error/closeseveral', 	ErrorMessController.closeSeveral);
	app.put ('/api/v1/admin/user/modrs',					GroupController.modifyRosterStatus);
	app.put ('/api/v1/admin/user/resetattempt', 	GroupController.resetAttempt);
	app.put ('/api/v1/admin/user/setgrade', 			GroupController.setGrade);
	app.get ('/api/v1/admin/user/valpwd', 				UserController.validatePassword);
	app.put ('/api/v1/admin/group/setrubric',			GroupController.setRubric);
	app.get ('/api/v1/admin/sessions',						SessionController.users);
	app.get ('/api/v1/admin/sessiondetails',			SessionController.userSessionDetails);
	app.delete ('/api/v1/admin/log/truncate', 		logController.truncate);
	app.delete ('/api/v1/admin/:name/delete', 		UserController.delete);
	app.get ('/api/v1/admin/cache/flushall', 			CacheController.flushall);
	app.post('/api/v1/admin/job/create', 					JobController.create);
	app.get ('/api/v1/admin/job/get', 						JobController.get);
	app.put ('/api/v1/admin/job/activate', 				JobController.activate);
	app.post('/api/v1/admin/proyect/create', 			ProjectController.create);
	app.get ('/api/v1/admin/proyect/list', 				ProjectController.list);
	app.put ('/api/v1/admin/group/change', 				GroupController.changeCourse);
	app.put ('/api/v1/admin/group/addblockdates', GroupController.addBlockDates);
	app.put ('/api/v1/admin/group/changetutor',   GroupController.changeInstructor);

	// Rutas para roles de 'isOrg'

	app.post('/api/v1/orgadm/user/massiveregister', 		MassUsersController.massiveRegister);
	app.post('/api/v1/orgadm/orgunit/massiveregister', 	OrgUnitController.massiveRegister);
	app.post('/api/v1/orgadm/orgunit/register', 				OrgUnitController.register);
	app.get ('/api/v1/orgadm/orgunit/list', 						OrgUnitController.list);
	app.get ('/api/v1/orgadm/user/list', 								UserController.list);
	app.get ('/api/v1/orgadm/user/count', 							UserController.count);
	app.put ('/api/v1/orgadm/user/passwordreset', 			UserController.adminPasswordReset);
	app.get ('/api/v1/orgadm/org/getdetails', 					OrgController.getDetails);
	app.post('/api/v1/orgadm/career/create', 						CareerController.create);
	app.post('/api/v1/orgadm/career/massivecreate',			CareerController.massiveCreation);
	app.post('/api/v1/orgadm/term/create', 							TermController.create);
	app.post('/api/v1/orgadm/term/massivecreate', 			TermController.massiveCreation);
	app.get ('/api/v1/orgadm/report/totalusers', 				ReportController.totalUsers);
	app.get ('/api/v1/orgadm/report/usersbyou', 				ReportController.usersByOrgUnit);
	app.post('/api/v1/orgadm/shift/create',							WorkShiftController.create);
	app.get ('/api/v1/orgadm/shift/list', 							WorkShiftController.list);

	// Rutas para roles de 'isSupervisor'

	app.get ('/api/v1/supervisor/report/gradesbycampus',	ReportController.gradesByCampus);
	app.get ('/api/v1/supervisor/report/percentil',				ReportController.percentil);
	app.get ('/api/v1/supervisor/report/rostersummary', 	ReportController.rosterSummary);
	app.get ('/api/v1/supervisor/report/gradesbygroup', 	ReportController.gradesByGroup);
	app.get ('/api/v1/supervisor/report/orgtree', 				ReportController.orgTree);
	app.get ('/api/v1/supervisor/report/userswoactivity',	GroupController.usersWOActivity);
	app.get ('/api/v1/supervisor/report/groupsquery', 		ReportController.groupsQuery);
	app.get ('/api/v1/supervisor/report/minicube', 				ReportController.minicube);
	app.get ('/api/v1/supervisor/report/minicubet', 			ReportController.minicubeT);
	app.get ('/api/v1/supervisor/report/minicubep', 			ReportController.minicubeP);
	app.get ('/api/v1/supervisor/report/listroster', 			ReportController.listRoster);
	app.get ('/api/v1/supervisor/user/get', 							MassUsersController.get);
	app.get ('/api/v1/supervisor/user/getdetails',				UserController.getDetailsSuper);
	app.get ('/api/v1/supervisor/user/settracking', 			GroupController.setTracking);
	app.get ('/api/v1/supervisor/user/gethistory', 				ReportController.studentHistory);
	app.get ('/api/v1/supervisor/user/getgroups', 				GroupController.getGroups);
	app.get ('/api/v1/supervisor/user/getgroupsbyrfc', 		GroupController.getGroupsByRFC);
	app.put ('/api/v1/supervisor/user/passwordreset', 		UserController.adminPasswordReset);
	app.put ('/api/v1/supervisor/user/changeuser', 				UserController.changeUser);
	app.post('/api/v1/supervisor/user/masssearch',				ReportController.userMassSearch);
	app.post('/api/v1/supervisor/user/massiveregister', 	MassUsersController.massiveRegister);
	app.get ('/api/v1/supervisor/group/getfilelist', 			ReportController.filesBygroup);
	app.get ('/api/v1/supervisor/group/list', 						GroupController.list);
	app.get ('/api/v1/supervisor/group/get',							GroupController.get);
	app.get ('/api/v1/supervisor/group/listroster', 			GroupController.listRoster);
	app.get ('/api/v1/supervisor/group/notify', 					GroupController.notify);
	app.get ('/api/v1/supervisor/group/studentgrades',		GroupController.studentGrades);
	app.get ('/api/v1/supervisor/group/studenthistoric',	GroupController.studentHistoric);
	app.get ('/api/v1/supervisor/group/userscube', 				SessionController.usersCube);
	app.put ('/api/v1/supervisor/group/savedates', 				GroupController.saveDates);

	// Rutas para solicitudes
	app.get ('/api/v1/requester/report/groupsquery', 			ReportController.groupsQuery); //También supervisor OK
	app.post('/api/v1/requester/group/create', 						GroupController.create);
	app.get ('/api/v1/requester/group/get',								GroupController.get); //También supervisor OK
	app.put ('/api/v1/requester/group/modify',						GroupController.modify);
	app.get ('/api/v1/requester/group/list', 							GroupController.list); //También supervisor OK
	app.get ('/api/v1/requester/group/listroster', 				GroupController.listRoster); //También supervisor OK
	app.get ('/api/v1/requester/user/getdetails',					UserController.getDetailsSuper); //También supervisor OK
	app.put ('/api/v1/requester/group/createroster',			GroupController.createRoster);
	app.post('/api/v1/requester/user/muir',								MassUsersController.muir);
	app.post('/api/v1/requester/request/create',					RequestController.create);
	app.get ('/api/v1/requester/request/get',							RequestController.get);
	app.get ('/api/v1/requester/request/my',							RequestController.my);
	app.put ('/api/v1/requester/request/finish', 					RequestController.finish);
	app.put ('/api/v1/requester/request/cancel', 					RequestController.cancel);
	app.put ('/api/v1/requester/request/modify', 					RequestController.modify);
	app.post('/api/v1/requester/request/sendemail', 			RequestController.sendEmail);
	app.post('/api/v1/requester/request/setpayment', 			RequestController.setPayment);
	app.get ('/api/v1/requester/fiscal/list',							UserController.listFiscals);

	// Rutas para archivos

	// app.post('/api/v1/file/upload', 	upload.single('file'), FileController.upload);
	app.get ('/api/v1/file/download', FileController.download);

};
