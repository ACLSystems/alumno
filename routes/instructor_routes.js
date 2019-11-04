const GroupController 			= require('../controllers/group_controller'					);

require('../shared/cache');

module.exports = (app) => {

	app.all	('/api/v1/instructor/group/*',				[require('../middleware/validateParams')]);


	// RUTAS ---------------------------------------------------------------------------------

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

};
