const winston = require('winston');
const User = require('../src/users');
const Course = require('../src/courses');
const Category = require('../src/categories');
const Block = require('../src/blocks');
const permissions = require('../shared/permissions');
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
			.then((key_user) => {
				const date = new Date();
				course.org = key_user.org._id,
				course.own = {
					user: key_user.name,
					org: key_user.org.name,
					orgUnit: key_user.orgUnit.name
				};
				course.mod = {
					by: key_user.name,
					when: date,
					what: 'Course Creation'
				};
				course.perm = {
					users: [{ name: key_user.name, canRead: true, canModify: true, canSec: true }],
					roles: [{ name: 'isAuthor', canRead: true, canModify: false, canSec: false},
						{ name: 'isOrgContent', canRead: true, canModify: false, canSec: true}],
					orgs: [{ name: key_user.org.name, canRead: true, canModify: false, canSec: false}],
					orgUnits: [{ name: key_user.orgUnit.name, canRead: true, canModify: true, canSec: false}]
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
											org: key_user.org._id
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
						if(err.message.indexOf('E11000 duplicate key error collection') !== -1 ) {
							res.status(406).json({
								'status': 406,
								'message': 'Error 1447: course -' + course.code + '- already exists'
							});
						} else {
							sendError(res,err,'createCourse -- Saving Course --');
						}
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
	}, // listCourses

	createBlock(req,res) {
		const key = req.headers.key;
		var queryCourse = {};
		if(req.body.courseCode) {
			queryCourse = { code: req.body.courseCode };
		} else if(req.body.courseId) {
			queryCourse = { code: req.body.courseId};
		}
		User.findOne({ name: key})
			.populate('org')
			.populate('orgUnit')
			.then((key_user) => {
				var block = new Block;
				block.org = key_user.org._id;
				block.code = req.body.code;
				block.type = req.body.type;
				block.title = req.body.title;
				block.section = req.body.section;
				block.number = req.body.number;
				block.order = req.body.order;
				block.content = req.body.content;
				if(req.body.media) {
					block.media = parseArray(req.body.media);
				}
				block.status = 'draft';
				block.version = 1;
				if(req.body.keywords) {
					block.keywords = parseArray(req.body.keywords);
				}
				block.own = {
					user: key_user.name,
					org: key_user.org.name,
					orgUnit: key_user.orgUnit.name
				};
				block.mod = generateMod(key_user.name,'Block creation');
				block.perm = generatePerm(key_user.name,key_user.org.name,key_user.orgUnit.name);
				block.save()
					.then((block) => {
						Course.findOne(queryCourse)
							.then((course) => {
								block.keywords.push(course.code);
								course.keywords.forEach(function(keyword) {
									block.keywords.push(keyword);
								});
								block.save().catch((err) => {
									sendError(res,err,'createBlock -- Saving block again with keywords. --');
								});
								const result = permissions.access(key_user,course,'content');
								if(course.own.user === key_user.name || result.canModify ) {
									course.blocks.push(block._id);
									let desc = 'Course modification - Adding block ' + block.code;
									course.mod.push(generateMod(key_user.name,desc));
									course.save()
										.then(() => {
											res.status(201).json({
												'status': 200,
												'message': 'block -' + block.code + '- of course -' + course.code + '- was saved.'
											});
										})
										.catch((err) => {
											sendError(res,err,'createBlock -- Relating block, saving course --');
										});
								}
							})
							.catch((err) => {
								sendError(res,err,'createBlock -- Searching Course --');
							});
					})
					.catch((err) => {
						if(err.message.indexOf('E11000 duplicate key error collection') !== -1 ) {
							res.status(406).json({
								'status': 406,
								'message': 'Error 1439: Block -' + block.code + '- already exists'
							});
						} else {
							sendError(res,err,'createBlock -- Saving Block --');
						}
					});
			})
			.catch((err) => {
				sendError(res,err,'createBlock -- Searching Key User --');
			});
	}, // createBlock

	getBlock(req,res) {
		const key = req.headers.key;
		User.findOne({name: key})
			.populate('org')
			.populate('orgUnit')
			.then((key_user) => {
				Block.findOne({ org: key_user.org._id, code: req.query.code })
					.then((block) => {
						if(block) {
							const result = permissions.access(key_user,block,'content');
							if(result.canRead) {
								var send_block = {
									title: block.title,
									content: block.content,
									section: block.section,
									number: block.number,
									order: block.order,
									version: block.version,
									media: block.media
								};
								res.status(200).json({
									'status': 200,
									'message': send_block
								});
							} else {
								res.status(406).json({
									'status': 406,
									'message': 'Error 1445: User -'+ key_user.name + '- does not have permissions for block -' + block.code + '-'
								});
							}
						} else {
							res.status(406).json({
								'status': 406,
								'message': 'Error 1446: We cannot found any block with code -' + req.query.code + '-'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'getBlock -- Searching Block --');
					});
			})
			.catch((err) => {
				sendError(res,err,'getBlock -- Searching Block --');
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

function parseArray(myarr) {
	const myarr_temp = myarr;
	if(myarr_temp.constructor !== Array) {
		myarr = [myarr_temp];
	}
	return myarr;
}

function generateMod(by, desc) {
	const date = new Date();
	return {by: by, when: date, what: desc};
}

function generatePerm(user,org, orgUnit) {
	return {
		users: [{name: user, canRead: true, canModify: true, canSec: true}],
		roles: [{name: 'isOrgContent', canRead: true, canModify: true, canSec: true}],
		orgs: [{name: org, canRead: true, canModify: false, canSec: false}],
		orgUnits: [{name: orgUnit, canRead: true, canModify: false, canSec: false }]
	};
}
