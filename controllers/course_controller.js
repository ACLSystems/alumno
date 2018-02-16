const winston = require('winston');
const User = require('../src/users');
const Course = require('../src/courses');
const Category = require('../src/categories');
const Block = require('../src/blocks');
const permissions = require('../shared/permissions');
const Org = require('../src/orgs');

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
				course.author = key_user.person.name + ' ' + key_user.person.fatherName;
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
				course.status = 'draft';
				course.version = 1;
				Course.create(course)
					.then(() => {
						course.categories.forEach( function(cat) {
							Category.findOne({ name: cat })
								.then((cat_found) => {
									if(!cat_found){
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
				Category.find({ org: user.org.id })
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
				query = { org: key_user.org._id };
				if(req.query.sort) { sort = { name: req.query.sort }; }
				if(req.query.skip) { skip = parseInt( req.query.skip ); }
				if(req.query.limit) { limit = parseInt( req.query.limit ); }
				if(req.query.categories) {
					query.categories = JSON.parse(req.query.categories);
				}
				if(req.query.keywords) {
					query.keywords = JSON.parse(req.query.categories);
				}
				if(req.query.title) {
					query.title = { title: { $regex : /req.query.title/i }};
				}
				if(req.query.author) {
					query.author = { author: req.query.author };
				}
				Course.find(query)
					.sort(sort)
					.skip(skip)
					.limit(limit)
					.then((courses) => {
						var send_courses = new Array();
						courses.forEach(function(course) {
							send_courses.push({
								id: course._id,
								title: course.title,
								code: course.code,
								image: course.image,
								description: course.description,
								categories: course.categories,
								isVisible: course.isVisible,
								version: course.version,
								status: course.status,
								price: course.price,
								author: course.author
							});
						});
						res.status(200).json({
							'status': 201,
							'message': {
								'coursesNum': send_courses.length,
								'courses': send_courses
							}
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

	listCoursesStudents(req,res) {
		var query = {};
		Org.findOne({ name: req.query.org })
			.then((org) => {
				var sort = { name: 1 };
				var skip = 0;
				var limit = 15;
				query = { org: org._id };
				if(req.query.sort) { sort = { name: req.query.sort }; }
				if(req.query.skip) { skip = parseInt( req.query.skip ); }
				if(req.query.limit) { limit = parseInt( req.query.limit ); }
				if(req.query.categories) {
					query.categories = JSON.parse(req.query.categories);
				}
				if(req.query.keywords) {
					query.keywords = JSON.parse(req.query.categories);
				}
				if(req.query.title) {
					query.title = { title: { $regex : /req.query.title/i }};
				}
				if(req.query.author) {
					query.author = { author: req.query.author };
				}
				query.status = 'published';
				query.isVisible = true;
				Course.find(query)
					.sort(sort)
					.skip(skip)
					.limit(limit)
					.then((courses) => {
						var send_courses = new Array();
						courses.forEach(function(course) {
							send_courses.push({
								id: course._id,
								title: course.title,
								code: course.code,
								image: course.image,
								description: course.description,
								categories: course.categories,
								keywords: course.keywords,
								isVisible: course.isVisible,
								price: course.price,
								author: course.author
							});
						});
						res.status(200).json({
							'status': 201,
							'message': {
								'coursesNum': send_courses.length,
								'courses': send_courses
							}
						});
					})
					.catch((err) => {
						sendError(res,err,'listCourses -- Finding Course --');
					});
			})
			.catch((err) => {
				sendError(res,err,'listCourses -- Finding User --');
			});
	}, // listCoursesStudents

	createBlock(req,res) {
		const key = req.headers.key;
		var queryCourse = {};
		if(req.body.coursecode) {
			queryCourse = { code: req.body.coursecode };
		} else if(req.body.courseid) {
			queryCourse = { code: req.body.courseid};
		}
		User.findOne({ name: key})
			.populate('org')
			.populate('orgUnit')
			.then((key_user) => {
				Course.findOne(queryCourse)
					.then((course) => {
						if(course) {
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
									if(err.message.indexOf('E11000 duplicate key error collection') !== -1 ) {
										res.status(406).json({
											'status': 406,
											'message': 'Error 1439: Block -' + req.body.code + '- already exists'
										});
									} else {
										sendError(res,err,'createBlock -- Saving Block --');
									}
								});
						} else {
							res.status(404).json({
								'status': 404,
								'message': 'Course not found'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'createBlock -- Searching Course --');
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
				var query = { _id: req.query.id};
				if(!req.query.id) {
					query = { org: key_user.org._id, code: req.query.code };
				}
				Block.findOne(query)
					.then((block) => {
						if(block) {
							const result = permissions.access(key_user,block,'content');
							if(result.canRead) {
								var send_block = prettyGetBlockBy(block);
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
				sendError(res,err,'getBlock -- Searching Key User --');
			});
	}, // get block

	getBlockBy(req,res) {
		const key = req.headers.key;
		User.findOne({name: key})
			.populate('org')
			.populate('orgUnit')
			.then((key_user) => {
				var query = { _id: req.query.id };
				if(!req.query.id) {
					query = { code: req.query.code, org: key_user.org._id };
				}
				Course.findOne(query)
					.populate('blocks')
					.then((course) => {
						if(course){
							const result = permissions.access(key_user,course,'content');
							if(result.canRead) {
								if(req.query.index) {
									var index = parseInt(req.query.index);
									if(course.blocks[index]) {
										var send_block = prettyGetBlockBy(course.blocks[index]);
										res.status(200).json({
											'status': 200,
											'message': send_block
										});
									} else {
										res.status(404).json({
											'status': 404,
											'message': 'Block at index ' + req.query.index + ' not found'
										});
									}
								} else if(req.query.section && req.query.number) {
									var bobj = {};
									var section = parseInt(req.query.section);
									var number = parseInt(req.query.number);
									bobj = course.blocks.find(function(bobj) { return bobj.section === section && bobj.number === number; });
									if(bobj) {
										send_block = prettyGetBlockBy(bobj);
										res.status(200).json({
											'status': 200,
											'message': send_block
										});
									} else {
										res.status(404).json({
											'status': 404,
											'message': 'Cannot found block with section ' + req.query.section + ' and number ' + req.query.number
										});
									}
								} else { // entonces la busqueda es por 'order'
									bobj = {};
									var order = parseInt(req.query.order);
									bobj = course.blocks.find(function(bobj) { return bobj.order === order; });
									if(bobj) {
										send_block = prettyGetBlockBy(bobj);
										res.status(200).json({
											'status': 200,
											'message': send_block
										});
									} else {
										res.status(404).json({
											'status': 404,
											'message': 'Cannot found block with section ' + req.query.section + ' and number ' + req.query.number
										});
									}
								}
							} else {
								res.status(406).json({
									'status': 406,
									'message': 'Error 1447: User -'+ key_user.name + '- does not have permissions for course -' + course.code + '-'
								});
							}
						} else {
							res.status(404).json({
								'status': 404,
								'message': 'Error 1450: Couse -'+ course.code + '- does not exist'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'getBlockBy -- Searching Course --');
					});
			})
			.catch((err) => {
				sendError(res,err,'getBlockBy -- Searching Key User --');
			});
	}, // getBlockBy

	get(req,res) {
		const key = req.headers.key;
		User.findOne({name: key})
			.populate('org')
			.populate('orgUnit')
			.then((key_user) => {
				var query = { _id: req.query.id };
				if(!req.query.id) {
					query = { code: req.query.code, org: key_user.org._id };
				}
				Course.findOne(query)
					.populate('org')
					.then((course) => {
						if(course){
							const result = permissions.access(key_user,course,'content');
							if(result.canRead) {
								var send_course = prettyCourse(course);
								res.status(200).json({
									'status': 200,
									'message': send_course
								});
							} else {
								res.status(406).json({
									'status': 406,
									'message': 'Error 1447: User -'+ key_user.name + '- does not have permissions for course -' + course.code + '-'
								});
							}
						} else {
							res.status(404).json({
								'status': 404,
								'message': 'Error 1450: Couse -'+ course.code + '- does not exist'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'get -- Searching Course --');
					});
			})
			.catch((err) => {
				sendError(res,err,'get -- Searching Key User --');
			});
	}, // get

	getBlocklist(req,res) {
		const key = req.headers.key;
		User.findOne({name: key})
			.populate('org')
			.populate('orgUnit')
			.then((key_user) => {
				var query = { code: req.query.code, org: key_user.org._id };
				if(req.query.id){
					query = { _id: req.query.id};
				}
				Course.findOne(query)
					.then((course) => {
						if(course) {
							const result = permissions.access(key_user,course,'content');
							if(result.canRead) {
								Block.find({ _id: { $in: course.blocks }})
									.then((blocks) => {
										var send_blocks = new Array();
										blocks.forEach(function(block) {
											send_blocks.push({
												id: 						block._id,
												code: 					block.code,
												type: 					block.type,
												title: 					block.title,
												section: 				block.section,
												number: 				block.number,
												order: 					block.order,
												status: 				block.status,
												isVisible: 			block.isVisible
											});
										});
										res.status(200).json({
											'status': 200,
											'message': {
												blockNum: send_blocks.length,
												blocks: send_blocks
											}
										});
									});
							} else {
								res.status(406).json({
									'status': 406,
									'message': 'Error 1451: User -' + key_user.name + '- does not have permissions for course code -' + req.query.code + '-'
								});
							}
						} else {
							res.status(404).json({
								'status': 404,
								'message': 'Course not found'
							});
						}
					}) // aqui
					.catch((err) => {
						sendError(res,err,'getBlocklist -- Searching Course --');
					});
			})
			.catch((err) => {
				sendError(res,err,'getBlocklist -- Searching Key user --');
			});
	},// getBlocklist

	getBlocklistStudents(req,res) {
		var query = {};
		if(req.query.code) {
			query = { code: req.query.code };
		} else {
			query = { _id: req.query.id };
		}
		Course.findOne(query)
			.then((course) => {
				if(course) {
					if(course.isVisible || course.status === 'published') {
						Block.find({ _id: { $in: course.blocks }})
							.then((blocks) => {
								var send_blocks = new Array();
								blocks.forEach(function(block) {
									if(block.isVisible && block.status === 'published') {
										send_blocks.push({
											id: 						block._id,
											title: 					block.title,
											section: 				block.section,
											number: 				block.number
										});
									}
								});
								res.status(200).json({
									'status': 200,
									'message': {
										blockNum: send_blocks.length,
										blocks: send_blocks
									}
								});
							});
					} else {
						res.status(404).json({
							'status': 404,
							'message': 'Course you requested is not visible nor published yet'
						});
					}
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'Course not found'
					});
				}
			}) // aqui
			.catch((err) => {
				sendError(res,err,'getBlocklist -- Searching Course --');
			});
	},// getBlocklist

	createQuestionnarie(req,res) {
		const key = req.headers.key;
		var queryBlock = {};
		User.findOne({ name: key })
			.populate('org')
			.populate('orgUnit')
			.then((key_user) => {
				if(req.body.id) {
					queryBlock = { _id: req.body.id};
				} else if(req.body.code) {
					queryBlock = { code: req.body.code, org: key_user.org._id };
				}
				Block.findOne(queryBlock)
					.then((block) => {
						if(block) {
							var date = new Date();
							var questionnarie = {
								type: req.body.questionnarie.type,
								questions: req.body.questionnarie.questions,
								version: 1,
								keywords: req.body.questionnarie.keywords,
								isVisible: true,
								own: {
									user: key_user.name,
									org: key_user.org.name,
									orgUnit: key_user.orgUnit.name
								},
								mod: [{
									by: key_user.name,
									when: date,
									what: 'Questionnarie creation'
								}],
								perm: {
									users: [{
										name: key_user.name,
										canRead: true,
										canModify: true,
										canSec: true
									}],
									roles: [{
										name: 'isOrgContent',
										canRead: true,
										canModify: true,
										canSec: true
									}],
									orgs: [{
										name: key_user.org.name,
										canRead: true,
										canModify: false,
										canSec: false
									}],
									orgUnits: [{
										name: key_user.orgUnit.name,
										canRead: true,
										canModify: true,
										canSec: false
									}]
								}
							};
							block.questionnaries.push(questionnarie);
							block.save()
								.then(() => {
									res.status(200).json({
										'status': 200,
										'message': 'Questionnarie saved'
									});
								})
								.catch((err) => {
									sendError(res,err,'createQuestionnarie -- Saving block --');
								});
						} else {
							res.status(404).json({
								'status': 404,
								'message': 'Error 1458: Block requested not found'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'createQuestionnarie -- Searching Block --');
					});
			})
			.catch((err) => {
				sendError(res,err,'createQuestionnarie -- Searching Key user --');
			});
	}, // createQuestionnarie

	addQuestions(req,res) {
		const key = req.headers.key;
		User.findOne({ name: key })
			.populate('org')
			.populate('orgUnit')
			.then((key_user) => {
				var query = { _id: req.body.id };
				if(!req.body.id) {
					query = { code: req.body.code, org: key_user.org._id };
				}
				Block.findOne(query)
					.then((block) => {
						if(block) {
							const result = permissions.access(key_user,block,'content');
							if(result.canModify) {
								var qobj = '';
								//bobj = course.blocks.find(function(bobj) { return bobj.section === section && bobj.number === number; });
								qobj = block.questionnaries.find(function(qobj) {
									var id = qobj._id + '';
									return id === req.body.questionnarie.id;
								});
								var index = -1;
								if(qobj) {
									index = block.questionnaries.indexOf(qobj);
									req.body.questionnarie.questions.forEach(function(question) {
										block.questionnaries[index].questions.push(question);
									});
									block.save()
										.then(() => {
											res.status(200).json({
												'status': 200,
												'message': 'Questions added'
											});
										})
										.catch((err) => {
											sendError(res,err,'addQuestion -- Saving Block --');
										});
								} else {
									res.status(404).json({
										'status': 404,
										'message': 'Error 1457: Questionnarie not found'
									});
								}
							} else {
								res.status(406).json({
									'status': 406,
									'message': 'Error 1456: User -' + key_user.name + '- cannot modify block'
								});
							}
						} else {
							res.status(404).json({
								'status': 404,
								'message': 'Error 1455: Block not found'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'addQuestion -- Searching block --');
					});
			})
			.catch((err) => {
				sendError(res,err,'addQuestion -- Searching Key user --');
			});
	}, // addQuestions

	modify(req,res) {  // modificar curso
		const key = req.headers.key;
		User.findOne({ name: key })
			.populate('org')
			.populate('orgUnit')
			.then((key_user) => {
				Course.findById(req.body.id)
					.then((course) => {
						if(course) {
							const result = permissions.access(key_user,course,'content');
							if(result.canModify) {
								var req_course = req.body.course;
								delete req_course.id;
								if(req_course.org) 			{delete req_course.org;}
								if(req_course.own) 			{delete req_course.own;}
								if(req_course.mod) 			{delete req_course.mod;}
								if(req_course.perm) 		{delete req_course.perm;}
								if(req_course.blocks) 	{delete req_course.blocks;}
								if(req_course.author) 	{delete req_course.author;}
								if(req_course.price) 		{delete req_course.price;}
								if(req_course.version) 	{delete req_course.version;}
								var date = new Date();
								var mod = {
									by: key_user.name,
									when: date,
									what: 'Course modification'
								};
								Course.findByIdAndUpdate(course._id, req_course)
									.then((course) => {
										course.mod.push(mod);
										course.save()
											.catch((err) => {
												sendError(res,err,'modify -- save after mod --');
											});
										res.status(200).json({
											'status': 200,
											'message': 'Course modified'
										});
									})
									.catch((err) => {
										sendError(res,err,'modify -- findByIdAndUpdate course --');
									});
							} else {
								res.status(406).json({
									'status': 406,
									'message': 'User -'+ key_user.name + ' cannot modify course'
								});
							}
						} else {
							res.status(404).json({
								'status': 404,
								'message': 'Course -'+ req.body.courseid + '- not found'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'modify -- Searching Key user --');
					});
			})
			.catch((err) => {
				sendError(res,err,'modify -- Searching Key user --');
			});
	}, // modify

	modifyBlock(req,res) {
		const key = req.headers.key;
		User.findOne({ name: key })
			.populate('org')
			.populate('orgUnit')
			.then((key_user) => {
				Block.findById(req.body.id)
					.then((block) =>{
						if(block) {
							const result = permissions.access(key_user,block,'content');
							if(result) {
								var date = new Date();
								var mod = {
									by: key_user.name,
									when: date,
									what: 'Course modification'
								};
								block.mod.push(mod);
								var req_block = req.body.block;
								if(req_block.content) 				{block.content = req_block.content;}
								if(req_block.order) 					{block.order = req_block.order;}
								if(req_block.number) 					{block.number = req_block.number;}
								if(req_block.section) 				{block.section = req_block.section;}
								if(req_block.title) 					{block.title = req_block.title;}
								if(req_block.code) 						{block.code = req_block.code;}
								if(req_block.isVisible) 			{block.isVisible = req_block.isVisible;}
								if(req_block.status) 					{block.status = req_block.status;}
								if(req_block.tasks) 					{block.tasks = req_block.tasks;}
								if(req_block.questionnaries) 	{block.questionnaries = req_block.questionnaries;}
								if(req_block.keywords) 				{block.keywords = req_block.keywords;}
								if(req_block.media) 					{block.media = req_block.media;}
								if(req_block.type) 						{block.type = req_block.type;}
								block.save()
									.then(() => {
										res.status(200).json({
											'status': 200,
											'message': 'Block -'+ block._id +'- modified'
										});
									})
									.catch((err) => {
										sendError(res,err,'modifyBlock -- Saving block --');
									});
							} else {
								res.status(406).json({
									'status': 406,
									'message': 'Error 1463: User -' + key_user.name + '- does not have permissions on requested block'
								});
							}
						} else {
							res.status(404).json({
								'status': 404,
								'message': 'Error 1462: block -' + req.body.id + '- not found'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'modifyBlock -- Searching block --');
					});
			})
			.catch((err) => {
				sendError(res,err,'modifyBlock -- Searching Key user --');
			});
	}, // modifyBlock

	makeAvailable(req,res) {
		const key = req.headers.key;
		const coursecode = req.body.code;
		User.findOne({name: key})
			.then(() => {
				Course.findOne({code: coursecode})
					.then((course) => {
						course.status = 'published';
						course.isVisible = true;
						course.save()
							.then((course) => {
								Block.find({_id: {$in: course.blocks}})
									.then((blocks) => {
										var status = 'ok';
										var details = new Array();
										blocks.forEach(function(block) {
											block.isVisible = true;
											block.status = 'published';
											block.save()
												.catch((err) => {
													status = 'not ok';
													details.push(err.message);
												});
										});
										if(status === 'ok') {
											res.status(200).json({
												'stauts': 200,
												'message': 'Course -' + course.code + '- available'
											});
										} else {
											res.status(500).json({
												'status': 500,
												'message': 'There was some errors',
												'details': details
											});
										}
									})
									.catch((err) => {
										sendError(res,err,'makeAvailable.courses -- Searching Blocks --');
									});
							})
							.catch((err) => {
								sendError(res,err,'makeAvailable.courses -- Saving Course --');
							});
					})
					.catch((err) => {
						sendError(res,err,'makeAvailable.courses -- Searching Course --');
					});
			})
			.catch((err) => {
				sendError(res,err,'makeAvailable.courses -- Searching Key user --');
			});
	} // makeAvailable
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

function prettyCourse(course) {
	return {
		id: course._id,
		orgid: course.org._id,
		orgname: course.org.name,
		code: course.code,
		title: course.title,
		type: course.type,
		level: course.level,
		author: course.author,
		categories: course.categories,
		keywords: course.keywords,
		description: course.description,
		image: course.image,
		details: course.details,
		syllabus: course.syllabus,
		price: course.price,
		status: course.status,
		isVisible: course.isVisible,
	};
}

function prettyGetBlockBy(obj){
	return {
		id: obj._id,
		org: obj.org,
		code: obj.code,
		type: obj.type,
		title: obj.title,
		section: obj.section,
		number: obj.number,
		order: obj.order,
		content: obj.content,
		keywords: obj.keywords,
		tasks: obj.tasks,
		version: obj.version,
		media: obj.media,
		questionnaries: prettyQuests(obj)
	};
}

function prettyQuests(obj){
	var quests = new Array();
	obj.questionnaries.forEach(function(quest) {
		var qqs = new Array();
		var tempquest = {
			isVisible : quest.isVisible,
			id: quest._id,
			type: quest.type,
			keywords: quest.keywords,
			w: quest.w,
		};
		quest.questions.forEach(function(qq) {
			var tempqq = {
				text: qq.text,
				type: qq.type,
				isVisible: qq.isVisible,
				w: qq.w
			};
			var qqans = new Array();
			qq.answers.forEach(function(qqan) {
				qqans.push({
					type: qqan.type,
					index: qqan.index
				});
			});
			tempqq.answers = qqans;
			var qqopt = new Array();
			qq.options.forEach(function(qqop) {
				qqopt.push({
					name: qqop.name,
					value: qqop.value
				});
			});
			tempqq.options = qqopt;
			qqs.push(tempqq);
		});
		tempquest.questions = qqs;
		quests.push(tempquest);
	});
	return quests;
}
