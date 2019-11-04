const UserController 				= require('../controllers/user_controller'					);
const MassUsersController 	= require('../controllers/massiveUsers_Controller'	);
const GroupController 			= require('../controllers/group_controller'					);
const ReportController 			= require('../controllers/report_controller'				);
const RequestController 		= require('../controllers/request_controller'				);

module.exports = (app) => {

	app.all ('/api/v1/requester/user/*',					[require('../middleware/validateParams')]);
	app.all ('/api/v1/requester/request/*', 			[require('../middleware/validateParams')]);

	// RUTAS ---------------------------------------------------------------------------------

	// USERS
	app.get ('/api/v1/requester/user/getdetails',					UserController.getDetailsSuper);
	app.get ('/api/v1/requester/fiscal/list',							UserController.listFiscals);
	// USERS MASSIVE
	app.post('/api/v1/requester/user/muir',								MassUsersController.muir);
	// GROUPS
	app.post('/api/v1/requester/group/create', 						GroupController.create);
	app.get ('/api/v1/requester/group/get',								GroupController.get);
	app.put ('/api/v1/requester/group/modify',						GroupController.modify);
	app.get ('/api/v1/requester/group/list', 							GroupController.list);
	app.get ('/api/v1/requester/group/listroster', 				GroupController.listRoster);
	app.put ('/api/v1/requester/group/createroster',			GroupController.createRoster);
	// REQUESTS
	app.post('/api/v1/requester/request/create',					RequestController.create);
	app.get ('/api/v1/requester/request/get',							RequestController.get);
	app.get ('/api/v1/requester/request/my',							RequestController.my);
	app.put ('/api/v1/requester/request/finish', 					RequestController.finish);
	app.put ('/api/v1/requester/request/cancel', 					RequestController.cancel);
	app.put ('/api/v1/requester/request/modify', 					RequestController.modify);
	app.post('/api/v1/requester/request/sendemail', 			RequestController.sendEmail);
	app.post('/api/v1/requester/request/setpayment', 			RequestController.setPayment);
	// REPORTS
	app.get ('/api/v1/requester/report/groupsquery', 			ReportController.groupsQuery);
	app.patch('/api/v1/requester/folio', 									RequestController.setFolios);
};
