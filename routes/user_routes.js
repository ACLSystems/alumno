const UserController 				= require('../controllers/user_controller'					);
const AuthMiddleware 				= require('../middleware/auth'											);
const GroupController 			= require('../controllers/group_controller'					);
const DiscussionController 	= require('../controllers/discussion_controller'		);
const NotificationController = require('../controllers/notification_controller'	);
const FollowController 			= require('../controllers/follow_controller'				);

require('../shared/cache');

module.exports = (app) => {

	// Este middleware además validará si el usuario entra en un horario diferente
	app.all	('/api/v1/user/*', 										[require('../controllers/shifts_controllers'),
		require('../middleware/validateParams')]);

	// RUTAS ---------------------------------------------------------------------------------

	// Rutas para usuarios

	app.post('/api/v1/user/logout', 						AuthMiddleware.logout);
	app.post('/api/v1/user/logoutall', 					AuthMiddleware.logoutAll);
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
	app.put ('/api/v1/user/savetask', 					GroupController.saveTask);
	app.get ('/api/v1/user/tookcert', 					GroupController.tookCertificate);
	app.post('/api/v1/user/comment/create', 		DiscussionController.create);
	app.get ('/api/v1/user/comment/get',				DiscussionController.get);
	app.post('/api/v1/user/message/create',			NotificationController.create);
	app.get ('/api/v1/user/message/my',					NotificationController.myNotifications);
	app.get ('/api/v1/user/message/new',				NotificationController.newNotifications);
	app.get ('/api/v1/user/message', NotificationController.getNotification);
	app.put ('/api/v1/user/message/close', 			NotificationController.closeNotification);
	app.put ('/api/v1/user/message/reopen', 		NotificationController.reOpenNotification);
	app.post('/api/v1/user/follow/create', 			FollowController.create);
	app.get ('/api/v1/user/follow/myfollows',		FollowController.myFollows);
	app.put ('/api/v1/user/follow/delete', 			FollowController.delete);
	app.get ('/api/v1/user/certtemplate', 			GroupController.certTemplate);
	app.get ('/api/v1/user/valemailwopr', 			UserController.validateEmailWithoutPasswordReset);
	app.post('/api/v1/user/confirmemail', 			UserController.confirmEmail);
	app.post('/api/v1/user/validatemaindata',		UserController.validateUserMaindata);
};
