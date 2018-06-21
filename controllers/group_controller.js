const mongoose 		= require('mongoose');
const User 				= require('../src/users'										);
const Course 			= require('../src/courses'									);
const Group 			= require('../src/groups'										);
const Roster 			= require('../src/roster'										);
const Certificate = require('../src/certificates'							);
const Block 			= require('../src/blocks'										);
const Dependency 	= require('../src/dependencies'							);
const Err 				= require('../controllers/err500_controller');
const mailjet 		= require('../shared/mailjet'								);
const TA 					= require('time-ago'												);
//const permissions = require('../shared/permissions');
//require('winston-daily-rotate-file');

/*
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
*/

const url = process.env.LIBRETA_URI;

module.exports = {
	create(req,res) {
		const key_user 	= res.locals.user;
		var group = req.body;
		Course.findOne({ _id: group.course })
			.then((course) => {
				if(course) {
					const date = new Date();
					group.org = key_user.org._id,
					group.orgUnit = key_user.orgUnit._id,
					group.own = {
						user: key_user.name,
						org: key_user.org.name,
						orgUnit: key_user.orgUnit.name
					};
					group.mod = {
						by: key_user.name,
						when: date,
						what: 'Group Creation'
					};
					group.perm = {
						users: [{ name: key_user.name, canRead: true, canModify: true, canSec: true }],
						roles: [{ name: 'isInstructor', canRead: true, canModify: false, canSec: false},
							{ name: 'isOrgContent', canRead: true, canModify: false, canSec: true}],
						orgs: [{ name: key_user.org.name, canRead: true, canModify: false, canSec: false}],
						orgUnits: [{ name: key_user.orgUnit.name, canRead: true, canModify: true, canSec: false}]
					};
					if(!group.instructor && course.type === 'tutor') {
						group.instructor = key_user._id;
					}
					group.roster = new Array();
					group.students = new Array();
					Group.create(group)
						.then((grp) => {
							res.status(200).json({
								'status': 200,
								'message': 'Group -' + grp.code + '- created'
							});
						})
						.catch((err) => {
							if(err.message.indexOf('E11000 duplicate key error collection') !== -1 ) {
								res.status(406).json({
									'status': 406,
									'message': 'Error -: group -' + group.code + '- already exists'
								});
							} else {
								Err.sendError(res,err,'group_controller','group_controller','create -- creating Group --');
							}
						});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'Error -: Course -'+ group.course + '- not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','create -- Finding Course --');
			});
	}, // create

	list(req,res) {
		const key_user 	= res.locals.user;
		var query = {org: key_user.org._id};
		if(req.query.ou) {
			query.orgUnit = req.query.ou;
		}
		Group.find(query)
			.populate('course', 'title code numBlocks')
			.populate('instructor', 'name person')
			.populate('org', 'name')
			.populate('orgUnit', 'name longName')
			.populate('students', 'name person')
			.lean()
			.then((groups) => {
				var send_groups = new Array();
				groups.forEach(function(group) {
					var send_group = {
						id					: group._id,
						code				: group.code,
						name				: group.name,
						course			: group.course.title,
						coursecode	: group.course.code,
						numBlocks		: group.course.numBlocks,
						orgUnit 		: group.orgUnit.name,
						orgUnitName	: group.orgUnit.longName,
						instructor	: group.instructor.person.fullName,
						beginDate		: group.beginDate,
						endDate			: group.endDate,
						numStudents : group.numStudents
					};
					var send_students = new Array();
					group.students.forEach(function(s) {
						send_students.push({
							fullName: s.person.fullName
						});
					});
					send_group.students = send_students;
					send_groups.push(send_group);
				});
				if(send_groups.length > 0) {
					res.status(200).json({
						'status': 200,
						'message': send_groups
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No groups found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','create -- Finding Course --');
			});
	},

	myList(req,res) {
		const key_user 	= res.locals.user;
		var query = {instructor: key_user._id};
		Group.find(query)
			.populate('course', 'title code blocks numBlocks type')
			.populate('instructor', 'name person')
			.populate('org', 'name')
			.populate('orgUnit', 'name longName')
			//.populate('roster', 'student status finalGrade track pass passDate')
			/*
			.populate({
				path: 'roster',
				model: 'rosters',
				select: 'student status finalGrade track pass passDate',
				populate: {
					path: 'student',
					select: 'person'
				}
			})
			*/
			.select('code name instructor course beginDate endDate numStudents students isActive presentBlockBy')
			.lean()
			.then((groups) => {
				var send_groups = new Array();
				groups.forEach(function(group) {
					var send_group = {
						courseTitle			: group.course.title,
						courseCode			: group.course.code,
						courseType			: group.course.type,
						numBlocks				: group.course.numBlocks,
						orgUnit 				: group.orgUnit.name,
						orgUnitName			: group.orgUnit.longName,
						groupId					: group._id,
						groupCode				: group.code,
						groupName				: group.name,
						isActive				: group.isActive,
						instructor			: group.instructor.person.fullName,
						beginDate				: group.beginDate,
						endDate					: group.endDate,
						numStudents 		: group.students.length,
						presentBlockBy	: group.presentBlockBy
					};
					/*
					var send_students = new Array();
					group.roster.forEach(function(s) {
						send_students.push({
							fullName: s.student.person.fullName
						});
					});
					send_group.students = send_students;
					*/
					send_groups.push(send_group);
				});
				if(send_groups.length > 0) {
					res.status(200).json({
						'status': 200,
						'message': send_groups
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No groups found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','create -- Finding Course --');
			});
	},

	createRoster(req,res){
		const key_user 	= res.locals.user;
		var roster = req.body;
		var org 	 = '';
		if(!roster.org) {
			org = key_user.org;
		}
		const date = new Date();
		const link = url;
		Group.findOne({ org: org, code: roster.code })
			.populate({
				path: 'course',
				select: 'blocks title',
				populate: {
					path: 'blocks',
					select: 'section w wq wt',
					options: { sort: {order: 1} }
				}
			})
			.then((group) => {
				if(group) {
					var mod = {
						by: key_user.name,
						when: date,
						what: 'Adding student to roster'
					};
					const blocks			= group.course.blocks;
					Dependency.find({block: {$in: blocks}})
						.then((deps) => {
							if(deps.length > 0 ) { // completar "blocks" con las dependencias
								deps.forEach(function(dep) {
									var foundB = false;
									var foundOnB = false;
									var cursor = 0;
									while (!(foundB && foundOnB) && cursor < blocks.length) {
										if(dep.block +'' === blocks[cursor]._id +'') {
											if(!blocks[cursor].dependencies) {
												blocks[cursor].dependencies = new Array();
											}
											blocks[cursor].dependencies.push({
												dep						: dep._id,
												createAttempt	: false,
												track					: false,
												saveTask			: false
											});
											foundB = true;
										}
										if(dep.onBlock +'' === blocks[cursor]._id +'') {
											if(!blocks[cursor].dependencies) {
												blocks[cursor].dependencies = new Array();
											}
											blocks[cursor].dependencies.push({
												dep						: dep._id
											});
											foundOnB = true;
										}
										cursor ++;
									}
								});
							}
							User.find({_id: { $in: roster.roster}})
								.select('person')
								.then((students) => {
									var my_roster 		= new Array();
									var new_students	= new Array();
									students.forEach(function(student) {
										var grade = new Array();
										var sec = 0;
										blocks.forEach(function(block) {
											grade.push({
												block					: block._id,
												track					: 0,
												maxGradeQ 		: 0,
												gradeT				: 0,
												w							: block.w,
												wq						: block.wq,
												wt						: block.wt,
												dependencies	: block.dependencies
											});
											if(block.section !== sec) {
												sec++;
											}
										});
										if(blocks[0].section === 0) {
											sec++;
										}
										var sections = new Array();
										var j = 0;
										while (j < sec) {
											var section = {};
											if (group.presentBlockBy && group.presentBlockBy === 'dates' && group.dates && group.dates.length > 0) {
												section.beginDate = group.dates[j].beginDate;
												section.endDate		= group.dates[j].endDate;
											}
											sections.push(section);
											j++;
										}
										var new_roster = new Roster({
											student		: student,
											status		: 'pending',
											grades		: grade,
											group			: group._id,
											minGrade	: group.minGrade,
											minTrack	: group.minTrack,
											org				: group.org,
											orgUnit		: group.orgUnit,
											sections 	: sections,
											admin 		: [{
												what		: 'Roster creation',
												who			: key_user.name,
												when		: date
											}]
										});
										new_students.push(student._id);
										my_roster.push(new_roster._id);
										new_roster.save()
											.then(() => {
												mailjet.sendMail(student.person.email, student.person.name, 'Has sido enrolado al curso ' + group.course.title,339994,link,group.course.title);
											})
											.catch((err) => {
												Err.sendError(res,err,'group_controller','createRoster -- Saving Student --');
											});
									});
									group.students 	= group.students.concat(new_students);
									group.roster		= group.roster.concat(my_roster);
									group.mod.push(mod);
									group.save()
										.catch((err) => {
											Err.sendError(res,err,'group_controller','createRoster -- Saving group -- user: ' +
												key_user.name + ' groupid: ' + group._id);
										});
									res.status(200).json({
										'status': 200,
										'message': 'Roster created'
									});
									/*
									group.mod.push(mod);
									group.save()
										.then(() => {
											res.status(200).json({
												'status': 200,
												'message': 'Roster created'
											});
										})
										.catch((err) => {
											Err.sendError(res,err,'group_controller','createRoster -- Saving Group --');
										});
										*/
								})
								.catch((err) => {
									Err.sendError(res,err,'group_controller','createRoster -- Finding Users --');
								});
						}) // seguramente meter el resto del código dentro de la promesa
						.catch((err) => {
							Err.sendError(res,err,'group_controller','createRoster -- Searching dependencies -- user: ' +
								key_user.name + ' groupid: ' + group._id);
						});
				} else {
					res.status(200).json({
						'status': 200,
						'mesage': 'Group -' + roster.code + '- not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','createRoster -- Finding Group --');
			});
	}, //createRoster

	notify(req,res) {
		var groupid 		= req.query.groupid;
		const message  	= req.query.message;
		Roster.find({group: groupid})
			.populate([
				{
					path: 'student',
					select: 'person'
				},
				{
					path: 'group',
					select: 'course',
					populate: {
						path: 'course',
						select: 'title'
					}
				}])
			.select('student group')
			.lean()
			.then((items)  => {
				if(items.length > 0) {
					items.forEach(function(roster) {
						mailjet.sendMail(roster.student.person.email, roster.student.person.name, 'Mensaje del curso ' + roster.group.course.title,391119,roster.group.course.title,message);
					});
					res.status(200).json({
						'status': 20,
						'message': 'Notification sent'
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'Students not found. Maybe wrong group id?'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','notify -- Finding Roster --');
			});
	},

	// FALTA ARREGLAR addStudent!!!
	addStudent(req,res) {
		const key_user 	= res.locals.user;
		var roster = req.body;
		var org 	 = '';
		if (!roster.org) {
			org = key_user.org;
		}
		const date = new Date();
		const link = url;
		Group.findOne({ org: org, code: roster.code })
			.then((group) => {
				User.findById(roster.student)
					.then((student) => {
						if(student){
							if(group) {
								var new_roster = new Roster({
									student		: student,
									status		: 'pending',
									grades		: [],
									group			: group._id,
									org				: group.org,
									orgUnit		: group.orgUnit
								});
								new_roster.save()
									.then((roster) => {
										group.roster.push(roster._id);
										var mod = {
											by: key_user.name,
											when: date,
											what: 'Student -' + student + '- added'
										};
										mailjet.sendMail(student.person.email, student.person.name, 'Has sido enrolado a un curso',339994,link,group.course.title);
										group.mod.push(mod);
										group.students = group.roster;
										group.save()
											.then(() => {
												res.status(200).json({
													'status': 200,
													'message': 'Student added'
												});
											})
											.catch((err) => {
												Err.sendError(res,err,'group_controller','addStudent -- Saving Group --');
											});
									})
									.catch((err) => {
										Err.sendError(res,err,'group_controller','createRoster -- Saving Student --');
									});
							} else {
								res.status(200).json({
									'status': 200,
									'mesage': 'Group -' + roster.code + '- not found'
								});
							}
						} else {
							res.status(200).json({
								'status': 200,
								'mesage': 'Student -' + roster.student + '- not found'
							});
						}
					})
					.catch((err) => {
						Err.sendError(res,err,'group_controller','addStudent -- Finding Student --');
					});
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','addStudent -- Finding Group --');
			});
	}, //addStudent

	listRoster(req,res) {
		// ESTE API debe arreglarse para listar solo a personal autorizado
		const key_user 	= res.locals.user;
		var roster 	= req.query;
		var query 	= {};
		if(roster.org) {
			query.org = roster.org;
		} else {
			query.org = key_user.org;
		}
		if(roster.code) {
			query.code = roster.code;
		}
		if(roster.id) {
			query = { _id: roster.id };
		}
		Group.findOne(query)
			.populate('instructor', 'name person')
			.populate('orgUnit', 'name longName')
			.populate({
				path: 'course',
				select: 'blocks title',
				populate: {
					path: 'blocks',
					select: 'section number'
				}
			})
			//.populate('students','name status person student')
			.populate({
				path: 'roster',
				model: 'rosters',
				select: 'student status finalGrade track pass passDate newTask grades',
				populate: {
					path: 'student',
					select: 'name status person student'
				}
			})
			.select('code name beginDate endDate orgUnit roster')
			.lean()
			.then((group) => {
				if(group) {
					var send_group = {
						id					: group._id,
						code				: group.code,
						name				: group.name,
						course			: group.course.title,
						instructor	: group.instructor.person.fullName,
						beginDate		: group.beginDate,
						endDate			: group.endDate,
						orgUnit			: group.orgUnit.name,
						orgUnitLong	: group.orgUnit.longName,
						numStudents : group.roster.length,
					};
					var students = new Array();
					group.roster.forEach(function(s) {
						if(!s.pass) {
							s.pass = false;
						}
						var send_student = {
							id					: s.student._id,
							username		: s.student.name,
							status			: s.status,
							name				: s.student.person.fullName,
							finalGrade	: s.finalGrade,
							track				: s.track,
							pass				: s.pass,
							passDate		: s.passDate,
							newTask			: s.newTask
						};

						var send_grades = new Array();
						var send_grade 	= {};
						var flag 				= false;
						if(s.grades && s.grades.length > 0) {
							s.grades.forEach(function(g) {
								if(g.w && g.w > 0) {
									if(g.wt && g.wt > 0) {
										if(g.tasks && g.tasks.length > 0) {
											var found = false;
											var numBlocks = 0;
											var blocks = [];
											if(group.course && group.course.blocks && group.course.blocks.length > 0) {
												numBlocks = group.course.blocks.length;
												blocks = group.course.blocks;
											}
											var b = 0;
											while (b<numBlocks && !found) {
												if(blocks[b]._id + '' === g.block + '') {
													send_grade.blockid	= blocks[b]._id,
													send_grade.section 	= blocks[b].section;
													send_grade.number		= blocks[b].number;
													if(g.tasktries && g.tasktries > 0) {
														send_grade.taskDelivered = true;
													} else {
														send_grade.taskDelivered = false;
													}
													send_grade.track = g.track;
													if(g.gradeT > 0){
														send_grade.taskGrade 	= g.gradeT;
													}
													if(g.gradedT) {
														send_grade.gradedT		= true;
													} else {
														send_grade.gradedT		= false;
													}
													found = true;
												}
												b++;
											}
											flag = true;
										}
									}
								}
							});
							if(flag) {
								send_grades.push(send_grade);
							}
						}
						send_student.grades = send_grades;
						students.push(send_student);
					});
					send_group.students = students;
					res.status(200).json({
						'status': 200,
						'message': send_group
					});
				} else {
					if(roster.code) {
						res.status(200).json({
							'status': 200,
							'mesage': 'Group -' + roster.code + '- not found'
						});
					}
					if(roster.id) {
						res.status(200).json({
							'status': 200,
							'mesage': 'Group -' + roster.id + '- not found'
						});
					}
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','listRoster -- Finding Group --');
			});
	}, //listRoster

	myGroups(req,res) {
		const key_user 	= res.locals.user;
		Roster.find({student: key_user._id})
			.populate({
				path: 'group',
				model: 'groups',
				select: 'code _id name beginDate endDate presentBlockBy lapse',
				populate: [
					{
						path: 'course',
						model: 'courses',
						select: 'title _id code blocks numBlocks duration durationUnits'
					},
					{
						path: 'instructor',
						model: 'users',
						select: 'person.name person.fatherName'
					}
				]
			})
			.lean()
			.then((items) => {
				if(items.length > 0) {
					var send_groups = new Array();
					items.forEach(function(item) {
						var send_group = {};
						send_group = {
							code						: item.group.code,
							groupid					: item.group._id,
							name						: item.group.name,
							course					: item.group.course.title,
							courseid				: item.group.course._id,
							courseCode			: item.group.course.code,
							courseBlocks		: item.group.course.numBlocks,
							instructor			: item.group.instructor.person.name + ' ' + item.group.instructor.person.fatherName,
							presentBlockBy	: item.group.presentBlockBy,
							myStatus				: item.status,
							track						: item.track,
							firstBlock			: item.group.course.blocks[0]
						};
						if(item.group.course.duration) {
							send_group.duration = item.group.course.duration + item.group.course.durationUnits;
						}
						if(item.group.course.beginDate) {
							send_group.beginDate = item.group.course.beginDate;
						}
						if(item.group.course.endDate) {
							send_group.endDate = item.group.course.endDate;
						}
						if(item.group.presentBlockBy === 'lapse' && item.group.lapse) {
							send_group.lapse = item.group.course.lapse;
						}
						send_groups.push(send_group);
					});
					res.status(200).json({
						'status': 200,
						'message': {
							'student'		: key_user.person.fullName,
							'numgroups'	: items.length,
							'groups'		: send_groups
						}
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No groups found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','mygroups -- Finding groups through Roster --');
			});
	}, // mygroups

	myGroup(req,res) {
		const key_user 	= res.locals.user;
		const groupid		= req.query.groupid;
		Roster.findOne({student: key_user._id, group: groupid})
			.populate({
				path: 'group',
				select: 'course',
				populate: {
					path: 'course',
					select: 'blocks numBlocks',
					populate: {
						path: 'blocks',
						match: { isVisible: true, status: 'published' },
						select: 'title type section number questionnarie task duration durationUnits'
					}
				}
			})
			.lean()
			.then((item) => {
				if(item) {
					var myStatus 	= item.status;
					var course		= item.group.course._id;
					var blocks 		= new Array();
					if(item.group.course.blocks && item.group.course.blocks.length > 0) {
						blocks = item.group.course.blocks;
					}
					var new_blocks	= new Array();
					var new_block		= {};
					blocks.forEach(function(block) {
						new_block = {
							id						: block._id,
							title					: block.title,
							section 			: block.section,
							number				: block.number,
							order 				: block.order,
							type					: block.type,
							track					: false,
							questionnarie : false,
							task					: false
						};
						item.grades.forEach(function(grade) {
							if(grade.block + '' === block._id + '') {
								if(grade.track === 100) {
									new_block.track = true;
								}
							}
						});
						if(block.number === 0) {
							if(block.duration) {
								new_block.duration = block.duration + ' ' + units(block.durationUnits,block.duration);
							}
							if(item.sections && item.sections.length > 0 && item.sections[block.section] && !item.sections[block.section].viewed) {
								if(item.sections && item.sections.length > 0 && item.sections[block.section] && item.sections[block.section].beginDate) {
									new_block.beginDate = item.sections[block.section].beginDate;
								}
								if(item.sections && item.sections.length > 0 && item.sections[block.section] && item.sections[block.section].endDate) {
									new_block.endDate = item.sections[block.section].endDate;
								}
							}
						}
						if(block.questionnarie) {
							new_block.questionnarie = true;
						}
						if(block.task) {
							new_block.task = true;
						}
						new_blocks.push(new_block);
					});
					res.status(200).json({
						'status': 200,
						'message': {
							student		: key_user.person.fullName,
							studentid	: key_user._id,
							roster		: item._id,
							myStatus	: myStatus,
							track			: parseInt(item.track) + '%',
							blockNum	: item.group.course.numBlocks,
							courseid	: course,
							groupid		: item.group._id,
							blocks		: new_blocks
						}
					});
				}	else {
					res.status(200).json({
						'status': 200,
						'message': 'Group with id -' + groupid + '- not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','mygroup -- Finding Roster/Group --');
			});
	}, // mygroup

	getGroups(req,res) {
		//const key_user	= res.locals.user;
		const username  = req.query.username;
		User.findOne({name: username})
			.select('name person')
			.then((user) => {
				if(user) {
					Roster.find({student:user._id})
						.populate({
							path: 'group',
							select: 'course code name',
							populate: {
								path: 'course',
								select: 'code title'
							}
						})
						.lean()
						.then((items) => {
							if(items.length > 0 ) {
								var send_items = new Array();
								items.forEach(function(item) {
									send_items.push({
										groupid			: item.group._id,
										group				: item.group.name,
										groupCode		: item.group.code,
										course			: item.group.course.title,
										courseCode 	:	item.group.course.code
									});
								});
								res.status(200).json({
									'status'	: 200,
									'messaage': {
										'name'	: user.person.fullName,
										'id'		: user._id,
										'groups': send_items
									}
								});
							} else {
								res.status(200).json({
									'status': 200,
									'message': 'User ' + user.person.fullName + ' -'+ user._id +'- '+' has no groups'
								});
							}
						})
						.catch((err) => {
							Err.sendError(res,err,'group_controller','getGroups -- Finding Roster Group Course --');
						});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'User not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','getGroups -- Finding User --');
			});
	}, //getGroups

	createAttempt(req,res) {
		const key_user	= res.locals.user;
		const groupid 	= req.body.groupid;
		const blockid 	= req.body.blockid;
		const answers 	= req.body.answers;
		const grade			= req.body.grade;
		const date = Date();
		var quest = {
			answers : answers,
			grade		: grade,
			attempt : date
		};
		var maxAttempts = 5;
		Roster.findOne({student: key_user._id, group: groupid})
			.populate([{
				path: 'group',
				select: 'course',
				populate: {
					path: 'course',
					select: 'blocks',
					populate: {
						path: 'blocks',
						match: { _id: blockid },
						select: 'questionnarie w wq wt',
						populate: {
							path: 'questionnarie',
							select: 'maxAttempts'
						}
					}
				}
			},
			{
				path: 'grades.dependencies.dep'
			}])
			.then((item) => {
				if(item) {
					if(item && item.group && item.group.course && item.group.course.blocks && item.group.course.blocks > 0 && item.group.course.blocks[0].questionnarie && item.group.course.blocks[0].questionnarie.maxAttempts ) {
						maxAttempts = item.group.course.blocks[0].questionnarie.maxAttempts;
					}
					var grades = [];
					var myGrade = {};
					var k = 0;
					if(item.grades.length > 0) {
						grades = item.grades;
						var len = grades.length;
						var found = false;
						while ((k < len) && !found) {
							if(grades[k].block + '' === blockid) {
								myGrade = grades[k];
								found = true;
							} else {
								k++;
							}
						}
						// verificamos las dependencias y que estas se cumplan
						const myDeps = myGrade.dependencies;

						if(myDeps.length > 0) { // hay dependencias?
							//Solo buscamos las dependencias de las que somos origen
							myDeps.forEach(function(dep) {
								if(myGrade.block +'' === dep.dep.onBlock +'') {
									found = false;
									var l = 0;
									var m	= 0;
									var founddep = false;
									while ((l < len) && !found) {
										if(grades[l].block + '' === dep.dep.block + '') {
											m=0;
											founddep = false;
											if(grades[l].dependencies && grades[l].dependencies.length > 0) {
												while((m < grades[l].dependencies.length) && !founddep) {
													if(grades[l].dependencies[m].dep._id + '' === dep.dep._id + '') {
														if(grades[l].dependencies[m].dep.createAttempt) {
															item.grades[l].dependencies[m].createAttempt = true;
														}
														founddep = true;
													}
													m++;
												}
											}
											found = true;
										}
										l++;
									}
								}
							});
						}

						if(myGrade.quests && myGrade.quests.length > 0) {
							if(myGrade.quests.length > maxAttempts - 1) {
								res.status(406).json({
									'status': 406,
									'message': 'Max number of attempts has reached. No more attempts allowed'
								});
								return;
							} else {
								if(!found) {
									myGrade.block = blockid;
								}
								myGrade.quests.push(quest);
								myGrade.gradedQ = true;
							}
						} else {
							myGrade.quests 	= [quest];
							myGrade.track		= 100;
							myGrade.gradedQ = true;
							if(!found) {
								myGrade.block = blockid;
							}
						}
						if(myGrade.w === 0) {
							if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].w) {
								myGrade.w = item.group.course.blocks[0].w;
							}
						}
						if(myGrade.wq === 0) {
							if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wq) {
								myGrade.wq = item.group.course.blocks[0].wq;
							}
						}
						if(myGrade.wt === 0) {
							if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wt) {
								myGrade.wt = item.group.course.blocks[0].wt;
							}
						}
						item.grades[k] = myGrade;
					} else {	// El siguiente bloque de código no debería existir porque al crear el roster se generan los bloques
						myGrade = {
							block	: blockid,
							quests: [quest],
							track	: 100,
							gradedQ: true
						};
						if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].w) {
							myGrade.w = item.group.course.blocks[0].w;
						}
						if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wq) {
							myGrade.wq = item.group.course.blocks[0].wq;
						}
						if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wt) {
							myGrade.wt = item.group.course.blocks[0].wt;
						}
						item.grades = [myGrade];
					}
					item.save()
						.then(() => {
							res.status(200).json({
								'status': 200,
								'message': 'Attempt saved'
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'group_controller','createAttempt -- Saving Roster --');
						});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'Roster not found with params given'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','createAttempt -- Finding Roster -- user: ' +
					key_user.name + ' id: ' + key_user._id + ' groupid: ' + groupid + ' blockid: ' + blockid );
			});
	}, // createAttempt

	saveTask(req,res) {
		const key_user	= res.locals.user;
		const groupid 	= req.body.groupid;
		const blockid 	= req.body.blockid;
		const task 			= req.body.task;
		var		force			= false;
		const now 			= new Date();

		if(req.body.force) {
			force = true;
		}

		Roster.findOne({student: key_user._id, group: groupid})
			.populate({
				path: 'group',
				select: 'course',
				populate: {
					path: 'course',
					select: 'blocks',
					populate: {
						path: 'blocks',
						match: { _id: blockid },
						select: 'task w wq wt',
						populate: {
							path: 'task',
							select: 'items justDelivery'
						}
					}
				}
			})
			.then((item) => {
				var grades = [];
				var myGrade = {};
				var k = 0;
				if(item.grades.length > 0) {
					grades = item.grades;
					var len = grades.length;
					var found = false;
					while ((k < len) && !found) {
						if(grades[k].block + '' === blockid) {
							myGrade = grades[k];
							found = true;
						} else {
							k++;
						}
					}
					if(myGrade.tasks && ((myGrade.tasks.length > 0 && force) || (myGrade.tasks.length === 0)) ) {
						if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].w) {
							myGrade.w = item.group.course.blocks[0].w;
						}
						if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wq) {
							myGrade.wq = item.group.course.blocks[0].wq;
						}
						if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wt) {
							myGrade.wt = item.group.course.blocks[0].wt;
						}

						if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].task && item.group.course.blocks[0].task.justDelivery) {
							var c = 0;
							while (c < task.length) {
								task[c].justDelivery = item.group.course.blocks[0].task.justDelivery;
								c++;
							}
						}
						myGrade.tasks = task;
						myGrade.track	= 100;
						item.grades[k] = myGrade;
						if(item.grades[k].tasktries && item.grades[k].tasktries.length > 0) {
							item.grades[k].tasktries.push(now);
						} else {
							item.grades[k].tasktries = [now];
						}
					} else if(!force && myGrade.tasks.length > 0){
						res.status(406).json({
							'status': 406,
							'message': 'Task cannot be replaced (or force by force = true)'
						});
						return;
					}
				} else {
					myGrade = {
						block	: blockid,
						track	: 100
					};
					if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].w) {
						myGrade.w = item.group.course.blocks[0].w;
					}
					if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wq) {
						myGrade.wq = item.group.course.blocks[0].wq;
					}
					if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wt) {
						myGrade.wt = item.group.course.blocks[0].wt;
					}
					if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].task && item.group.course.blocks[0].task.justDelivery) {
						task.justDelivery = item.group.course.blocks[0].task.justDelivery;
					}
					myGrade.tasks = task;
					item.grades = [myGrade];
					item.grades.tasktries = [now];
				}
				item.save()
					.then(() => {
						res.status(200).json({
							'status'				: 200,
							'message'				: 'task saved'
						});
					})
					.catch((err) => {
						Err.sendError(res,err,'group_controller','saveTask -- Saving Roster --');
					});
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','saveTask -- Finding Roster -- user: ' +
					key_user.name + ' id: ' + key_user._id + ' groupid: ' + groupid + ' blockid: ' + blockid );
			});
	}, //saveTask

	studentTask(req,res) {
		const groupid		= req.query.groupid;
		const key_user 	= res.locals.user;
		const studentid = req.query.studentid;
		const blockid 	= req.query.blockid;
		Roster.findOne({student: studentid,group: groupid})
			.populate('student', 'person')
			.populate({
				path: 'group',
				select: 'instructor course code',
				populate: {
					path: 'course',
					select: 'title'
				}
			})
			.then((item) => {
				if(item) {
					if(item.group && item.group.instructor) {
						if(item.group.instructor + '' !== key_user._id + ''){
							res.status(200).json({
								'status': 200,
								'message': 'You are not instructor for this group',
								'userid': key_user._id,
								'instructorid': item.group.instructor
							});
							return;
						} else {
							var grades = [];
							var myGrade = {};
							if(item.grades.length > 0) {
								grades = item.grades;
								var len = grades.length;
								var found = false;
								var k = 0;
								while ((k < len) && !found) {
									if(grades[k].block + '' === blockid) {
										myGrade = grades[k];
										found = true;
									} else {
										k++;
									}
								}
								if(!found) {
									res.status(200).json({
										'status'	: 200,
										'message'	: 'Block not found in roster. Maybe block from another course?'
									});
									return;
								}
								if(myGrade.tasks && myGrade.tasks.length > 0) {
									// Aqui ponemos la búsqueda del contenido del bloque
									Block.findById(blockid)
										.populate('task', 'items')
										.then((block) => {
											if(block) {
												var send_tasks = new Array();
												var t = 0;
												var lent = myGrade.tasks.length;
												while (t < lent) {
													var task 			= myGrade.tasks[t];
													var taskText 	= '';
													if(block.task && block.task.items && block.task.items.length > 0 && block.task.items[t] && block.task.items[t].text) {
														taskText = block.task.items[t].text;
													}
													var send_task = {
														taskId	: task._id,
														taskText: taskText,
														content	: task.content,
														type 		: task.type,
														label		: task.label,
														grade		: task.grade,
														graded	: task.graded,
														date		: task.date
													};
													send_tasks.push(send_task);
													t++;
												}
												res.status(200).json({
													'status'		: 200,
													'message'		: {
														'student'		: item.student.person.fullName,
														'course'		: item.group.course.title,
														'courseCode': item.group.course.code,
														'blockId'		: block._id,
														'rosterid'	: item._id,
														'taskGrade'	: myGrade.gradeT,
														'tasks'			: send_tasks
													}
												});
											} else {
												res.status(200).json({
													'status': 200,
													'message': 'No block content found'
												});
											}
										})
										.catch((err) => {
											Err.sendError(res,err,'group_controller','studentTask -- Finding Block -- user: ' +
												key_user.name + ' id: ' + key_user._id + ' groupid: ' + groupid + ' blockid: ' + blockid + ' studentid: ' + studentid);
										});
									// hasta aquí
								} else {
									res.status(200).json({
										'status': 200,
										'message': 'No task delivered yet'
									});
								}
							} else {
								res.status(200).json({
									'status': 200,
									'message': 'No task found'
								});
							}
						}
					} else {
						res.status(200).json({
							'status': 200,
							'message': 'No instructor for this group'
						});
						return;
					}
				} else { // if(item)
					res.status(200).json({
						'status': 200,
						'message': 'No student roster found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','studentTask -- Finding Roster -- user: ' +
					key_user.name + ' id: ' + key_user._id + ' groupid: ' + groupid + ' studentid: ' + studentid + ' blockid: ' + blockid);
			});
	}, //studentTask

	gradeTask(req,res) {
		const rosterid	= req.body.rosterid;
		const blockid		= req.body.blockid;
		const taskid		= req.body.taskid;
		const grade			= req.body.grade;
		const key_user 	= res.locals.user;
		Roster.findById(rosterid)
			.then((item) => {
				if(item) {
					var len 			= item.grades.length;
					if(len === 0) {
						res.status(200).json({
							'status'	: 200,
							'message'	: 'No grades found in roster'
						});
					}
					var found			= false;
					var k 				= 0;
					var myGrade  	= 0;
					while ((k < len) && !found) {
						if(item.grades[k].block + '' === blockid) {
							myGrade = k;
							found = true;
						} else {
							k++;
						}
					}
					if(found) {
						len 	= item.grades[myGrade].tasks.length;
						if(len === 0) {
							res.status(200).json({
								'status'	: 200,
								'message'	: 'No task found in grades'
							});
						}
						found = false;
						k			= 0;
						var myTask = 0;
						while ((k < len) && !found) {
							if(item.grades[myGrade].tasks[k]._id + '' === taskid) {
								myTask = k;
								found = true;
							} else {
								k++;
							}
						}
						if(found) {
							item.grades[myGrade].tasks[myTask].grade = grade;
							item.grades[myGrade].tasks[myTask].graded = true;
							item.newTask = false;
							item.save()
								.then(() => {
									res.status(200).json({
										'status'	: 200,
										'message'	: 'Grade saved'
									});
								})
								.catch((err) => {
									Err.sendError(res,err,'group_controller','gradeTask -- Saving Roster -- user: ' +
										key_user.name + ' id: ' + key_user._id + ' rosterid: ' + rosterid + ' taskid: ' + taskid);
								});
						} else {
							res.status(200).json({
								'status'	: 200,
								'message'	: 'No task found in grades. Maybe in other group or student?'
							});
						}
					} else {
						res.status(200).json({
							'status'	: 200,
							'message'	: 'No blockid found in roster'
						});
					}
				} else {
					res.status(200).json({
						'status'	: 200,
						'message'	: 'No rosterid found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','gradeTask -- Finding Roster -- user: ' +
					key_user.name + ' id: ' + key_user._id + ' rosterid: ' + rosterid + ' taskid: ' + taskid);
			});
	}, //gradeTask



	myGrades(req,res){
		const groupid		= req.query.groupid;
		const key_user 	= res.locals.user;
		Roster.findOne({student: key_user.id, group: groupid})
			.populate({
				path: 'group',
				select: 'course certificateActive beginDate endDate',
				populate: {
					path: 'course',
					select: 'title blocks duration durationUnits',
					populate: {
						path: 'blocks',
						select: 'title section number w wq wt'
					}
				}
			})
			.then((item) => {
				if(item) {
					var blocks	= new Array();
					const bs 		= item.group.course.blocks;
					// ------------

					var grades = item.grades;
					var i=0;
					while(i < bs.length) {
						var j=0;
						var found = false;
						while(!found && j < grades.length) {
							if(bs[i]._id + '' === grades[j].block + '') {
								grades[j].w 			= bs[i].w;
								grades[j].wq 			= bs[i].wq;
								grades[j].wt 			= bs[i].wt;
								grades[j].repair	= 1;
								found = true;
							}
							j++;
						}
						if(!found) {
							grades.push({
								block	: bs[i]._id,
								w 		: bs[i].w,
								wq 		: bs[i].wq,
								wt		: bs[i].wt,
								repair: 1
							});
						}
						i++;
					}
					item.grades = grades;
					item.repair = 1;
					item.save()
						.then((item) => {
						// ------
							item.grades.forEach(function(grade) {
								if(grade.wq > 0 || grade.wt > 0) {
									var i = 0;
									var block = {};
									while (i < bs.length) {
										if(grade.block + '' === bs[i]._id + '') {
											block = {
												blockTitle	: bs[i].title,
												blockSection: bs[i].section,
												blockNumber	: bs[i].number,
												blockW			: bs[i].w
											};
											i = bs.length;
										} else {
											i++;
										}
									}
									block.grade = grade.finalGrade;
									blocks.push(block);
								}
							});

							var send_grade = {
								name							: key_user.person.fullName,
								course						: item.group.course.title,
								courseDuration		: item.group.course.duration,
								courseDurUnits		: units(item.group.course.durationUnits),
								certificateActive : item.group.certificateActive,
								beginDate					: item.group.beginDate,
								endDate						: item.group.endDate,
								beginDateSpa			: dateInSpanish(item.group.beginDate),
								endDateSpa				: dateInSpanish(item.group.endDate),
								finalGrade				: item.finalGrade,
								minGrade					: item.minGrade,
								track							: parseInt(item.track) + '%',
								minTrack					: item.minTrack + '%',
								pass							: item.pass,
								passDate					: item.passDate,
								blocks						: blocks
							};
							if(item.group.course.duration) {
								send_grade.duration 			= item.group.course.duration;
								send_grade.durationUnits	= units(item.group.course.durationUnits,item.group.course.duration);
							}
							if(item.certificateNumber > 0) {
								send_grade.certificateNumber = item.certificateNumber;
							}
							if(item.pass && item.certificateNumber === 0) {
								var cert = new Certificate;
								cert.roster = item._id;
								cert.save()
									.then((cert) => {
										send_grade.certificateNumber = cert.number;
										res.status(200).json({
											'status': 200,
											'message': send_grade
										});
									})
									.catch((err) => {
										Err.sendError(res,err,'group_controller','mygrades -- Saving certificate -- Roster: '  + item._id);
									});
							} else {
								res.status(200).json({
									'status': 200,
									'message': send_grade
								});
							}
						})
						.catch((err) => {
							Err.sendError(res,err,'group_controller','mygrades -- Reparing Roster --');
						});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'You are not enrolled in this group'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','mygrades -- Finding Roster --');
			});
	}, // myGrades

	studentGrades(req,res){
		const groupid		= req.query.groupid;
		//const key_user 	= res.locals.user;
		const studentid = req.query.studentid;
		Roster.findOne({student: studentid, group: groupid})
			.populate([{
				path: 'group',
				select: 'course certificateActive beginDate endDate',
				populate: {
					path: 'course',
					select: 'title blocks duration durationUnits',
					populate: {
						path: 'blocks',
						select: 'title section number w wq wt'
					}
				}
			},
			{
				path: 'student',
				select: 'person'
			}])
			.lean()
			.then((item) => {
				if(item) {
					var blocks	= new Array();
					const bs 		= item.group.course.blocks;
					item.grades.forEach(function(grade) {
						if(grade.wq > 0 || grade.wt > 0) {
							var i = 0;
							var block = {};
							while (i < bs.length) {
								if(grade.block + '' === bs[i]._id + '') {
									block = {
										blockTitle	: bs[i].title,
										blockSection: bs[i].section,
										blockNumber	: bs[i].number,
										blockW			: bs[i].w
									};
									i = bs.length;
								} else {
									i++;
								}
							}
							block.grade = grade.finalGrade;
							blocks.push(block);
						}
					});
					var send_grade = {
						name							: item.student.person.fullName,
						email 						: item.student.person.email,
						course						: item.group.course.title,
						certificateActive : item.group.certificateActive,
						beginDate					: item.group.beginDate,
						endDate						: item.group.endDate,
						finalGrade				: item.finalGrade,
						minGrade					: item.minGrade,
						track							: parseInt(item.track) + '%',
						minTrack					: item.minTrack + '%',
						pass							: item.pass,
						passDate					: item.passDate,
						blocks						: blocks
					};
					if(item.group.course.duration) {
						send_grade.duration 			= item.group.course.duration;
						send_grade.durationUnits	= units(item.group.course.durationUnits,item.group.course.duration);
					}
					res.status(200).json({
						'status': 200,
						'message': send_grade
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'You are not enrolled in this group'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','mygrades -- Finding Roster --');
			});
	}, // studentGrades

	studentHistoric(req,res){
		const groupid		= req.query.groupid;
		//const key_user 	= res.locals.user;
		const studentid = req.query.studentid;
		Roster.findOne({student: studentid, group: groupid})
			.populate([{
				path: 'group',
				select: 'course',
				populate: {
					path: 'course',
					select: 'blocks',
					populate: {
						path: 'blocks',
						select: 'title section number w wq wt'
					}
				}
			},
			{
				path: 'student',
				select: 'person'
			}])
			.select('sections grades')
			.lean()
			.then((item) => {
				if(item) {
					var blocks	= new Array();
					const bs 		= item.group.course.blocks;
					item.grades.forEach(function(grade) {
						if(grade.wq > 0 || grade.wt > 0) {
							var i = 0;
							var block = {};
							while (i < bs.length) {
								if(grade.block + '' === bs[i]._id + '') {
									block = {
										blockTitle	: bs[i].title,
										blockSection: bs[i].section,
										blockNumber	: bs[i].number
									};
									if(grade.wq > 0 && grade.quests.length > 0) {
										var attempts = new Array();
										grade.quests.forEach(function(attempt) {
											attempts.push(attempt.attempt);
										});
										block.blockAttempts = attempts;
									}
									if(grade.wt > 0 && grade.tasks.length > 0) {
										var tasks = new Array();
										grade.tasks.forEach(function(task) {
											tasks.push({
												taskLabel	: task.label,
												date			: task.date
											});
										});
										block.blockTasks = tasks;
									}
									i = bs.length;
								} else {
									i++;
								}
							}
							block.grade = grade.finalGrade;
							blocks.push(block);
						}
					});
					var send_grade = {
						name							: item.student.person.fullName,
						email 						: item.student.person.email,
						course						: item.group.course.title,
						blocks						: blocks
					};
					res.status(200).json({
						'status': 200,
						'message': send_grade
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'You are not enrolled in this group'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','mygrades -- Finding Roster --');
			});
	}, // studentGrades

	tookCertificate(req,res) {
		const key_user 	= res.locals.user;
		const groupid		= req.query.groupid;
		Roster.findOne({student: key_user._id, group: groupid})
			.then((item) => {
				if(item) {
					item.tookCertificate = true;
					item.save()
						.then(() => {
							res.status(200).json({
								'status'	: 200,
								'message'	: 'Roster saved'
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'group_controller','tookCertificate -- Saving Roster --');
						});
				} else {
					res.status(200).json({
						'status'	: 200,
						'message'	: 'Roster not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','tookCertificate -- Finding Roster --');
			});
	}, //tookCertificate

	getResource(req,res) {
		const key_user 	= res.locals.user;
		const groupid		= req.query.groupid;
		Roster.findOne({student: key_user._id, group: groupid})
			.populate({
				path: 'group',
				select: 'course',
				populate: {
					path: 'course',
					select: 'resources code title',
					populate: {
						path: 'resources',
						select: 'title content embedded',
						match: { status: 'published', isVisible: true}
					}
				}
			})
			.then((roster) => {
				if(roster && roster.group && roster.group.course) {
					var course = roster.group.course;
					if(course.resources && course.resources.length > 0) {
						var send_resources = new Array();
						course.resources.forEach(function(resource) {
							send_resources.push({
								title			: resource.title,
								content		: resource.content,
								embedded	: resource.embedded
							});
						});
						res.status(200).json({
							'status'	: 200,
							'course'	: course.code,
							'message'	: send_resources
						});
					} else {
						res.status(200).json({
							'status'	: 204,
							'message'	: 'No resources found for couse -' + course.code + '-'
						});
					}
				} else {
					res.status(200).json({
						'status'	: 204,
						'message'	: 'Course not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','getResource -- Searching Course --');
			});
	}, //getResource

	nextBlock(req,res) {
		//const key 			= req.headers.key;
		const groupid 	= req.query.groupid;
		//const courseid 	= req.query.courseid;
		const blockid 	= req.query.blockid;
		var		lastid 		= 'empty';
		const key_user	= res.locals.user;
		if(req.query.lastid) {
			lastid = req.query.lastid;
		}
		// buscar Roster del alumno
		Roster.findOne({student: key_user._id, group: groupid})
			.populate([{
				path: 'group',
				select: 'course code admin presentBlockBy beginDate endDate dates lapse lapseBlocks',
				populate: [{
					path: 'course',
					match: { isVisible: true, status: 'published'},
					select: 'blocks numBlocks code'
				},{
					path: 'dates',
					select: 'beginDate endDate'
				}
				]
			}, // esta parte de abajo está sospechosa, porque de todos modos tengo que ir por el dato del bloque
			{
				path: 'grades.block',
				select: 'section'
			},
			{
				path: 'grades.dependencies.dep'
			}
			])
			.then((item) => {
				var prevblockid = '';
				var nextblockid = '';
				// Existe el roster? Si no existe, quiere decir que el alumno no está enrolado a este grupo
				// o hay un error... posiblemente error de token?
				if(item) {
					const studentStatus = item.status;
					const blocks = item.group.course.blocks;
					// Averiguamos si el bloque debe presentarse por fecha y/o por lapso (también fecha)
					// En todo caso, ambas fechas deben ser menores a la actual.
					const now				= new Date();
					var 	ok				= true;
					var 	cause 		= '';
					var		causeSP		= '';
					var 	save 			= false;
					//var 	new_date	= new Date();
					if(item.group.presentBlockBy && item.group.presentBlockBy === 'dates'){
						if(item.group.beginDate && item.group.beginDate > now ) {
							ok 		= false;
							cause = 'Course will begin at ' + item.group.beginDate + '. ';
							causeSP = causeSP + ' El curso comenzará el ' + item.group.beginDate + '. ';
						} else
						if(item.group.endDate && item.group.endDate < now) {
							ok 		= false;
							cause = 'Course ended at ' + item.group.endDate + '. ';
							causeSP = causeSP + ' El curso terminó el ' + item.group.endDate + '. ';
						}
					}

					var grades = new Array();
					var currentBlockGrade = 0;
					var lastAttempt = 0;
					var numAttempts = 0;
					var lastIndex 	= 0;
					var lastSection = 0;
					var section 		= 0;
					var lastTaskDelivered = 0;
					var nextSection = lastSection + 1;
					if(item.grades && item.grades.length > 0) {
						grades = item.grades;
					}
					var blocksPresented = 0;
					var blocksPending 	= 2;
					if(item.group.admin && item.group.admin.blocksPending) {
						blocksPending = item.group.admin.blocksPending;
					}
					if(grades.length > 0) {
						//var myGrade = {};
						var i = 0;
						var track 	= 0;
						var length 	= grades.length;
						grades.forEach(function(grade) {
							if(grade && grade.block && grade.block._id) {
								const blockString = grade.block._id + '';
								if(blockString === lastid) {
									//myGrade = grade.block;
									lastIndex 	= i;
									lastSection = grade.block.section;
									nextSection = grade.block.section + 1;
								}
								if(blockString === blockid) {
									currentBlockGrade = grade.maxGradeQ;
									lastAttempt				= grade.lastAttemptQ;
									numAttempts				= grade.numAttempts;
									if(grade.tasktries && grade.tasktries.length > 0) {
										lastTaskDelivered = grade.tasktries[grade.tasktries.length -1];
									}
									track 						= grade.track;
									section 					= grade.block.section;
									if(grade.dependencies && grade.dependencies.length > 0) {
										grade.dependencies.forEach(function(dep) {
											if(dep.dep.createAttempt && (typeof dep.createAttempt === 'boolean' && !dep.createAttempt)) {
												ok 			= false;
												cause		= cause + 'There is a dependency on questionnarie. ';
												causeSP = causeSP + 'Antes de iniciar esta evaluación, debes presentar la anterior. ';
											}

											if(dep.dep.saveTask && (typeof dep.saveTask === 'boolean' && !dep.saveTask)) {
												ok 			= false;
												cause		= cause + 'There is a dependency on task. ';
												causeSP = causeSP + 'Antes de iniciar esta tarea, debes presentar la anterior. ';
											}
											if(dep.dep.track && (typeof dep.track === 'boolean' && !dep.track)) {
												ok 			= false;
												cause		= cause + 'There is a dependency on block. ';
												causeSP = causeSP + 'Antes de iniciar esta lección, debes presentar la anterior. ';
											}

										});
									}
								}
							} else {
								grades[length].block =  lastid;
								if(lastid === 'empty') {
									grades[length].track = 0;
								} else {
									grades[length].track = 100;
								}
							}
							i++;
						}); // grades.forEach

						if(lastid !== 'empty' && grades[lastIndex].track !== 100) {
							grades[lastIndex].track = 100;
							save 										= true;
						}
					} else { // No existe el roster del bloque (aunque sería raro porque ya se debió crear)
						if(lastid !== 'empty') {
							grades = [{
								block: lastid,
								track: 100
							}];
							blocksPresented++;
							save = true;
						}
					}
					const sectionDisp = section;
					// validar que exista fecha de inicio para la sección. Si existe mandar mensaje de cuándo empezará
					if(item.sections && item.sections.length > 0 && item.sections[section] && item.sections[section].beginDate && item.sections[section].beginDate > now) {
						if(!item.sections[section].viewed) {
							ok = false;
							cause = 'Section '+ sectionDisp +' will begin at ' + item.sections[section].beginDate;
							causeSP = 'La sección '+ sectionDisp +' comenzará el ' + item.sections[section].beginDate;
						}
					}
					if(item.sections && item.sections.length > 0 && item.sections[section] && item.sections[section].endDate && item.sections[section].endDate < now) {
						if(!item.sections[section].viewed) {
							ok = false;
							cause = 'Section '+ sectionDisp +' was closed at ' + item.sections[section].endDate;
							causeSP = 'La sección '+ sectionDisp +' terminó el ' + item.sections[section].endDate;
						}
					}

					if(item.sections) { // existe el arreglo sections?
						if(item.sections[lastSection]) { // existe el elemento lastSection?
							if(!item.sections[lastSection].viewed && lastid !== 'empty'){ // si la sección no ha sido vista y mandan el bloque para tracking...
								item.sections[lastSection].viewed = now;	// entonces registrar la fecha en que se está "viendo" la sección
								save = true;
							}
							if(item.group.presentBlockBy && item.group.presentBlockBy === 'lapse'){ // ahora, si el tipo de presentación de la sección es "lapse"
								if(item.sections[nextSection] && !item.sections[nextSection].viewed) { // y existe la siguiente sección y no ha sido vista
									// y existe
									if(item.group && item.group.lapseBlocks.length > 0 && item.group.lapseBlocks[nextSection]){
										item.sections[nextSection].beginDate = expiresIn(now, item.group.lapseBlocks[nextSection]);
									} else if(item.group.lapse){
										item.sections[nextSection].beginDate = expiresIn(now, item.group.lapse);
									}
									if(item.sections[lastSection].endDate){
										delete item.sections[lastSection].endDate;
									}
								}
								if(!item.sections[nextSection]){
									if(item.group && item.group.lapseBlocks.length > 0 && item.group.lapseBlocks[nextSection]){
										item.sections[nextSection].beginDate = expiresIn(now, item.group.lapseBlocks[nextSection]);
									} else if(item.group.lapse){
										item.sections[nextSection].beginDate = expiresIn(now, item.group.lapse);
									}
								}
								save = true;
							}
						} else if(lastid !== 'empty'){
							if(item.group.presentBlockBy && item.group.presentBlockBy === 'lapse'){ // Si el grupo está seteado por lapso
								if(item.sections[lastSection]){
									item.sections[lastSection].viewed	= now;
								} else {
									item.sections[lastSection] = {
										viewed : now
									};
								}
								if(item.group && item.group.lapseBlocks.length > 0 && item.group.lapseBlocks[nextSection]) {
									if(item.sections[nextSection]){
										item.sections[nextSection].beginDate = expiresIn(now, item.group.lapseBlocks[nextSection]);
									} else {
										item.sections[nextSection] = {
											beginDate : expiresIn(now, item.group.lapseBlocks[nextSection])
										};
									}
								}
								save = true;
							} else {
								if(item.sections && item.sections.length > 0 && item.sections[lastSection]){
									item.sections[lastSection].viewed = now;
									save = true;
								}	 else if (!item.sections) {
									item.sections = new Array();
									var h = 0;
									while (h < lastSection) {
										item.sections.push({});
									}
									item.sections[lastSection].viewed = now;
									save = true;
								}
							}
						}
					} else if(lastid !== 'empty' && lastSection === 0){
						item.sections = new Array();
						item.sections[lastSection].viewed = now;
						save = true;
					}
					if(save) { // si el tracking ya se registró y/o no hay tracking que guardar, pues para que molestar a MongoDB
						item.grades = grades;
						item.save()
							.catch((err) => {
								Err.sendError(res,err,'group_controller','nextBlock -- Saving item -- '+ key_user.name);
							});
					}
					if(ok) {
						var blockIndex 	= blocks.findIndex(blockIndex => blockIndex == blockid + '');
						if(blockIndex === -1) {
							res.status(200).json({
								'status': 200,
								'message': 'Block not found. Please check groupid and blockid. '
							});
							return;
						} else if (blocks.length === 1) {
							nextblockid = '';
							prevblockid = '';
						} else if (blockIndex === 0) {
							nextblockid = blocks[blockIndex + 1];
						} else if (blockIndex > 0 && blockIndex < blocks.length - 1) {
							nextblockid = blocks[blockIndex + 1];
							prevblockid = blocks[blockIndex - 1];
						} else if (blockIndex === blocks.length - 1 && blockIndex !== 0) {
							prevblockid = blocks[blockIndex - 1];
						}
						// buscar el bloque solicitado
						Block.findById(blockid)
							.populate(
								[
									{
										path: 'questionnarie',
										match: { isVisible: true },
										select: 'type begin minimum maxAttempts questions w'
									},
									{
										path: 'task',
										match: { isVisible: true, status: 'published' },
										select: 'items'
									}
								]
							)
							.then((block) => {
								if(block) {
									const send_block = {
										courseCode				: item.group.course.code,
										groupCode					: item.group.code,
										blockCode					: block.code,
										blockType					: block.type,
										blockTitle				: block.title,
										blockSection			:	block.section,
										blockNumber				: block.number,
										blockContent			:	block.content,
										blockMedia				: block.media,
										blockMinimumTime	: block.defaultmin,
										blockTrack				: false,
										blockCurrentId		:	block._id,
										blockPrevId				:	prevblockid,
										blockNextId				:	nextblockid,
										studentid					: key_user._id,
										rosterid					: item._id
									};
									if(block.type === 'textVideo' && block.begin) {
										send_block.blockBegin = true;
									}
									if(item.sections.length > 0 && item.sections[section] && item.sections[section].viewed) {
										send_block.blockUnitBeginning = item.sections[section].viewed;
									}
									if(track > 0) {
										send_block.blockTrack = true;
									}
									if(block.duration > 0) {
										send_block.blockDuration = block.duration + block.durationUnits;
									}
									if(block.type === 'questionnarie' && block.questionnarie) {
										send_block.maxGrade			= currentBlockGrade;
										send_block.attempts			= numAttempts;
										if(lastAttempt === undefined) {
											send_block.lastAttempt = 'never';
										} else {
											send_block.lastAttempt	= TA.ago(lastAttempt);
										}
										const questionnarie 		= block.questionnarie;
										const questions 				= questionnarie.questions;
										var send_questionnarie 	= {};
										var send_questions = new Array();
										questions.forEach(function(q) {
											var send_question = {};
											if(q.header) 			{send_question.header 		= q.header;			}
											if(q.footer) 			{send_question.footer 		= q.footer;			}
											if(q.footerShow) 	{send_question.footerShow = q.footerShow;	}
											if(q.type) 				{send_question.type 			= q.type;				}
											if(q.w) 					{send_question.w 					= q.w;					}
											if(q.label)				{send_question.label 			= q.label;			}
											if(q.text) 				{send_question.text 			= q.text;				}
											if(q.help) 				{send_question.help 			= q.help;				}
											if(q.display)			{send_question.display 		= q.display;		}
											if(q.group && q.group.length > 0) 	{send_question.group = q.group;}
											if(q.options && q.options.length > 0) {
												var options = new Array();
												q.options.forEach(function(o) {
													options.push({
														name	: o.name,
														value	: o.value
													});
												});
												send_question.options = options;
											}
											var answers = new Array();
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
											send_question.answers = answers;
											send_questions.push(send_question);
										});
										send_questionnarie = {
											type					: questionnarie.type,
											begin					: questionnarie.begin,
											minimum				: questionnarie.minimum,
											maxAttempts		: questionnarie.maxAttempts,
											//attempts			: numAttempts,
											//lastGrade			: lastGrade,
											w							: questionnarie.w,
											questions			: send_questions
										};
										send_block.questionnarie = send_questionnarie;
									}
									if(block.type === 'task' && block.task) {
										var task = block.task;
										var send_items = new Array();
										task.items.forEach(function(item) {
											var send_item={
												text: item.text,
												type: item.type
											};
											if(item.header) {send_item.header = item.header;}
											if(item.footer) {send_item.footer = item.footer;}
											if(item.label) 	{send_item.label	= item.label; }
											if(item.files && item.files.length > 0) 	{send_item.files 	= item.files;	}
											send_items.push(send_item);
										});
										send_block.tasks= send_items;
										if(lastTaskDelivered && lastTaskDelivered > 0) {
											send_block.lastTaskDelivered 	= TA.ago(lastTaskDelivered);
											send_block.lastTaskDate 			= lastTaskDelivered;
										}
									}
									if(studentStatus === 'pending' && blocksPresented > blocksPending) {
										res.status(200).json({
											'status': 200,
											'message': 'Your student status is pending and you can only have -' + blocksPending + '- free blocks'
										});
									} else if (studentStatus === 'remove') {
										res.status(200).json({
											'status': 200,
											'message': 'Your student status is remove and you cannot have blocks from this course'
										});
									} else {
										res.status(200).json({
											'status': 200,
											'message': send_block
										});
									}
								} else { // if(block)
									res.status(200).json({
										'status': 200,
										'message': 'Block requested is not found'
									});
								}
							}) // then((block))
							.catch((err) => {
								Err.sendError(res,err,'group_controller','nextBlock -- Finding Block --');
							});
					} else { // if(ok)
						res.status(200).json({
							'status': 200,
							'message': 'Block cannot be displayed because: ' + cause,
							'messageUser': 'El bloque no puede presentarse debido a: ' + causeSP
						});
					}
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'You are not enrolled to this group'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','nextBlock -- Finding Roster --');
			});
	}, // nextBlock

	usersWOActivity(req,res) {
		const key_user  = res.locals.user;
		var 	ou				= '';
		if(key_user.roles.isAdmin && req.query.ou) {
			ou = req.query.ou;
		} else {
			if(key_user.orgUnit._id) {
				ou = key_user.orgUnit._id;
			} else {
				res.status(200).json({
					'status': 200,
					'message': 'User has not orgUnit. -  Please contact Admin'
				});
			}
		}
		Roster.aggregate()
			.match({orgUnit: mongoose.Types.ObjectId(ou), report: {$ne:false}, track:0})
			.project('student group -_id')
			.lookup({from: 'users', localField: 'student', foreignField: '_id', as: 'myUser'})
			.lookup({from: 'groups', localField: 'group', foreignField: '_id', as: 'myGroup'})
			.project({
				group				: '$myGroup.name',
				fatherName	:	'$myUser.person.fatherName',
				motherName	: '$myUser.person.motherName',
				name				:	'$myUser.person.name',
				email				: '$myUser.person.email',
			})
			.unwind('name')
			.unwind('fatherName')
			.unwind('motherName')
			.unwind('email')
			.unwind('group')
			/*
			.group({
				_id: '$group',
				'students': {
					$push: {
						name				: '$name',
						fatherName	: '$fatherName',
						motherName	: '$motherName',
						email				: '$email'
					}
				}
			}
			)
			*/
			.then((users) => {
				if(users.length > 0) {
					res.status(200).json(users);
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No users found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','usersWOActivity -- Finding Roster --');
			});
	}, //usersWOActivity

	usersWOGroup(req,res) {
		const key_user	= res.locals.user;
		const ou 				= req.query.ou;
		var query = {org: key_user.org};
		if(ou) {
			query.orgUnit = ou;
		}
		Group.find(query)
			.then((groups) => {
				if(groups.length > 0) {
					var usersInGroups = new Array();
					groups.forEach(function(group) {
						usersInGroups = usersInGroups.concat(group.students);
					});
					User.find(query)
						.select('_id name')
						.then((users) => {
							var originalUsers = users;
							usersInGroups.forEach(function(user) {
								var i = 0;
								var keep = true;
								while (i < users.length && keep) {
									if(users[i]._id +'' === user + '') {
										users.splice(i,1);
										keep = false;
										//console.log('cortando ' + user );
									} else {
										i++;
									}
								}
							});
							res.status(200).json({
								'status': 200,
								'message': {
									orNumUsers		: originalUsers.length,
									originalUsers : originalUsers,
									leftNumUsers	: users.length,
									leftUsers			: users
								}
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'group_controller','usersWOGroup -- Finding Users --');
						});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'Groups not found for this ou: -' + ou + '-'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','usersWOGroup -- Finding Groups --');
			});
	},

	testCreateAttempt(req,res) {
		const userid		= req.query.userid;
		const groupid 	= req.query.groupid;
		const blockid 	= req.query.blockid;
		Roster.findOne({student: userid, group: groupid})
			.populate({
				path: 'group',
				select: 'course',
				populate: {
					path: 'course',
					select: 'blocks',
					populate: {
						path: 'blocks',
						match: { _id: blockid },
						select: 'questionnarie w wq wt',
						populate: {
							path: 'questionnarie',
							select: 'maxAttempts'
						}
					}
				}
			})
			.then((item) => {
				res.status(200).json({
					'status': 200,
					'message': item
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','createAttempt -- Finding Roster -- user: ' +
					userid + ' groupid: ' + groupid + ' blockid: ' + blockid );
			});
	}, // createAttempt

	touchGrade(req,res) {
		const userid		= req.query.userid;
		const groupid 	= req.query.groupid;
		const blockid 	= req.query.blockid;
		Roster.findOne({student: userid, group: groupid})
			.then((item) => {
				var grades = item.grades;
				var i=0;
				var keep = true;
				var grade = 0;
				while (keep) {
					if(grades[i].block + '' === blockid) {
						keep = false;
						if(grades[i].quests.length > 0 && grades[i].quests[0].grade) {
							//grade = parseInt(grades[i].quests[0].grade + 1);
							grade = grades[i].quests[0].grade + 1;
							grades[i].quests[0].grade = grade;
						}
					} else {
						i++;
					}
				}
				item.save()
					.then((item) => {
						grades = item.grades;
						i=0;
						keep = true;
						grade = 0;
						while (keep) {
							if(grades[i].block + '' === blockid) {
								keep = false;
								if(grades[i].quests.length > 0 && grades[i].quests[0].grade) {
									//grade = parseInt(grades[i].quests[0].grade - 1);
									grade = grades[i].quests[0].grade - 1;
									grades[i].quests[0].grade = grade;
								}
							} else {
								i++;
							}
						}
						item.save()
							.then(() => {
								res.status(200).json({
									'status': 200,
									'message': 'Grade touched'
								});
							})
							.catch((err) => {
								Err.sendError(res,err,'group_controller','touchGrade -- Saving Roster 2 -- user: ' +
									userid + ' groupid: ' + groupid + ' blockid: ' + blockid );
							});
					})
					.catch((err) => {
						Err.sendError(res,err,'group_controller','touchGrade -- Saving Roster 1 -- user: ' +
							userid + ' groupid: ' + groupid + ' blockid: ' + blockid );
					});
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','touchGrade -- Finding Roster -- user: ' +
					userid + ' groupid: ' + groupid + ' blockid: ' + blockid );
			});
	}, //touchGrade

	setTracking(req,res) {
		const key_user	= res.locals.user;
		var 	groupid		= '';
		var 	userid		= '';
		var 	all				= false;
		var		track 		= 0;
		var 	query			= {};
		var 	now				= new Date();
		if(req.query.groupid) { groupid = req.query.groupid;}
		if(req.query.userid)	{ userid 	= req.query.userid;	}
		if(req.query.all) 		{ all 		= true;							}
		if(req.query.track && parseInt(req.query.track) !== track )			{ track 	= parseInt(req.query.track); }
		if(groupid !== '' && all) {
			query.group = groupid;
		} else if(userid !== '' && groupid !== '') {
			query.student = userid;
			query.group = groupid;
		} else {
			res.status(200).json({
				'status': 200,
				'message': 'Nothing to set'
			});
			return;
		}
		if(key_user.roles && (key_user.roles.isSupervisor || key_user.roles.isInstructor || key_user.roles.isAdmin)){
			Roster.find(query)
				.populate('student', 'person')
				.then((items) => {
					if(items && items.length > 0) {
						var send_results = new Array();
						var i = 0;
						while(i < items.length){
							if(items[i] && items[i].grades && items[i].grades.length > 0) {
								items[i].grades.map(function(x) {
									x.track = track;
								});
							}
							if(items[i] && items[i].sections && items[i].sections.length > 0 ) {
								const sections = items[i].sections;
								var new_sections = new Array();
								/*
								items[i].sections.map(function(x) {
									if(!x.viewed){
										x.viewed = now;
									}
								});
								*/
								var k = 0;
								while (k < sections.length) {
									var sec = {};
									sec._id = sections[k]._id;
									//if(sections[k].beginDate) { sec.beginDate = sections[k].beginDate; }
									if(track === 100 ) {sec.viewed = now;}
									k++;
								}
								new_sections.push(sec);
								items[i].sections = new_sections;
							}
							send_results.push({'student': items[i].student.person.fullName});
							items[i].admin.push({
								what	: 'Supervisor/Admin/Instructor changed tracking',
								who		: key_user.name
							});
							items[i].save()
								.catch((err) => {
									Err.sendError(res,err,'group_controller','setTrack -- Saving Roster -- user: ' +
										key_user.name + ' groupid: ' + groupid + ' userid: ' + items[i].student.person.fullName );
								});

							i++;
						}
						res.status(200).json({
							'status': 200,
							'message': send_results
						});
					} else {
						res.status(200).json({
							'status': 200,
							'message': 'No rosters found'
						});
					}
				})
				.catch((err) => {
					Err.sendError(res,err,'group_controller','setTrack -- Finding Roster -- user: ' +
						key_user.name + ' groupid: ' + groupid + ' userid: ' + userid );
				});
		}
	}, // setTracking
	test(req,res) {
		//var message = 'Mensaje de prueba';
		res.status(200).json({
			'url': process.env.LIBRETA_URI,
			'public': process.env.MJ_APIKEY_PUBLIC,
			'private': process.env.MJ_APIKEY_PRIVATE,
			'hola': 'mundo'
		});
		//Err.sendError(res,message,'group_controller','test -- testing email --');
	}, // test

	searchOrphanRoster(req,res) {
		const key_user	= res.locals.user;
		const groupid 	= req.query.groupid;
		Roster.find({group:groupid})
			.populate('student person')
			.then((items) => {
				var 		i	=	0;
				var found = false;
				while(!found && i < items.length) {
					if(!items[i].student.person.name) {
						found = true;
					}
				}
				if(found) {
					res.status(200).json({
						'roster': items[i]._id
					});
				} else {
					res.status(200).json({
						'message': 'No roster found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','searchOrphanRoster -- Finding Roster -- user: ' +
					key_user.name + ' groupid: ' + groupid );
			});
	}, //searchOrphanRoster


	repairRoster(req,res) {
		const key_user	= res.locals.user;
		const groupid 	= req.query.groupid;
		Group.findById(groupid)
			.populate({
				path: 'course',
				select: 'blocks',
				populate: {
					path: 'blocks',
					select: 'w wq wt'
				}
			})
			.then((group) => {
				if(group) {
					const bs = group.course.blocks;
					Roster.count({group: groupid})
						.then((count) => {
							if(count > 0) {
								var skip			= 0;
								var limit			= 100;
								var itemCount = count;
								if(itemCount < limit) {
									limit = itemCount;
								}
								while(itemCount > 0) {
									Roster.find({group: groupid})
										.skip(skip)
										.limit(limit)
										.then((items) => {
											if(items.length > 0) {
												res.status(200).json({
													'status': 200,
													'message': 'Roster repair has begun'
												});
												items.forEach(function(item) {
													var grades = item.grades;
													var i=0;
													while(i < bs.length) {
														var j=0;
														var found = false;
														while(!found && j < grades.length) {
															if(bs[i]._id + '' === grades[j].block + '') {
																grades[j].w 			= bs[i].w;
																grades[j].wq 			= bs[i].wq;
																grades[j].wt 			= bs[i].wt;
																grades[j].repair	= 1;
																found = true;
															}
															j++;
														}
														if(!found) {
															grades.push({
																block	: bs[i]._id,
																w 		: bs[i].w,
																wq 		: bs[i].wq,
																wt		: bs[i].wt,
																repair: 1
															});
														}
														i++;
													}
													item.grades = grades;
													item.repair = 1;
													item.save();
												});
											}
										})
										.catch((err) => {
											Err.sendError(res,err,'group_controller','repairRoster -- Counting Roster -- user: ' +
												key_user.name + ' groupid: ' + groupid);
										});
									skip += limit;
									itemCount -= limit;
									if((skip + limit) > count) {
										limit = itemCount;
									}
								}
							} else {
								res.status(200).json({
									'status': 200,
									'message': 'No rosters found'
								});
							}
						})
						.catch((err) => {
							Err.sendError(res,err,'group_controller','repairRoster -- Counting Roster -- user: ' +
								key_user.name + ' groupid: ' + groupid);
						});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No group found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','repairRoster -- Finding Group -- user: ' +
					key_user.name + ' groupid: ' + groupid);
			});
	}, //repairRoster

	repairGroup(req,res) {
		const key_user	= res.locals.user;
		const groupid = req.query.groupid;
		Group.findById(groupid)
			.then((group) => {
				if(group) {
					Roster.find({group: groupid, student: {$in: group.students}})
						.select('student')
						.then((items) => {
							var roster = new Array();
							items.forEach(function(item) {
								roster.push(item._id);
							});
							group.roster = roster;
							group.save()
								.then(() => {
									res.status(200).json({
										'message': 'Roster for group ' + group.code + ' repaired',
										'roster': roster
									});
								})
								.catch((err) => {
									Err.sendError(res,err,'group_controller','repairGroup -- Saving group -- user: ' +
										key_user.name + ' groupid: ' + groupid);
								});
						})
						.catch((err) => {
							Err.sendError(res,err,'group_controller','repairGroup -- Finding Rosters -- user: ' +
								key_user.name + ' groupid: ' + groupid);
						});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','repairGroup -- Finding Group -- user: ' +
					key_user.name + ' groupid: ' + groupid);
			});
	}
};




// Private Functions -----------------------------------------------------------


function expiresIn(date, numDays) {
	var dateObj = new Date(date);
	return dateObj.setDate(dateObj.getDate() + numDays);
}


function units(unit,cnt) {
	if(unit === 'h') {
		if(cnt === 1) {
			return 'hora';
		} else {
			return 'horas';
		}
	} else if(unit === 'm') {
		if(cnt === 1) {
			return 'minuto';
		} else {
			return 'minutos';
		}
	} else if(unit === 's') {
		if(cnt === 1) {
			return 'segundo';
		} else {
			return 'segundos';
		}
	} else if(unit === 'd') {
		if(cnt === 1) {
			return 'día';
		} else {
			return 'días';
		}
	} else if(unit === 'w') {
		if(cnt === 1) {
			return 'semana';
		} else {
			return 'semanas';
		}
	} else if(unit === 'mo') {
		if(cnt === 1) {
			return 'mes';
		} else {
			return 'meses';
		}
	} else if(unit === 'y') {
		if(cnt === 1) {
			return 'año';
		} else {
			return 'años';
		}
	}
}

function dateInSpanish(date) {
	var day 	= date.getDate();
	var month = date.getMonth();
	var year	= date.getFullYear();
	const months = [
		'enero',
		'febrero',
		'marzo',
		'abril',
		'mayo',
		'junio',
		'julio',
		'agosto',
		'septiembre',
		'octubre',
		'noviembre',
		'diciembre'
	];
	return day + ' de ' + months[month] + ' de ' + year;
}
