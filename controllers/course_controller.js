const StatusCodes 	= require('http-status-codes');
const Course				= require('../src/courses'				);
const Category			= require('../src/categories'			);
const Block					= require('../src/blocks'					);
const Questionnarie = require('../src/questionnaries'	);
const Task 					= require('../src/tasks'					);
const permissions 	= require('../shared/permissions'	);
const Org						= require('../src/orgs'						);
const Resource 			= require('../src/resources'			);
const Dependency 		= require('../src/dependencies'		);
const logger 				= require('../shared/winston-logger');
const cache					= require('../src/cache'					);
const Err 					= require('./err500_controller');

//const redisClient = redis.createClient(keys.redisUrl);

module.exports = {
	create(req,res) {
		const key_user 	= res.locals.user;
		var course = new Course(req.body);
		course.org = key_user.org._id;
		course.own = {
			user: key_user.name,
			org: key_user.org.name,
			orgUnit: key_user.orgUnit.name
		};
		if(!course.author){
			course.author = key_user.person.name + ' ' + key_user.person.fatherName;
		}
		course.mod = {
			by: key_user.name,
			when: new Date(),
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
		course.save()
			.then((course) => {
				if(course.categories && course.categories.length > 0) {
					course.categories.forEach( function(cat) {
						Category.findOne({ name: cat })
							.then((cat_found) => {
								if(!cat_found){
									const category = new Category({
										name: cat,
										isVisible: true,
										org: key_user.org._id
									});
									category.save(() => {

									})
										.catch((err) => {
											sendError(res,err,'listCategories -- Course category creation --');
										});
								}
							})
							.catch((err) => {
								sendError(res,err,'listCategories -- Course Category Finding --');
							});
					}); // foreach
				} else {
					res.status(StatusCodes.NOT_ACCEPTABLE).json({
						'message'	: 'Category missing or not an array'
					});
					return;
				}
				res.status(StatusCodes.CREATED).json({
					'message': 'Course - ' + course.title + '- -' + course.code + '- created',
					'id': course._id
				});
			})
			.catch((err) => {
				if(err.message.indexOf('E11000 duplicate key error collection') !== -1 ) {
					res.status(StatusCodes.NOT_ACCEPTABLE).json({
						'message': 'Error 1447: course -' + course.code + '- already exists',
						'id': course._id
					});
				} else {
					sendError(res,err,'createCourse -- Saving Course --');
				}
			});
	}, // fin del create

	clone(req,res) {
		const key_user 	= res.locals.user;
		const date 			= new Date();
		Promise.all([
			Course.findById(req.body.tocourseid),
			Course.findById(req.body.fromcourseid).populate('blocks')
		])
			.then((results) => {
				if(results && results.length > 0) {
					var [tocourse,fromcourse] = results;
					if(fromcourse && fromcourse.blocks && fromcourse.blocks.length > 0){
						var prefix 			= req.body.prefix;
						var pad 				= parseInt(req.body.pad);
						var postfix 		= tocourse.order || 0;
						var section 		= tocourse.currentSection;
						var number 			= tocourse.nextNumber;
						var fromSection = section;
						fromcourse.blocks.forEach(function(block) {
							var padded 		= postfix + '';
							padded = padded.padStart(pad,'0');
							var newBlock = new Block({
								org					: block.org,
								code				: prefix + '-' + padded,
								type				: block.type,
								title				: block.title,
								begin 			: block.begin,
								content			: block.content,
								media				: block.media,
								keywords		: block.keywords,
								defaultmin 	: block.defaultmin,
								rules				: block.rules,
								questionnarie : block.questionnarie,
								task				: block.task,
								w 					: block.w,
								wq					: block.wq,
								wt					: block.wt,
								duration		: block.duration,
								durationUnits	: block.durationUnits,
								status			: 'draft',
								version 		: 1,
								isVisible 	: false,
								own					: {
									user: key_user.name,
									org: key_user.org.name,
									orgUnit: key_user.orgUnit.name
								},
								mod					: generateMod(key_user.name,'Block cloned from ' + block.code),
								perm				: generatePerm(key_user.name,key_user.org.name,key_user.orgUnit.name)
							});
							if(tocourse.keywords) {
								newBlock.keywords = parseArray(tocourse.keywords);
							}
							if(block.section !== fromSection) {
								section++;
								number = 0;
								fromSection = block.section;
							}
							newBlock.section 	= section;
							newBlock.number		= number;
							newBlock.order		= postfix;
							number++;
							postfix++;
							if(!newBlock.title && block.title) {
								newBlock.title = block.title;
							}
							newBlock.save()
								.catch((err) => {
									sendError(res,err,'clonecourse -- Saving block -- order: ' + postfix);
									return;
								});
							tocourse.blocks.push(newBlock._id);
							tocourse.order = postfix;
						});
						tocourse.mod.push({
							by: key_user.name,
							when: date,
							what: `Blocks cloned from ${fromcourse.code}`
						});
						tocourse.currentSection = section;
						tocourse.nextNumber			= number;
						tocourse.order 					= postfix;
						tocourse.save()
							.then(() => {
								res.status(200).json({
									'status': 200,
									'message': `Blocks from ${fromcourse.title} cloned to ${tocourse.title}`
								});
							})
							.catch((err) => {
								sendError(res,err,'clonecourse -- Saving tocourse --');
							});
					} else {
						res.status(200).json({
							'status': 404,
							'message': 'fromcourse has no blocks. Please review and try again'
						});
					}
				} else {
					res.status(200).json({
						'status': 404,
						'message': 'Some courseid not found. Please review and try again'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'clonecourse -- Finding Courses --');
			});
	}, //clone

	listCategories(req,res) {
		var sort = { name: 1 };
		var skip = 0;
		var limit = 15;
		if(req.query.sort)	{ sort 	= { name: req.query.sort 		}; 	}
		if(req.query.skip)	{ skip 	= parseInt( req.query.skip 	); 	}
		if(req.query.limit) { limit = parseInt( req.query.limit );	}
		const key_user 	= res.locals.user;
		Category.find({ org: key_user.org.id })
			.sort(sort)
			.skip(skip)
			.limit(limit)
			.then((cats) => {
				var send_cats = [];
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
	}, // fin del getCategories

	countCourses(req,res) {
		Org.findOne({name: req.query.org})
			.select('name')
			.cache({key: 'org:' + req.query.org})
			.lean()
			.then((org) => {
				if(org) {
					Course.countDocuments({org:org._id})
						.cache({key: 'course:count:' + org._id})
						.then((count)  => {
							res.status(200).json({
								'coursesCount': count
							});
						})
						.catch((err) => {
							sendError(res,err,'countCourses -- Counting courses --');
						});
				} else {
					res.status(404).json({
						'message': `Organización ${req.query.org} no encontrada`
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'countCourses -- Finding Org --');
			});
	}, //countCourses

	async listCourses(req,res) {
		var query = {};
		const key_user 	= res.locals.user;
		var sort = { name: 1 };
		query = { org: key_user.org._id };
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
		var courses = await Course.find(query)
			.select('-org -own -mod -perm -blocks -resources -currentSection -nextNumber -apiExternal -__v')
			.sort(sort)
			.lean()
			.catch(err => {
				sendError(res,err,'listCourses -- Finding Courses');
				return;
			});
		res.status(StatusCodes.OK).json(courses);
	}, // listCourses

	async listCoursesPublic(req,res) {
		var query = {};
		const sort = { priority:1, title: 1};
		if(!req.query.org) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				message: 'No se indica la organización'
			});
		}
		const org = await Org.findOne({ name: req.query.org })
			.select('name')
			.cache({key: 'org:name:' + req.query.org})
			.lean()
			.catch(err => {
				sendError(res,err,'listCoursesPublic -- Finding Org');
				return;
			});
		query.org =  org._id;
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
		if(req.query.priority) {
			query.priority = { priority: req.query.priority };
		}
		query.status = 'published';

		query.isVisible = true;
		// console.log(query);
		var courses = await Course.find(query)
			.select('-org -own -mod -perm -blocks -resources -currentSection -nextNumber -apiExternal -__v')
			// .cache({key: 'course:list:' + JSON.stringify(query)})
			.sort(sort)
			.lean()
			.catch(err => {
				sendError(res,err,'listCoursesPublic -- Finding Courses');
				return;
			});
		res.status(StatusCodes.OK).json(courses);
	}, // listCoursesPublic

	createBlock(req,res) {
		const key_user 	= res.locals.user;
		var queryCourse = {};
		if(req.body.coursecode) {
			queryCourse = { code: req.body.coursecode };
		} else if(req.body.courseid) {
			queryCourse = { code: req.body.courseid};
		}
		Course.findOne(queryCourse)
			.then((course) => {
				if(course) {
					var order 		= course.blocks.length;
					var section 	= course.currentSection;
					var number 		= course.nextNumber;
					var block 		= new Block();
					block.org 		= key_user.org._id;
					block.code 		= req.body.code;
					block.type 		= req.body.type;
					block.title 	= req.body.title;
					if(req.body.newSection){
						section++;
						number = 0;
					}
					block.number 	= number;
					block.section = section;
					block.order 	= order;
					block.content = req.body.content;
					if(req.body.media) {
						block.media = parseArray(req.body.media);
					}
					block.status	= 'draft';
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
								//let desc = 'Course modification - Adding block ' + block.code;
								//course.mod.push(generateMod(key_user.name,desc));
								course.currentSection = section;
								course.nextNumber			= number + 1;
								course.save()
									.then(() => {
										res.status(StatusCodes.OK).json({
											'message': 'block -' + block.code + '- of course -' + course.code + '- was saved.',
											'id': block._id
										});
									})
									.catch((err) => {
										sendError(res,err,'createBlock -- Relating block, saving course --');
									});
							} else {
								res.status(StatusCodes.FORBIDDEN).json({
									'message': 'User ' + key_user.name + ' has no permissions to create block on ' + course.title
								});
							}
						})
						.catch((err) => {
							if(err.message.indexOf('E11000 duplicate key error collection') !== -1 ) {
								res.status(StatusCodes.NOT_ACCEPTABLE).json({
									'message': 'Error: Block -' + req.body.code + '- already exists'
								});
							} else {
								sendError(res,err,'createBlock -- Saving Block --');
							}
						});
					// aquí
				} else {
					res.status(StatusCodes.NOT_FOUND).json({
						'message': 'Course not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'createBlock -- Searching Course --');
			});
	}, // createBlock

	getBlock(req,res) { // Sirve para obtener el detalle de un bloque en particular
		// el bloque se busca por código de bloque
		const key_user 	= res.locals.user;
		var query = { _id: req.query.id};
		if(!req.query.id) {
			query = { org: key_user.org._id, code: req.query.code };
		}
		Block.findOne(query)
			.populate('questionnarie')
			.populate('task')
			.then((block) => {
				if(block) {
					//const result = permissions.access(key_user,block,'content');
					//if(result.canRead) {
					var send_block = {
						blockId							: block._id,
						blockCode						: block.code,
						blockType						: block.type,
						blockTitle					: block.title,
						blockSection				: block.section,
						blockNumber					: block.number,
						blockOrder					: block.order,
						blockContent				: block.content,
						blockMedia					: block.media,
						blockKeywords				: block.keywords,
						blockVersion				: block.version,
						blockBegin					: block.begin,
						blockStatus					: block.status,
						blockIsVisible			: block.isVisible,
						blockDefaultmin			: block.defaultmin,
						blockW							: block.w,
						blockWq							: block.wq,
						blockWt							: block.wt,
						blockDuration				: block.duration,
						blockDurationUnits	: block.durationUnits
					};
					var send_questionnarie = {};
					if(block.type === 'questionnarie' && block.questionnarie) {
						const qn = block.questionnarie;
						send_questionnarie = {
							qstnnId						: qn._id,
							qstnnVersion			: qn.version,
							qstnnIsVisible		: qn.isVisible,
							qstnnKeywords			: qn.keywords,
							qstnnW						: qn.w,
							qstnnMaxAttempts	: qn.maxAttempts,
							qstnnMinimum			: qn.minumim,
							qstnnType					: qn.type
						};
						var send_questions = [];
						if(qn.questions && qn.questions.length > 0) {
							qn.questions.forEach(function(q) {
								var send_question = {
									questId					: q._id,
									questType				: q.type,
									questLabel			: q.label,
									questHeader			: q.header,
									questText				: q.text,
									questW					: q.w,
									questIsVisible	: q.isVisible,
									questFooter			: q.footer,
									questFooterShow : q.footerShow,
									questHelp				: q.help,
									questDisplay		: q.display
								};
								if(q.answers && q.answers.length > 0){
									var answers = [];
									q.answers.forEach(function(a) {
										var answer = {
											ansId			: a._id,
											ansType		: a.type
										};
										if(a.type === 'index') {
											answer.ansIndex	= a.index;
										}
										if(a.type === 'text') {
											answer.ansText	= a.text;
										}
										if(a.type === 'tf') {
											answer.ansTf		= a.tf;
										}
										if(a.type === 'group') {
											answer.ansGroup	= a.group;
										}
										answers.push(answer);
									});
									send_question.answers = answers;
								}
								if(q.options && q.options.length > 0){
									var options = [];
									q.options.forEach(function(o) {
										options.push({
											optId			: o._id,
											optName		: o.name,
											optValue 	: o.value
										});
									});
									send_question.options = options;
								}
								if(q.group && q.group.length > 0) {
									send_question.group = q.group;
								}
								send_questions.push(send_question);
							});
						}
						send_questionnarie.questions = send_questions;
					}
					send_block.questionnarie = send_questionnarie;
					var send_task = {};
					if(block.type === 'task' && block.task) {
						const ts = block.task;
						send_task = {
							taskId				: ts._id,
							taskStatus		: ts.status,
							taskVersion		: ts.version,
							taskKeywords	: ts.keywords,
							taskIsVisible	: ts.isVisible,
							taskJustDelivery: ts.justDelivery
						};
						if(ts.items && ts.items.length > 0) {
							var send_items = [];
							ts.items.forEach(function(i) {
								var send_item = {
									itemId			: i._id,
									itemHeader	: i.header,
									itemFooter	: i.footer,
									itemText		: i.text,
									itemLabel		: i.label,
									itemType		: i.type,
									itemFiles		: i.files,
									itemArray1  : i.array1,
									itemArray2	: i.array2,
									itemStyle		: i.style,
									itemW				: i.w,
									itemNotifications: i.Notifications
								};
								send_items.push(send_item);
							});
							send_task.items = send_items;
						}
						send_block.task = send_task;
					}
					res.status(200).json({
						'status': 200,
						'message': send_block
					});
					/*
					} else {
						res.status(406).json({
							'status': 406,
							'message': 'Error 1445: User -'+ key_user.name + '- does not have permissions for block -' + block.code + '-'
						});
					}
					*/
				} else {
					res.status(406).json({
						'status': 406,
						'message': 'Block not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'getBlock -- Searching Block --');
			});
	}, // get block

	getBlockBy(req,res) { // mismo que el anterior, solo que acá la búsqueda es por section + number
		// o por order
		const key_user 	= res.locals.user;
		var query = { _id: req.query.id };
		if(!req.query.id) {
			query = { code: req.query.code, org: key_user.org._id };
		}
		Course.findOne(query)
			.populate('blocks')
			.then((course) => {
				if(course){
					var send_block = {};
					var bobj = {};
					const result = permissions.access(key_user,course,'content');
					if(result.canRead) {
						if(req.query.index) {
							var index = parseInt(req.query.index);
							if(course.blocks[index]) {
								send_block = prettyGetBlockBy(course.blocks[index]);
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
							bobj = {};
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
	}, // getBlockBy

	get(req,res) { // trae los detalles del curso por código de curso
		const key_user 	= res.locals.user;
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
	}, // get

	async getPublic(req,res) {
		var query = {};
		if(req.query.id) {
			query._id = req.query.id;
		}
		if(req.query.code) {
			query.code = req.query.code;
		}
		if(!req.query.code && !req.query.id) {
			res.status(406).json({
				'message': 'Hace falta el id o el code del curso solicitado'
			});
			return;
		}
		try {
			const course = await Course.findOne(query)
				.select('-org -own -mod -perm -blocks -resources -currentSection -nextNumber -apiExternal -__v')
				.lean();
			if(course) {
				course.id = course._id;
				res.status(200).json(course);
			} else {
				res.status(200).json({
					'message': 'No existe curso con el criterio de búsqueda solicitado'
				});
			}
			return;
		} catch (e) {
			sendError(res,e,'get -- Searching Course --');
		}
	}, //getPublic

	export(req,res) { // exportar curso por code o id
		const key_user 	= res.locals.user;
		var query = { _id: req.query.id };
		if(!req.query.id) {
			query = { code: req.query.code, org: key_user.org._id };
		}
		Course.findOne(query)
			.then((course) => {
				if(course){
					res.status(StatusCodes.OK).json({course});
				} else {
					res.status(StatusCodes.NOT_FOUND).json({
						'message': 'Error 1450: Couse -'+ course.code + '- does not exist'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'get -- Export Course --');
			});
	}, // get

	getBlocklist(req,res) { // trae la lista de bloques del curso
		const key_user 	= res.locals.user;
		var query = { code: req.query.code, org: key_user.org._id };
		if(req.query.id){
			query = { _id: req.query.id};
		}
		var section1 = req.query.section1;
		var section2 = req.query.section2;
		Course.findOne(query)
			.populate({
				path: 'blocks',
				select: 'code type title section number order status isVisible w wq wt questionnarie task media',
				match: { section: {$gte: section1, $lte: section2}},
				options: { sort: {order: 1} }
			})
			.then((course) => {
				if(course) {
					const result = permissions.access(key_user,course,'content');
					if(result.canRead) {
						var send_blocks = [];
						const blocks = course.blocks;
						blocks.forEach(function(block) {
							send_blocks.push({
								id						: block._id,
								code					: block.code,
								type					:	block.type,
								title					:	block.title,
								section				: block.section,
								number				: block.number,
								order					: block.order,
								status				: block.status,
								isVisible			: block.isVisible,
								media 				: block.media,
								w							: block.w,
								wq						: block.wq,
								wt						: block.wt,
								task					: block.task,
								questionnarie : block.questionnarie
							});
						});
						res.status(200).json({
							'status': 200,
							'message': {
								blockNum			: send_blocks.length,
								currentSection: course.currentSection,
								nextNumber		: course.nextNumber,
								blocks				: send_blocks
							}
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
	},// getBlocklist

	async getBlocklistStudents(req,res) { // trae la lista de bloques para el estudiante. Este API es
		// reemplazado por mygroup
		var query = {
			isVisible: true
		};
		if(req.query.code) {
			query.code = req.query.code;
		} else {
			query._id = req.query.id;
		}
		const course = await Course.findOne(query)
			.populate({
				path: 'blocks',
				select: 'id title type section number duration durationUnits w wq wt isVisible status',
				options: { sort: {order: 1} }
			})
			.select('isVisible status')
			.catch((err) => {
				sendError(res,err,'getBlocklist -- Searching Course --');
				return;
			});
		if(!course) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'Curso solicitado no está disponible'
			});
		}
		if(!course.isVisible || course.status !== 'published') {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'El curso solicitado no está visible o no está disponible por el momento'
			});
		}
		const blocks = course.blocks;
		var send_blocks = [];
		blocks.forEach(function(block) {
			if(block.isVisible && block.status === 'published') {
				var send_block = {};
				send_block = {
					id			: block._id,
					title		: block.title,
					section	: block.section,
					number	: block.number,
					type		: block.type
				};
				if(block.duration) {
					send_block.duration = block.duration + block.durationUnits;
				}
				if(block.w) {
					send_block.w 	= block.w;
				}
				if(block.wq) {
					send_block.wq = block.wq;
				}
				if(block.wt) {
					send_block.wt = block.wt;
				}
				send_blocks.push(send_block);
			}
		});
		res.status(StatusCodes.OK).json(send_blocks);
	},// getBlocklist

	createQuestionnarie(req,res) { // crea un cuestionario asociado a un bloque
		const key_user 	= res.locals.user;
		var queryBlock = {};
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
						org					: block.org,
						type				: req.body.questionnarie.type || 'quiz',
						begin				: req.body.questionnarie.begin || false,
						minimum			: req.body.questionnarie.minimum || 60,
						maxAttempts	: req.body.questionnarie.maxAttempts || 5,
						questions		: req.body.questionnarie.questions,
						w						: req.body.questionnarie.w || 1,
						version			: 1,
						keywords		: req.body.questionnarie.keywords || [],
						isVisible		: req.body.questionnarie.isVisible || true,
						shuffle			: req.body.questionnarie.shuffle || false,
						show				: req.body.questionnarie.show || 0,
						diagnostic	: req.body.questionnarie.diagnostic || { aspects : [] },
						own					: {
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
					if(req.body.questionnarie && req.body.questionnarie.maxAttempts) {
						questionnarie.maxAttempts = req.body.questionnarie.maxAttempts;
					}
					Questionnarie.create(questionnarie)
						.then((quest) => {
							block.questionnarie = quest._id;
							block.type 	= 'questionnarie';
							block.w 		= 1;
							block.wq		= 1;
							if(req.body.w === 0) {
								block.w = 0;
							}
							if(req.body.wq === 0) {
								block.wq = 0;
							}
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
						})
						.catch((err) => {
							sendError(res,err,'createQuestionnarie -- Creating questionnarie --');
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
	}, // createQuestionnarie

	getQuestionnarie(req,res) {
		//const key_user 	= res.locals.user;
		var blockid = req.query.blockid;
		Block.findById(blockid)
			.then((block) => {
				if(block) {
					if(block.questionnarie) {
						Questionnarie.findById(block.questionnarie)
							.then((quest) => {
								if(quest) {
									var send_questionnarie = {
										id						: quest.id,
										type					: quest.type,
										begin					: quest.begin,
										minimum				: quest.minumim,
										repeatIfFail	:	quest.repeatIfFail,
										repeatIfPass	: quest.repeatIfPass,
										w							: quest.w,
										version				: quest.version,
										keywords			: quest.keywords,
										isVisible			: quest.isVisible
									};
									var send_questions = [];
									if(quest.questions) {
										var question = {};
										quest.questions.forEach(function(q) {
											question = {
												type				: q.type,
												header			: q.header,
												footer			: q.footer,
												footerShow	: q.footerShow,
												text				: q.text,
												group				: q.group,
												help				: q.help,
												isVisible		: q.isVisible,
												w						: q.w
											};
											if(q.options && q.options.length > 0) {
												var options = [];
												q.options.forEach(function(o) {
													options.push({
														name	: o.name,
														value	: o.value
													});
												});
												question.options = options;
											}
											var answers = [];
											var answer = {};
											q.answers.forEach(function(a) {
												answer = {
													type	: a.type,
													index	: a.index,
													text	: a.text,
													tf		: a.tf,
												};
												if(a.group && a.group.length > 0) {
													answer.group = a.group;
												}
											});
											answers.push(answer);
											question.answers = answers;
											send_questions.push(question);
										});
										send_questionnarie.questions = send_questions;
									}
									res.status(202).json({
										'status': 202,
										'message': send_questionnarie
									});
								} else {
									res.status(404).json({
										'status': 404,
										'message': 'Error 1455: This block have a questionnarie related, but the questionnarie cannot found'
									});
								}
							})
							.catch((err) => {
								sendError(res,err,'getQuestionnarie -- Searching block --');
							});
					} else {
						res.status(404).json({
							'status': 404,
							'message': 'Error 1455: This block does not have a questionnarie related'
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
				sendError(res,err,'getQuestionnarie -- Searching block --');
			});
	}, //getQuestionnarie

	addQuestions(req,res) { // agrega preguntas al cuestionario
		//const key_user 	= res.locals.user;
		var query = { _id: req.query.id };
		Questionnarie.findOne(query)
			.then((quest) => {
				if(quest) {
					req.body.questionnarie.questions.forEach(function(question) {
						quest.questions.push(question);
					});
					quest.save()
						.then(() => {
							res.status(200).json({
								'status': 200,
								'message': 'Questions added'
							});
						})
						.catch((err) => {
							sendError(res,err,'addQuestion -- Saving Questionnarie --');
						});
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'Error 1455: Questionnarie not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'addQuestion -- Searching questionnarie --');
			});
	}, // addQuestions

	createTasks(req,res) { // crea un conjunto de tareas asociadas a un bloque
		const key_user 	= res.locals.user;
		var queryBlock = {};
		if(req.body.id) {
			queryBlock = { _id: req.body.id};
		} else if(req.body.code) {
			queryBlock = { code: req.body.code, org: key_user.org._id };
		}
		var justDelivery = false;
		if(req.body.justDelivery) {
			justDelivery = true;
		}
		Block.findOne(queryBlock)
			.then((block) => {
				if(block) {
					var date = new Date();
					var task = new Task();
					task.items 		= req.body.tasks;
					task.justDelivery = justDelivery;
					task.org 			= key_user.org._id;
					task.orgUnit 	= key_user.orgUnit._id;
					task.version 	= 1;
					task.own 			=  {
						user: key_user.name,
						org: key_user.org.name,
						orgUnit: key_user.orgUnit.name
					};
					task.mod			= [{
						by: key_user.name,
						when: date,
						what: 'Questionnarie creation'
					}];
					task.perm 		= {
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
					};
					task.save()
						.then((task) => {
							block.task = task._id;
							block.type = 'task';
							block.save()
								.then(() => {
									res.status(200).json({
										'status': 200,
										'message': 'tasks created at block -' + block._id +'-'
									});
								})
								.catch((err) => {
									sendError(res,err,'createTasks -- Saving Block --');
								});
						})
						.catch((err) => {
							sendError(res,err,'createTasks -- Saving single task --');
						});


				} else {
					res.status(404).json({
						'status': 404,
						'message': 'Error 1458: Block requested not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'createTaks -- Searching Block --');
			});
	}, // createTasks

	createResource(req,res) {
		const key_user 	= res.locals.user;
		var queryCourse = {};
		if(req.body.coursecode) {
			queryCourse = { code: req.body.coursecode };
		} else if(req.body.courseid) {
			queryCourse = { code: req.body.courseid		};
		}
		Course.findOne(queryCourse)
			.then((course) => {
				if(course) {
					var resource 			= new Resource();
					resource.org 			= key_user.org._id;
					resource.content 	= req.body.content;
					resource.title 		= req.body.title;
					resource.embedded	= req.body.embedded;
					resource.status		= req.body.status;
					resource.course 	= course._id;
					resource.own = {
						user: key_user.name,
						org: key_user.org.name,
						orgUnit: key_user.orgUnit.name
					};
					resource.mod = generateMod(key_user.name,'Resource creation');
					resource.perm = generatePerm(key_user.name,key_user.org.name,key_user.orgUnit.name);
					resource.save()
						.then((resource) => {
							const result = permissions.access(key_user,course,'content');
							if(course.own.user === key_user.name || result.canModify ) {
								course.resources.push(resource._id);
								course.save()
									.then(() => {
										res.status(201).json({
											'status': 200,
											'message': 'Resource -' + resource.title + '- of course -' + course.code + '- was saved.'
										});
									})
									.catch((err) => {
										sendError(res,err,'createResource -- Relating resource, saving course --');
									});
							}
						})
						.catch((err) => {
							if(err.message.indexOf('E11000 duplicate key error collection') !== -1 ) {
								res.status(406).json({
									'status': 406,
									'message': 'Error 1439: Resource -' + req.body.title + '- already exists'
								});
							} else {
								sendError(res,err,'createResource -- Saving Resource --');
							}
						});
					// aquí
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'Course not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'createResource -- Searching Course --');
			});
	}, // createResource

	getResource(req,res) {
		//const key_user 	= res.locals.user;
		var query = {};
		if(req.query.code) {
			query = {code: req.query.code};
		}
		if(req.query.id) {
			query = {_id: req.query.id};
		}
		Course.findOne(query)
			.populate({
				path: 'resources',
				select: 'title content status isVisible embedded'
			})
			.select('code title resources')
			.then((course) => {
				if(course) {
					if(course.resources && course.resources.length > 0) {
						var send_resources = [];
						course.resources.forEach(function(resource) {
							send_resources.push({
								resourceid	: resource._id,
								title				: resource.title,
								content			: resource.content,
								embedded		: resource.embedded,
								status			: resource.status,
								isVisible 	: resource.isVisible
							});
						});
						res.status(200).json({
							'status'	: 200,
							'course'	: course.code,
							'message'	: send_resources
						});
					} else {
						res.status(404).json({
							'status'	: 404,
							'message'	: 'No resources found for couse -' + course.code + '-'
						});
					}
				} else {
					res.status(404).json({
						'status'	: 404,
						'message'	: 'Course not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'getResourceAuthor -- Searching Course --');
			});
	}, //getResource

	modifyResource(req,res) {
		const key_user 	= res.locals.user;
		Resource.findById(req.body.id)
			.then((resource) => {
				if(resource) {
					if(req.body.content		) {resource.content 		= req.body.content;		}
					if(req.body.title			) {resource.title 			= req.body.title;			}
					if(req.body.embedded	) {resource.embedded		= req.body.embedded;	}
					if(req.body.status		) {resource.status			= req.body.status;		}
					if(req.body.isVisible	) {resource.isVisible		= req.body.isVisible;	}
					resource.mod.push(generateMod(key_user.name,'Resource Modification'));
					resource.save()
						.then(() => {
							res.status(201).json({
								'status': 200,
								'message': 'Resource -' + resource.title + '- was modified.'
							});
						})
						.catch((err) => {
							sendError(res,err,'modifyResource -- Saving Resource --');
						});
					// aquí
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'Resource not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'modifyResource -- Searching Resource --');
			});
	}, // modifyResource

	modify(req,res) {  // modificar propiedades del curso
		const key_user 	= res.locals.user;
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
	}, // modify

	modifyBlock(req,res) { // modificar propiedades del bloque
		const key_user 	= res.locals.user;
		Block.findById(req.body.id)
			.then((block) =>{
				if(block) {
					const result = permissions.access(key_user,block,'content');
					if(result) {
						var date = new Date();
						var mod = {
							by: key_user.name,
							when: date,
							what: 'Block modification'
						};
						block.mod.push(mod);
						var req_block = req.body.block;
						if(req_block.content) 			{block.content 			= req_block.content;				}
						if(req_block.order) 				{block.order 				= req_block.order;					}
						if(req_block.number || req_block.number === 0) {block.number = req_block.number;}
						if(req_block.section || req_block.section === 0) {block.section = req_block.section;}
						if(req_block.title) 				{block.title				= req_block.title;					}
						if(req_block.code) 					{block.code					= req_block.code;						}
						if(req_block.isVisible) 		{block.isVisible		= req_block.isVisible;			}
						if(req_block.status) 				{block.status				= req_block.status;					}
						if(req_block.keywords) 			{block.keywords 		= req_block.keywords;				}
						if(req_block.media) 				{block.media 				= req_block.media;					}
						if(req_block.type) 					{block.type 				= req_block.type;						}
						if(req_block.w) 						{block.w 						= req_block.w;						}
						if(req_block.wq) 						{block.wq 					= req_block.wq;						}
						if(req_block.wt) 						{block.wt 					= req_block.wt;						}
						block.save()
							.then(() => {
								res.status(StatusCodes.OK).json({
									'message': 'Block -'+ block._id +'- modified'
								});
							})
							.catch((err) => {
								sendError(res,err,'modifyBlock -- Saving block --');
							});
					} else {
						res.status(StatusCodes.FORBIDDEN).json({
							'message': 'Error 1463: User -' + key_user.name + '- does not have permissions on requested block'
						});
					}
				} else {
					res.status(StatusCodes.NOT_FOUND).json({
						'message': 'Error 1462: block -' + req.body.id + '- not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'modifyBlock -- Searching block --');
			});
	}, // modifyBlock

	removeQuestionnarie(req,res) {
		const blockid = req.body.id;
		Block.findById(blockid)
			.then((block) => {
				if(block) {
					if(block.questionnarie) {
						Questionnarie.remove({_id:block.questionnarie})
							.then(() => {
								Block.updateMany({_id:block._id},{$unset: {questionnarie: 1}})
									.then(() => {
										res.status(200).json({
											'status': 200,
											'message': 'Questionnarie deleted'
										});
									})
									.catch((err) => {
										sendError(res,err,'removeQuestionnarie -- Saving block --');
									});
							})
							.catch((err) => {
								sendError(res,err,'removeQuestionnarie -- deleting questionnarie --');
							});
					} else {
						res.status(404).json({
							'status': 404,
							'message': 'Block -' + blockid + '- has not questionnarie'
						});
					}
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'Block -' + blockid + '- not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'removeQuestionnarie -- Searching block --');
			});
	}, // removeQuestionnarie

	moveBlock(req,res) { // mover orden de aparición de los bloques
		// Paso 1. 	Acomodar el orden general de los bloques (campo Order)
		//				 	aquí se necesitan refid y blockid para acomodar
		// Paso 2.	Actualizar el orden de la sección que se vió afectada
		//					2.1 Actualizar el bloque nuevo con el número de sección
		//							al que se acaba de mudar
		//							blockid.section = refid.section
		//							La sección ahora tendrá más bloques
		//					2.2	Actualizar el orden de las secciones (campo Number)
		//							Hacer recorrido por cada sección para actualizar.
		//							Si todo está correctamente definido el "order"
		//							define el orden general y solo hay que actualizar el
		//							orden en como aparecen en cada sección.
		//const key_user 	= res.locals.user;
		const courseid			= req.body.courseid;
		const blockid				= req.body.blockid;
		const refblockid		= req.body.refblockid;
		Course.findById(courseid)
			.then((course) => {
				if(course) {
					var blocks = course.blocks;
					var refblockIndex = -1;
					var blockIndex = -1;
					// buscar el indice del bloque referencia
					// en el curso hay un campo (blocks) con un arreglo de IDs de los bloques en el orden de aparición
					// el orden de los bloques en este campo debe coincidir con el "order" del bloque
					if(refblockid === 'zero') { // Si queremos poner el bloque en el order 0 (al principio de todo)
						refblockIndex = 0;				// le ponemos el string "zero". y con esto ajustamos el índice
					} else {										// del bloque referencia en 0. Y si no, buscamos el índice
						refblockIndex = blocks.findIndex(function(elem) {return elem + '' === refblockid;});
					}
					if(refblockIndex === -1) {
						res.status(404).json({
							'status': 404,
							'message': 'Reference Block -' + refblockid + '- not found'
						});
						return;
					}
					// ahora buscamos el índice del bloque queremos mover
					blockIndex = blocks.findIndex(function(elem) {return elem + '' === blockid;});
					if(blockIndex === -1) {
						res.status(404).json({
							'status': 404,
							'message': 'Block -' + blockid + '- not found'
						});
						return;
					}
					// hasta aquí, ya tenemos ambos indices ahora acomodamos el arreglo
					blocks.splice(refblockIndex,0,blocks[blockIndex]);
					if(refblockIndex < blockIndex ) {
						blocks.splice(blockIndex + 1,1);
					}
					if (refblockIndex > blockIndex) {
						blocks.splice(blockIndex,1);
					}
					// realizar el cambio de sección para blockid
					// buscar bloque refid y solo traernos la sección y se la pegamos
					// a blockid
					Block.find({_id: {$in: blocks}},{section:1, number:1, order: 1})
						.then((dbBlocks) => {
							var order = 0;
							var section = 0; // antes de considerar el bloque 0.0 este parámetro estaba en 1
							var number = 0;
							var refsection = 0;
							dbBlocks.forEach(function(block) {
								if(refblockid === block._id + '') {
									refsection = block.section;
								}
							});
							var newDBblock = {};
							blocks.forEach(function(block) { // y actualizamos order en los bloques
								dbBlocks.forEach(function(dbBlock) {
									if(dbBlock._id +'' === block + '') {
										newDBblock = {
											_id: dbBlock._id,
											section: dbBlock.section,
											number: dbBlock.number,
											order: dbBlock.order
										};
									}
									return;
								});
								if(blockid +'' === newDBblock._id +'') {
									newDBblock.section = refsection;
								}
								// 	si encontramos el bloque que se movió
								//		le ponemos la sección del bloque referencia
								// 		antes de que se corrijan las secciones
								if(section < newDBblock.section) {
									section++;
									number=0;
								} // 	si cambiamos de seccion entonces
								//		actualizamos bucle de números
								Block.findByIdAndUpdate(block,{$set: {
									section	: section,
									number	: number,
									order		: order
								}})
									.catch((err) => {
										sendError(res,err,'moveBlock -- ForEach saving blocks --');
									});
								number++;
								order++;
							});
						})
						.catch((err) => {
							sendError(res,err,'moveBlock -- Finding ref block --');
						});
					course.blocks = blocks;
					course.save()
						.catch((err) => {
							sendError(res,err,'moveBlock -- Saving course --');
						});
					res.status(200).json({
						'status': 200,
						'message': {
							'blocksNum'	: blocks.length,
							'blocks'		: blocks
						}
					});
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'Course -' + courseid + '- not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'moveBlock -- Searching Course --');
			});
	}, // moveBlock

	setBlockOrder(req,res) {
		const blockid			= req.body.blockid;
		const section			=	req.body.section;
		const number			=	req.body.number;
		Block.findById(blockid)
			.then((block) => {
				if(block){
					block.section = section;
					block.number 	= number;
					block.save()
						.then(() => {
							res.status(200).json({
								'message': 'block saved'
							});
						})
						.catch((err) => {
							sendError(res,err,'setBlockOrder -- Saving block --');
						});
				} else {
					res.status(404).json({
						'message': 'block not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'setBlockOrder -- Searching block --');
			});
	}, //setBlockOrder

	newSection(req,res) {
		const key_user 	= res.locals.user;
		var query		= '';
		if(req.body.courseid) {
			query = {_id: req.body.courseid};
		}
		if(req.body.coursecode) {
			query = {code: req.body.coursecode};
		}
		Course.findOne(query)
			.then((course) => {
				course.currentSection++;
				course.nextNumber = 0;
				course.mod.push(generateMod(key_user.name,'Section -' + course.currentSection + '- created'));
				course.save()
					.then(() => {
						res.status(200).json({
							'status'	: 200,
							'message'	: 'Section -' + course.currentSection + '- created'
						});
					})
					.catch((err) => {
						sendError(res,err,'newSection -- Saving course --');
					});
			})
			.catch((err) => {
				sendError(res,err,'newSection -- Searching course --');
			});
	}, //newSection

	setNextSection(req,res) {
		const key_user 				= res.locals.user;
		const currentSection 	= req.body.section;
		const nextNumber 			= req.body.number;
		var query		= '';
		if(req.body.courseid) {
			query = {_id: req.body.courseid};
		}
		if(req.body.coursecode) {
			query = {code: req.body.coursecode};
		}
		Course.findOne(query)
			.then((course) => {
				course.currentSection = currentSection;
				course.nextNumber = nextNumber;
				course.mod.push(generateMod(key_user.name,'Section -' + course.currentSection + 'nextNumber -' + course.nextNumber +'- modified'));
				course.save()
					.then(() => {
						res.status(200).json({
							'status'	: 200,
							'message'	: 'New Section -' + course.currentSection + 'nextNumber -' + course.nextNumber +'- modified'
						});
					})
					.catch((err) => {
						sendError(res,err,'newSection -- Saving course --');
					});
			})
			.catch((err) => {
				sendError(res,err,'setNextSection -- Searching course --');
			});
	},

	makeAvailable(req,res) { // pone disponible el curso y los bloques del curso
		//const key_user 	= res.locals.user;

		async function delKeys() {
			const key = await cache.keys('course:list:*');
			await cache.del(key);
		}

		const coursecode = req.body.code;
		Course.findOne({code: coursecode})
			.then((course) => {
				course.status = 'published';
				course.isVisible = true;
				course.save()
					.then((course) => {
						Block.find({_id: {$in: course.blocks}})
							.sort({order:1})
							.then((blocks) => {
								var status = 'ok';
								var details = [];
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
									delKeys();
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
	}, // makeAvailable

	async addSection(req,res) {
		const coursecode = req.params.coursecode;
		const section = parseInt(req.params.section);
		try {
			const course = await Course.findOne({code: coursecode});
			if(course) {
				if(course.blocks && Array.isArray(course.blocks) && course.blocks.length > 0) {
					try {
						const result = await Block.updateMany({_id: {$in: course.blocks}, section: {$gte: section}}, {$inc:{section:1}});
						res.status(StatusCodes.OK).json({
							'message': `Curso ${coursecode} encontró ${result.n} y actualizó ${result.nModified} bloques`
						});
					} catch (err) {
						Err.sendError(res,err,'course_controller','addSection -- updating blocks --');
					}
				} else {
					res.status(StatusCodes.NOT_FOUND).json({
						'message': `Curso ${coursecode} no tiene bloques`
					});
				}
			} else {
				res.status(StatusCodes.NOT_FOUND).json({
					'message': `Curso ${coursecode} no fue encontrado`
				});
			}
		} catch (err) {
			Err.sendError(res,err,'course_controller','addSection -- Finding Course --');
		}
	}, //addSection

	async modifySection(req,res) {
		const coursecode = req.params.coursecode;
		const section = parseInt(req.params.section);
		const newSection = parseInt(req.params.newsection);
		try {
			const course = await Course.findOne({code: coursecode}).populate({
				path: 'blocks',
				select: 'section',
				match: { section: section},
			});
			if(course) {
				if(course.blocks && Array.isArray(course.blocks) && course.blocks.length > 0) {
					var blocks = [];
					course.blocks.forEach(block => {
						blocks.push(block._id);
					});
					try {
						const result = await Block.updateMany({_id: {$in: blocks}}, {section:newSection});
						res.status(StatusCodes.OK).json({
							'message': `Curso ${coursecode} encontró ${result.n} y actualizó ${result.nModified} bloques`
						});
					} catch (err) {
						Err.sendError(res,err,'course_controller','addSection -- updating blocks --');
					}
				} else {
					res.status(StatusCodes.NOT_FOUND).json({
						'message': `Curso ${coursecode} no tiene bloques`
					});
				}
			} else {
				res.status(StatusCodes.NOT_FOUND).json({
					'message': `Curso ${coursecode} no fue encontrado`
				});
			}
		} catch (err) {
			Err.sendError(res,err,'course_controller','addSection -- Finding Course --');
		}
	}, //modifySection

	createDependency(req,res) {
		const blockid 		= req.body.blockid;
		const onBlock 		= req.body.onblockid;
		var createAttempt = false;
		var track 				= false;
		var saveTask			= false;

		if(req.body.createattempt	) { createAttempt = true; }
		if(req.body.track					)	{ track 				= true; }
		if(req.body.saveTask			) { saveTask 			= true; }

		var dependency = new Dependency({
			block					: blockid,
			onBlock				: onBlock,
			createAttempt	: createAttempt,
			track					: track,
			saveTask			: saveTask
		});
		dependency.save()
			.then(() => {
				res.status(200).json({
					'status': 200,
					'message': 'Dependency created'
				});
			})
			.catch((err) => {
				sendError(res,err,'createDependency.courses -- Saving Dependency --');
			});
	} //createDependency
};

function sendError(res, err, section) {
	logger.error('Course controller -- Section: ' + section + '----');
	logger.error(err);
	res.status(500).json({
		'message': 'Error',
		'Error': err.message
	});
}

function parseArray(myarr) {
	const myarr_temp = myarr;
	if(!Array.isArray(myarr_temp)) {
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
		id: 					course._id,
		orgid: 				course.org._id,
		orgname: 			course.org.name,
		code: 				course.code,
		title: 				course.title,
		type: 				course.type,
		level: 				course.level,
		author: 			course.author,
		categories: 	course.categories,
		keywords: 		course.keywords,
		description: 	course.description,
		image: 				course.image,
		details: 			course.details,
		syllabus: 		course.syllabus,
		price: 				course.price,
		status: 			course.status,
		isVisible: 		course.isVisible,
		apiExternal: 	course.apiExternal,
		currentSection: course.currentSection,
		nextNumber: 	course.nextNumber
	};
}

function prettyGetBlockBy(obj){
	return {
		id						: obj._id,
		org						: obj.org,
		code					: obj.code,
		type 					: obj.type,
		title					: obj.title,
		section				: obj.section,
		number				: obj.number,
		order					: obj.order,
		content				: obj.content,
		keywords			: obj.keywords,
		tasks					: obj.tasks,
		version				: obj.version,
		media					: obj.media,
		questionnaries: prettyQuests(obj)
	};
}

function prettyQuests(obj){
	var quests = [];
	obj.questionnaries.forEach(function(quest) {
		var qqs = [];
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
			var qqans = [];
			qq.answers.forEach(function(qqan) {
				qqans.push({
					type: qqan.type,
					index: qqan.index
				});
			});
			tempqq.answers = qqans;
			var qqopt = [];
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
