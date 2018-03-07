//const winston = require('winston');
const User = require('../src/users');
//const Org = require('../src/orgs');
//const OrgUnit = require('../src/orgUnits');
const Course = require('../src/courses');
const Group = require('../src/groups');
const Block = require('../src/blocks');
const Err = require('../controllers/err500_controller');
const TA = require('time-ago');
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
					if(!group.instructor) {
						group.instructor = key_user._id;
					}
					group.roster = new Array();
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
					res.status(404).json({
						'status': 404,
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
			.populate('course')
			.populate('instructor')
			.populate('org', 'name')
			.populate('orgUnit', 'name longName')
			.populate('roster.student')
			.then((groups) => {
				var send_groups = new Array();
				groups.forEach(function(group) {
					var send_group = {
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
					group.roster.forEach(function(s) {
						send_students.push({
							fullName: s.student.person.fullName
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
					res.status(404).json({
						'status': 404,
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
		const date = new Date();
		Group.findOne({ code: roster.code })
			.then((group) => {
				if(group) {
					roster.roster.forEach(function(student) {
						group.roster.push({
							student: student,
							status: 'pending'
						});
					});
					var mod = {
						by: key_user.name,
						when: date,
						what: 'Roster Creation'
					};
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
				} else {
					res.status(404).json({
						'status': 404,
						'mesage': 'Group -' + roster.code + '- not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','createRoster -- Finding Group --');
			});
	}, //createRoster

	addStudent(req,res) {
		const key_user 	= res.locals.user;
		var roster = req.body;
		const date = new Date();
		Group.findOne({ code: roster.code })
			.then((group) => {
				User.findById(roster.student)
					.then((student) => {
						if(student){
							if(group) {
								group.students.push(student._id);
								group.roster.push({
									student: student,
									status: 'pending'
								});
								var mod = {
									by: key_user.name,
									when: date,
									what: 'Student -' + student + '- added'
								};
								group.mod.push(mod);
								group.save()
									.then(() => {
										res.status(200).json({
											'status': 200,
											'message': 'Roster modified'
										});
									})
									.catch((err) => {
										Err.sendError(res,err,'group_controller','addStudent -- Saving Group --');
									});
							} else {
								res.status(404).json({
									'status': 404,
									'mesage': 'Group -' + roster.code + '- not found'
								});
							}
						} else {
							res.status(404).json({
								'status': 404,
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
		//const key_user 	= res.locals.user;
		var roster = req.query;
		Group.findOne({ code: roster.code })
			.populate('instructor')
			.populate('orgUnit')
			.populate('roster.student')
			.then((group) => {
				if(group) {
					var send_group = {
						code: group.code,
						name: group.name,
						instructor: group.instructor.name,
						beginDate: group.beginDate,
						endDate: group.endDate,
						orgUnit: group.orgUnit.name
					};
					var students = new Array();
					group.roster.forEach(function(s) {
						students.push({
							id: s.student.id,
							username: s.student.name,
							status: s.status,
							name: s.student.person.name,
							fatherName: s.student.person.fatherName,
							motherName: s.student.person.motherName,
							email: s.student.person.email,
							studentType: s.student.student.type,
							career: s.student.student.career,
							term: s.student.student.term,
							external: s.student.student.external,
							origin: s.student.student.origin,
							grades: s.student.grades
						});
					});
					send_group.students = students;

					res.status(200).json({
						'status': 200,
						'message': send_group
					});
				} else {
					res.status(404).json({
						'status': 404,
						'mesage': 'Group -' + roster.code + '- not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','listRoster -- Finding Group --');
			});
	}, //listRoster

	myGroups(req,res) {
		const key_user 	= res.locals.user;
		Group.find({'roster.student': key_user._id})
			.populate('course')
			.populate('instructor')
			.then((groups) => {
				var send_groups = new Array();
				groups.forEach(function(group) {
					var i = 0;
					var studentIndex = -1;
					group.roster.forEach(function(s) {
						if(s.student + '' === key_user._id + '') {
							studentIndex = i;
						}
						i++;
					});
					var lastSeenBlock = '';
					if (group.roster[studentIndex].grades) {
						if(group.roster[studentIndex].grades.length > 0) {
							if(group.roster[studentIndex].grades[group.roster[studentIndex].grades.length -1].block) {
								lastSeenBlock = group.roster[studentIndex].grades[group.roster[studentIndex].grades.length -1].block;
							}
						}
					}
					send_groups.push({
						code: 					group.code,
						groupid: 				group._id,
						name: 					group.name,
						course: 				group.course.title,
						courseid: 			group.course._id,
						courseCode: 		group.course.code,
						courseBlocks:		group.course.numBlocks,
						instructor: 		group.instructor.person.name + ' ' + group.instructor.person.fatherName,
						beginDate: 			group.beginDate,
						endDate: 				group.endDate,
						myStatus: 			group.roster[studentIndex].status,
						firstBlock: 		group.course.blocks[0],
						lastSeenBlock:	lastSeenBlock
					});
				});
				if(send_groups.length === 0) {
					res.status(200).json({
						'status': 200,
						'message': 'No groups found'
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': {
							'numgroups': groups.length,
							'groups': send_groups
						}
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','mygroups -- Finding Groups --');
			});
	}, // mygroups

	myGroup(req,res) {
		const key_user 	= res.locals.user;
		const groupid		= req.query.groupid;
		Group.findById(groupid)
			.populate('course')
			.then((myGroup) => {
				if(myGroup) {
					var i = 0;
					var studentIndex = -1;
					myGroup.roster.forEach(function(s) {
						if(s.student + '' === key_user._id + '') {
							studentIndex = i;
						}
						i++;
					});
					var grades = new Array();
					if (myGroup.roster[studentIndex].grades) {
						grades = myGroup.roster[studentIndex].grades;
					}
					if(myGroup.course) {
						var course = myGroup.course;
						if(course.isVisible) {
							if(course.status === 'published') {
								Block.find({ _id: { $in: course.blocks }})
									.sort({order:1})
									.then((blocks) => {
										var send_blocks = new Array();
										blocks.forEach(function(block) {
											if(block.isVisible && block.status === 'published') {
												var send_block = {
													id							: block._id,
													title						: block.title,
													section					: block.section,
													number					: block.number,
													order						: block.order,
													track						:	false,
													questionnarie		: false,
													task						:	false
												};
												if(block.questionnarie) {
													send_block.questionnarie = true;
												}
												if(block.tasks && block.tasks.length > 0) {
													send_block.tasks = true;
												}
												if(grades.length > 0) {
													grades.forEach(function(grade) {
														let g1 = grade.block + '';
														let g2 = block._id + '';
														if(g1 === g2) {
															if(grade.track === 100) {
																send_block.track = true;
															}
														}
													});
												}
												send_blocks.push(send_block);
											}
										});
										res.status(200).json({
											'status': 200,
											'message': {
												myStatus: myGroup.roster[studentIndex].status,
												//blockNum: send_blocks.length,
												blockNum: myGroup.course.numBlocks,
												otherNum: myGroup.numBlocks,
												blocks	: send_blocks
											}
										});
									})
									.catch((err) => {
										Err.sendError(res,err,'group_controller','mygroup -- Finding blocks --');
									});
							} else {
								res.status(404).json({
									'status': 404,
									'message': 'Course is not published yet'
								});
							}
						} else {
							res.status(404).json({
								'status': 404,
								'message': 'Course is not visible'
							});
						}
					}
				} else {
					res.status(400).json({
						'status': 400,
						'message': 'Group with id -' + groupid + '- not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','mygroup -- Finding Group --');
			});
	}, // mygroup

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
		var maxAttempts = 0;
		Group.findById(groupid)
			.then((group) => {
				// ----- buscamos el número permitido de intentos
				Block.findById(blockid)
					.populate('questionnarie', 'maxAttempts')
					.then((block) => {
						maxAttempts = block.questionnarie.maxAttempts;
						// ----------------------
						var i = 0;
						var studentIndex = -1;
						group.roster.forEach(function(s) {
							if(s.student + '' === key_user._id + '') {
								studentIndex = i;
							}
							i++;
						});
						var grades = [];
						var myGrade = {};
						var k = 0;
						if(group.roster[studentIndex].grades && group.roster[studentIndex].grades.length > 0) {
							grades = group.roster[studentIndex].grades;
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
							if(myGrade.quests && myGrade.quests.length > 0) {
								if(myGrade.quests.length > maxAttempts - 1) {
									res.status(406).json({
										'status': 406,
										'message': 'Max number of attempts has reached. No more attempts allowed'
									});
									return;
								} else {
									myGrade.quests.push(quest);
								}
							} else {
								myGrade = {
									block	: blockid,
									quests: [quest],
									track	: 100
								};
							}
							group.roster[studentIndex].grades[k] = myGrade;
						} else {
							myGrade = {
								block	: blockid,
								quests: [quest],
								track	: 100
							};
							group.roster[studentIndex].grades = [myGrade];
						}
						group.save()
							.then(() => {
								res.status(200).json({
									'status': 200,
									'message': 'Attempt saved'
								});
							})
							.catch((err) => {
								Err.sendError(res,err,'group_controller','nextBlock -- Saving Group --');
							});
					})
					.catch((err) => {
						Err.sendError(res,err,'group_controller','nextBlock -- Finding Block --');
					});
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','nextBlock -- Finding Group --');
			});

	}, // createAttempt

	myGrades(req,res){
		const groupid		= req.query.groupid;
		const key_user 	= res.locals.user;
		Group.findOne({_id: groupid})
			.then((myGroup) => {
				if(myGroup) {
					var i = 0;
					var studentIndex = -1;
					myGroup.roster.forEach(function(s) {
						if(s.student + '' === key_user._id + '') {
							studentIndex = i;
						}
						i++;
					});
					var grades = new Array();
					if (myGroup.roster[studentIndex].grades) {
						grades = myGroup.roster[studentIndex].grades;
					} else {
						res.status(404).json({
							'status': 404,
							'message': 'Grades for groupid -' + groupid + '- not found'
						});
						return;
					}
					var blocks = new Array();
					grades.forEach(function(grade) {
						blocks.push(grade.block);
					});
					var grades_send = new Array();
					Block.find({_id: {$in: blocks}})
						.select('type section number title')
						.then((found_blocks) => {
							var i=0;
							found_blocks.forEach(function(block) {
								var biggest = 0;
								var lowest	= 100;
								var attempts = new Array();
								if(block.type === 'questionnarie' || block.type === 'task') {
									grades[i].quests.forEach(function(q) {
										if(q.grade > biggest) {
											biggest = q.grade;
										}
										if(q.grade < lowest) {
											lowest 	= q.grade;
										}
										if(q.attempt) {
											attempts.push({
												answers : q.answers,
												grade		: q.grade,
												when		: TA.ago(q.attempt),
												date		: q.attempt
											});
										} else {
											attempts.push({
												grade: 0
											});
										}
									});
									if(grades[i] && grades[i].quests.length > 0) {
										grades_send.push({
											title					: block.title,
											section				: block.section,
											number				: block.number,
											track					: grades[i].track,
											biggestGrade 	: biggest,
											lowestGrade		: lowest,
											AttemptsDone	: grades[i].quests.length,
											lastAttempt 	:	TA.ago(grades[i].quests[grades[i].quests.length-1].attempt),
											date					: grades[i].quests[grades[i].quests.length-1].attempt,
											historical		: attempts
										});
									} else {
										grades_send.push({
											title					: block.title,
											section				: block.section,
											number				: block.number,
											track					: grades[i].track,
											biggestGrade 	: biggest,
											lowestGrade		: lowest
										});
									}
								}
								i++;
							});
							res.status(200).json({
								'status': 200,
								'message': grades_send
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'group_controller','mygrades -- Finding Group --');
						});
				} else {
					res.status(400).json({
						'status': 400,
						'message': 'Group with id -' + groupid + '- not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','mygrades -- Finding Group --');
			});
	}, // myGrades

	nextBlock(req,res) {
		//const key 			= req.headers.key;
		const groupid 	= req.query.groupid;
		const courseid 	= req.query.courseid;
		const blockid 	= req.query.blockid;
		var	lastid 			= 'empty';
		const key_user = res.locals.user;
		if(req.query.lastid) {
			lastid = req.query.lastid;
		}
		//var students 		= new Array();
		//var myStudent = -1;
		Group.findById(groupid)		// Buscar el grupo solicitado
			.then((group) => {
				if(group) {
					var i = 0;
					var studentIndex = -1;
					group.roster.forEach(function(s) {
						if(s.student + '' === key_user._id + '') {
							studentIndex = i;
						}
						i++;
					});
					var blocksPending = 2; // default por sistema, solo pueden ver dos bloques
					if(group.admin && group.admin.blocksPending) {
						blocksPending = group.admin.blocksPending;
					}
					var studentStatus = '';
					if(studentIndex > -1 ) {
						studentStatus = group.roster[studentIndex].status;
						Course.findById(courseid) // Buscar el curso
							.then((course) => {
								if(course) {					// Encontramos curso, ahora hay que buscar el registro track del usuario
									var blocks = course.blocks;
									Block.findById(blockid)	// Buscar el bloque solicitado
										.populate('questionnarie')
										.then((block) => {
											if(block) {
												var prevblockid = '';
												var nextblockid = '';
												var grades = [];
												if(group.roster[studentIndex].grades) {
													grades = group.roster[studentIndex].grades;
													var myGrade = {};
													var blocksPresented = 0;
													grades.forEach(function(grade) {
														const blockString = grade.block + '';
														if(blockString === lastid) {
															myGrade = grade.block;
														}
													});
													if(Object.keys(myGrade).length === 0) { // Existe el bloque
														if(lastid !== 'empty') {
															myGrade = {
																block: lastid,
																track: 100
															};
															grades.push(myGrade);
															blocksPresented++;
														}
													}
												} else { // No existe el bloque
													if(lastid !== 'empty') {
														grades = [{
															block: lastid,
															track: 100
														}];
														blocksPresented++;
													}
												}
												group.roster[studentIndex].grades = grades;
												group.save()
													.catch((err) => {
														Err.sendError(res,err,'group_controller','nextBlock -- Saving Block --');
													});
												var blockIndex 	= blocks.findIndex(blockIndex => blockIndex == blockid + '');
												if(blockIndex === -1) {
													res.status(404).json({
														'status': 404,
														'message': 'Error XXXX: Data integrity error. Block not found. Please notify administrator'
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
												if(block.isVisible && block.status === 'published') {
													var send_content = {
														blockCode				:	block.code,
														blockType				: block.type,
														blockTitle			: block.title,
														blockSection		:	block.section,
														blockNumber			: block.number,
														blockContent		:	block.content,
														blockMedia			: block.media,
														blockMinimumTime: block.defaultmin,
														blockCurrentId	:	block._id,
														blockPrevId			:	prevblockid,
														blockNextId			:	nextblockid,
													};
													if(block.type === 'textVideo' && block.begin) {
														send_content.blockBegin = true;
													}
													if(block.questionnarie) {
														var questionnarie = block.questionnarie;
														var send_questionnarie = {};
														var numAttempts = 0;
														var lastGrade = 0;
														if(questionnarie.isVisible) {
															grades.forEach(function(grade) {
																const blockString = grade.block + '';
																if(blockString === block._id) {
																	if(grade.quests && grade.quests.attempts) {
																		numAttempts = grade.quests.attempts.length;
																	}
																	if(grade.quests && grade.quests.grade) {
																		lastGrade = grade.quests.grade;
																	}
																}
															});
															var questions = questionnarie.questions;
															var send_questions = new Array();
															questions.forEach(function(q) {
																var send_question = {};
																if(q.isVisible) {
																	if(q.header) 			{send_question.header = q.header;}
																	if(q.footer) 			{send_question.footer = q.footer;}
																	if(q.footerShow) 	{send_question.footerShow = q.footerShow;}
																	if(q.type) 				{send_question.type = q.type;}
																	if(q.w) 					{send_question.w = q.w;}
																	if(q.text) 				{send_question.text = q.text;}
																	if(q.help) 				{send_question.help = q.help;}
																	if(q.group && q.group.length > 0) 	{send_question.group = q.group;}
																	//send_questions.push(send_question);
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
																}
															});
															send_questionnarie = {
																type					: questionnarie.type,
																begin					: questionnarie.begin,
																minimum				: questionnarie.minimum,
																maxAttempts		: questionnarie.maxAttempts,
																attempts			: numAttempts,
																lastGrade			: lastGrade,
																w							: questionnarie.w,
																questions			: send_questions
															};
														}
														send_content.questionnarie = send_questionnarie;
													}
													if(block.tasks && block.tasks.length > 0) {
														var tasks = block.tasks;
														var send_tasks = new Array();
														tasks.forEach(function(task) {
															if(task.isVisible && status === 'published') {
																send_tasks.push({
																	title: 				task.text,
																	description: 	task.help,
																	content: 			task.content,
																	w: 						task.w,
																	files:				task.files
																});
															}
														});
														send_content.tasks= send_tasks;
													}
													if(studentStatus === 'pending' && blocksPresented > blocksPending) {
														res.status(404).json({
															'status': 404,
															'message': 'Your student status is pending and you can only have -' + blocksPending + '- free blocks'
														});
													} else if (studentStatus === 'remove') {
														res.status(404).json({
															'status': 200,
															'message': 'Your student status is remove and you cannot have blocks from this course'
														});
													} else {
														res.status(200).json({
															'status': 200,
															'message': send_content
														});
													}
												} else {
													res.status(404).json({
														'status': 404,
														'message': 'Block requested is not available (not visible nor published)'
													});
												}
											} else {
												res.status(404).json({
													'status': 404,
													'message': 'Block requested is not found'
												});
											}
										})
										.catch((err) => {
											Err.sendError(res,err,'group_controller','nextBlock -- Finding Block --');
										});
								} else {
									res.status(404).json({
										'status': 404,
										'message': 'Course requested is not found'
									});
								}

							})
							.catch((err) => {
								Err.sendError(res,err,'group_controller','nextBlock -- Finding Course --');
							});
					} else {
						res.status(404).json({
							'status': 404,
							'message': 'You do not belong to this group. Please contact your administrator'
						});
					}
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'Group requested not found. Please contact your administrator'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','nextBlock -- Finding Group --');
			});
	}, // nextBlock

	test(req,res) {
		//var message = 'Mensaje de prueba';
		res.status(200).json({
			'url': process.env.LIBRETA_URI,
			'public': process.env.MJ_APIKEY_PUBLIC,
			'private': process.env.MJ_APIKEY_PRIVATE
		});
		//Err.sendError(res,message,'group_controller','test -- testing email --');
	}
};




// Private Functions -----------------------------------------------------------
