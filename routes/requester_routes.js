const UserController 				= require('../controllers/user_controller'					);
const MassUsersController 	= require('../controllers/massiveUsers_Controller'	);
const GroupController 			= require('../controllers/group_controller'					);
const ReportController 			= require('../controllers/report_controller'				);
const RequestController 		= require('../controllers/request_controller'				);
const Validate = require('../middleware/validateRequester');

module.exports = (app) => {

	app.all ('/api/v1/requester/user/*',					[require('../middleware/validateParams')]);
	app.all ('/api/v1/requester/request/*', 			[require('../middleware/validateParams')]);

	// RUTAS ---------------------------------------------------------------------------------

	// USERS
	app.get ('/api/v1/requester/user/getdetails',
		UserController.getDetailsSuper
	);
	app.get ('/api/v1/requester/fiscal/list',
		UserController.listFiscals
	);
	// USERS MASSIVE
	app.post('/api/v1/requester/user/muir',
		MassUsersController.muir
	);
	// GROUPS
	app.post('/api/v1/group',
		Validate.create,
		Validate.results,
		GroupController.create
	);
	app.get ('/api/v1/group/:groupid',
		Validate.get,
		Validate.results,
		GroupController.get
	);
	app.patch ('/api/v1/group/:groupid',
		Validate.get,
		Validate.results,
		GroupController.modify
	);
	app.get ('/api/v1/groups',
		GroupController.list
	);
	app.get ('api/v1/groups/:ou',
		GroupController.listGroups
	);
	app.get ('/api/v1/groups/:ou/:course',
		Validate.listGroups,
		Validate.results,
		GroupController.listGroups
	);
	app.get ('/api/v1/roster/:groupid',
		Validate.get,
		Validate.results,
		GroupController.listRoster
	);

	app.post ('/api/v1/roster/:groupid',
		Validate.get,
		Validate.results,
		GroupController.createRoster
	);

	app.patch('/api/v1/tr/:username',
		UserController.resetTokens
	);

	app.get ('/api/v1/validateinstructor/:name',
		Validate.validateInstructor,
		Validate.results,
		UserController.validateInstructor
	);

	app.patch ('/api/v1/group/:groupid/changetutor/:tutorid',
		Validate.changeInstructor,
		Validate.results,
		GroupController.changeInstructor
	);

	app.get ('/api/v1/rubric/:groupid',
		Validate.getRubric,
		Validate.results,
		GroupController.getRubric
	);

	app.patch ('/api/v1/rubric/:groupid',
		Validate.resetRubric,
		Validate.results,
		GroupController.setRubric
	);

	app.patch ('/api/v1/rubric/:groupid/reset',
		Validate.resetRubric,
		Validate.results,
		GroupController.resetRubric
	);

	app.get ('/api/v1/rubric/:groupid/sync',
		GroupController.syncRubric
	);

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
