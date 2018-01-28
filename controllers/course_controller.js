const winston = require('winston');
const User = require('../src/users');
const Course = require('../src/courses');
const Category = require('../src/categories');
//const Org = require('../src/orgs');
//const OrgUnit = require('../src/orgUnits');
//const permissions = require('../shared/permissions');
require('winston-daily-rotate-file');

var transport = new(winston.transports.DailyRotateFile) ({
	filename: './logs/log',
	datePattern: 'yyyy-MM-dd.',
	prepend: true,
	localTime: true,
	level: process.env.ENV === 'development' ? 'debug' : 'info'
});

var logger = new(winston.Logger) ({
	transports: [
		transport
	]
});


module.exports = {
	create(req,res) {
		var key = req.headers.key;
		var course = req.body;
		User.findOne({ name: key })
			.populate('org')
			.populate('orgUnit')
			.then((user) => {
				const date = new Date();
				course.org = user.org.name,
				course.own = {
					user: user.name,
					org: user.org.name,
					orgUnit: user.orgUnit.name
				};
				course.mod = {
					by: user.name,
					when: date,
					what: 'Course Creation'
				};
				course.perm = {
					users: [{ name: user.name, canRead: true, canModify: true, canSec: true }],
					roles: [{ name: 'isAuthor', canRead: true, canModify: false, canSec: false},
						{ name: 'isOrgContent', canRead: true, canModify: false, canSec: true}],
					orgs: [{ name: user.org.name, canRead: true, canModify: false, canSec: false}],
					orgUnits: [{ name: user.orgUnit.name, canRead: true, canModify: true, canSec: false}]
				};
				course.status = 'Draft';
				Course.create(course)
					.then(() => {
						course.categories.forEach( function(cat) {
							//console.log(cat); // eslint-disable-line
							Category.findOne({ name: cat })
								.then((cat_found) => {
									//console.log(cat_found); // eslint-disable-line
									if(!cat_found){
										//console.log('aca ando'); // eslint-disable-line
										const category = new Category({
											name: cat,
											isVisible: true,
											org: user.org.name
										});
										category.save()
											.catch((err) => {
												sendError(res,err,'listCategories -- Course category creation --');
											});
									}
								})
								.catch((err) => {
									sendError(res,err,'listCategories -- Course Category Finding --');
								});
						}); // foreach
						res.status(201).json({
							'status': 201,
							'message': 'Course - ' + course.title + '- -' + course.code + '- created'
						});
					})
					.catch((err) => {
						sendError(res,err,'listCategories -- Course Creation --');
					});

			})
			.catch((err) => {
				sendError(res,err,'Create -- Finding User --');
			});
	}, // fin del create

	listCategories(req,res) {
		var sort = { name: 1 };
		var skip = 0;
		var limit = 15;
		if(req.query.sort) { sort = { name: req.query.sort }; }
		if(req.query.skip) { skip = parseInt( req.query.skip ); }
		if(req.query.limit) { limit = parseInt( req.query.limit ); }
		var key = req.headers.key;
		User.findOne({ name: key })
			.populate('org')
			.then((user) => {
				Category.find({ org: user.org.name })
					.sort(sort)
					.skip(skip)
					.limit(limit)
					.then((cats) => {
						var send_cats = new Array();
						cats.forEach(function(cat) {
							send_cats.push(cat.name);
						});
						res.status(200).json({
							'status': 201,
							'message': send_cats
						});
					})
					.catch((err) => {
						sendError(res,err,'listCategories -- Finding User --');
					});
			})
			.catch((err) => {
				sendError(res,err,'listCategories -- Finding User --');
			});
	}, // fin del getCategories

	listCourses(req,res) {
		var query = {};
		var key = req.headers.key;
		User.findOne({ name: key })
			.populate('org')
			.then((key_user) => {
				var sort = { name: 1 };
				var skip = 0;
				var limit = 15;
				query = { org: key_user.org.name };
				if(req.query.sort) { sort = { name: req.query.sort }; }
				if(req.query.skip) { skip = parseInt( req.query.skip ); }
				if(req.query.limit) { limit = parseInt( req.query.limit ); }
				if(req.query.categories) {
					query.categories = JSON.parse(req.query.categories);
				}
				Course.find(query)
					.sort(sort)
					.skip(skip)
					.limit(limit)
					.then((courses) => {
						var send_courses = new Array();
						courses.forEach(function(course) {
							send_courses.push({
								title: course.title,
								code: course.code,
								image: course.image,
								description: course.description,
								categories: course.categories
							});
						});
						res.status(200).json({
							'status': 201,
							'message': send_courses
						});
					})
					.catch((err) => {
						sendError(res,err,'listCourses -- Finding Course --');
					});
			})
			.catch((err) => {
				sendError(res,err,'listCourses -- Finding User --');
			});
	}
};

function sendError(res, err, section) {
	logger.info('Course controller -- Section: ' + section + '----');
	logger.info(err);
	res.status(500).json({
		'status': 500,
		'message': 'Error',
		'Error': err.message
	});
	return;
}
