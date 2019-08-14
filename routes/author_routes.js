const Validator 				= require('express-route-validator');
const StatusCodes 			= require('http-status-codes');
const CourseController 	= require('../controllers/course_controller'	);

module.exports = (app) => {

	/**
		* Cambiar las siguientes rutas a Validator
	*/
	app.all	('/api/v1/course/*', 									[require('../controllers/validateParams')]);
	//app.all	('/api/v1/author/course/*', 					[require('../controllers/validateParams')]);

	/** @api {listcategories} /
		* @apiName listCategories
		* @apiPermission none
		* @apiGroup none
		*/

	app.get ('/api/v1/course/listcategories', 						CourseController.listCategories);
	app.get ('/api/v1/course/listcourses', 								CourseController.listCourses);


	app.post('/api/v1/author/course/create', 							CourseController.create);
	app.post('/api/v1/author/course/createblock', 				CourseController.createBlock);
	app.put ('/api/v1/author/course/modifyblock', 				CourseController.modifyBlock);
	app.get ('/api/v1/author/course/getblock', 						CourseController.getBlock);
	app.get ('/api/v1/author/course/getblocklist', 				CourseController.getBlocklist);
	app.get ('/api/v1/author/course/getblockby', 					CourseController.getBlockBy);
	app.get ('/api/v1/author/course/get', 								CourseController.get);

	/** @api {addSection} /
		* @apiName addSection
		* @apiPermission author
		* @apiGroup author
		* @param coursecode {String}
		* @param section {Number}
		*/
	app.put ('/api/v1/author/course/:coursecode/addsection/:section',
		Validator.validate({
			params: {
				coursecode: { isRequired:true },
				section: { isRequired: true }
			},
			errorHandler: function(err,req,res){
				let returnMessage = {
					message: 'Error: se requiere cualquiera de las siguientes propiedades',
					coursecode: req.params.coursecode || 'FALTA {String}',
					section: req.params.section || 'FALTA {Number}'
				};
				res.status(StatusCodes.BAD_REQUEST).json(returnMessage);
				return;
			}
		}),
		CourseController.addSection);

	/** @api {addSection} /
		* @apiName addSection
		* @apiPermission author
		* @apiGroup author
		* @param coursecode {String}
		* @param section {Number}
		*/
	app.put ('/api/v1/author/course/:coursecode/modsection/:section/:newsection',
		Validator.validate({
			params: {
				coursecode: { isRequired:true },
				section: { isRequired: true },
				newsection: {isRequired: true}
			},
			errorHandler: function(err,req,res){
				let returnMessage = {
					message: 'Error: se requiere cualquiera de las siguientes propiedades',
					coursecode: req.params.coursecode || 'FALTA {String}',
					section: req.params.section || 'FALTA {Number}',
					newsection: req.params.newsection || 'FALTA {Number}'
				};
				res.status(StatusCodes.BAD_REQUEST).json(returnMessage);
				return;
			}
		}),
		CourseController.modifySection);

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
};
