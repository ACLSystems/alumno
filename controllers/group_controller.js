const winston = require('winston');
const User = require('../src/users');
//const Org = require('../src/orgs');
//const OrgUnit = require('../src/orgUnits');
const Course = require('../src/courses');
const Group = require('../src/groups');
const Block = require('../src/blocks');
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
		const key = req.headers.key;
		var group = req.body;
		User.findOne({ name: key })
			.populate('org')
			.populate('orgUnit')
			.then((key_user) => {
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
										sendError(res,err,'create.Group -- creating Group --');
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
						sendError(res,err,'create.Group -- Finding Course --');
					});
			})
			.catch((err) => {
				sendError(res,err,'create.Group -- Finding User --');
			});
	}, // create

	createRoster(req,res){
		const key = req.headers.key;
		var roster = req.body;
		const date = new Date();
		User.findOne({ name: key })
			.then((key_user) => {
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
									sendError(res,err,'createRoster.Group -- Saving Group --');
								});
						} else {
							res.status(404).json({
								'status': 404,
								'mesage': 'Group -' + roster.code + '- not found'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'createRoster.Group -- Finding Group --');
					});
			})
			.catch((err) => {
				sendError(res,err,'createRoster.Group -- Finding User --');
			});
	}, //createRoster

	addStudent(req,res) {
		const key = req.headers.key;
		var roster = req.body;
		const date = new Date();
		User.findOne({ name: key })
			.then((key_user) => {
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
												sendError(res,err,'createRoster.Group -- Saving Group --');
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
								sendError(res,err,'addStudent.Group -- Finding Student --');
							});
					})
					.catch((err) => {
						sendError(res,err,'addStudent.Group -- Finding Group --');
					});
			})
			.catch((err) => {
				sendError(res,err,'addStudent.Group -- Finding User --');
			});
	}, //addStudent

	listRoster(req,res) {
		const key = req.headers.key;
		var roster = req.query;
		User.findOne({ name: key })
			.then(() => {
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
						sendError(res,err,'createRoster.Group -- Finding Group --');
					});
			})
			.catch((err) => {
				sendError(res,err,'createRoster.Group -- Finding User --');
			});
	}, //listRoster

	myGroups(req,res) {
		const key = req.headers.key;
		User.findOne({$or: [{name: key},{'person.email': key}]})
			.then((key_user) => {
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
								courseCode: 		group.course.code,
								courseid: 			group.course._id,
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
						sendError(res,err,'mygroups.Group -- Finding Groups --');
					});
			})
			.catch((err) => {
				sendError(res,err,'mygroups.Group -- Finding User --');
			});
	}, // mygroups

	myGroup(req,res) {
		const key 		= req.headers.key;
		const groupid	= req.query.groupid;
		User.findOne({$or: [{name: key},{'person.email': key}]})
			.then((key_user) => {
				Group.findOne({_id: groupid})
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
							Course.findOne({code: myGroup.course.code})
								.then((course) => {
									if(course) {
										if(course.isVisible || course.status === 'published') {
											Block.find({ _id: { $in: course.blocks }})
												.then((blocks) => {
													var send_blocks = new Array();
													blocks.forEach(function(block) {
														if(block.isVisible && block.status === 'published') {
															var send_block = {
																id: 						block._id,
																title: 					block.title,
																section: 				block.section,
																number: 				block.number,
																track:					false,
																questionnarie: 	false,
																task:						false
															};
															if(block.questionnaries && block.questionnaries.length > 0) {
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
															blockNum: send_blocks.length,
															blocks: send_blocks
														}
													});
												})
												.catch((err) => {
													sendError(res,err,'mygroup.Group -- Finding blocks --');
												});
										} else {
											res.status(404).json({
												'status': 404,
												'message': 'Course is not visible nor published yet'
											});
										}
									}
								})
								.catch((err) => {
									sendError(res,err,'mygroup.Group -- Finding Course --');
								});
						} else {
							res.status(400).json({
								'status': 400,
								'message': 'Group with id -' + groupid + '- not found'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'mygroup.Group -- Finding Group --');
					});
			})
			.catch((err) => {
				sendError(res,err,'mygroup.Group -- Finding User --');
			});
	}, // mygroup

	myGrades(req,res){
		const key 		= req.headers.key;
		const groupid	= req.query.groupid;
		User.findOne({$or: [{name: key},{'person.email': key}]})
			.then((key_user) => {
				Group.findOne({_id: groupid})
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
							Course.findOne({code: myGroup.course.code})
								.then((course) => {
									if(course) {
										if(course.isVisible || course.status === 'published') {
											Block.find({ _id: { $in: course.blocks }})
												.then((blocks) => {
													var send_blocks = new Array();
													blocks.forEach(function(block) {
														if(block.isVisible && block.status === 'published') {
															var send_block = {
																id: 						block._id,
																title: 					block.title,
																section: 				block.section,
																number: 				block.number,
															};
															var quest_grades = new Array();
															if(block.questionnaries && block.questionnaries.length > 0) {
																var i = 0;
																block.questionnaries.forEach(function() {
																	grades.forEach(function(grade) {
																		if(grade.block === block._id) {
																			quest_grades.push(grade.quests[i].grade);
																		}
																	});
																	i++;
																});
															}
															var tasks_grades = new Array();
															if(block.tasks && block.tasks.length > 0) {
																i = 0;
																block.tasks.forEach(function() {
																	grades.forEach(function(grade) {
																		if(grade.block === block._id) {
																			tasks_grades.push(grade.tasks[i].grade);
																		}
																	});
																	i++;
																});
															}
															send_block.quests = quest_grades;
															send_block.tasks	= tasks_grades;
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
															blockNum: send_blocks.length,
															blocks: send_blocks
														}
													});
												})
												.catch((err) => {
													sendError(res,err,'mygrades.Group -- Finding blocks --');
												});
										} else {
											res.status(404).json({
												'status': 404,
												'message': 'Course is not visible nor published yet'
											});
										}
									}
								})
								.catch((err) => {
									sendError(res,err,'mygrades.Group -- Finding Course --');
								});
						} else {
							res.status(400).json({
								'status': 400,
								'message': 'Group with id -' + groupid + '- not found'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'mygrades.Group -- Finding Group --');
					});
			})
			.catch((err) => {
				sendError(res,err,'mygrades.Group -- Finding User --');
			});
	}, // myGrades

	nextBlock(req,res) {
		const key 			= req.headers.key;
		const groupid 	= req.query.groupid;
		const courseid 	= req.query.courseid;
		const blockid 	= req.query.blockid;
		var	lastid 			= 'empty';
		if(req.query.lastid) {
			lastid = req.query.lastid;
		}
		var	quests			= [];
		if(req.query.quests) {
			quests = JSON.parse(req.query.quests);
		}
		//var students 		= new Array();
		//var myStudent = -1;
		User.findOne({$or: [{name: key},{'person.email': key}]}) // Buscar el usuario
			.then((key_user) => {
				Group.findById(groupid)		// Buscar el grupo solicitado
					.then((group) => {
						//students = group.roster;
						//myStudent = students.findIndex(myStudent => myStudent.student == key_user._id + '');
						//var myStudentIndex = students.findIndex(myStudent => myStudent == key_user._id + '');
						var i = 0;
						var studentIndex = -1;
						group.roster.forEach(function(s) {
							if(s.student + '' === key_user._id + '') {
								studentIndex = i;
							}
							i++;
						});
						if(studentIndex > -1 ) {
							Course.findById(courseid) // Buscar el curso
								.then((course) => {
									if(course) {					// Encontramos curso, ahora hay que buscar el registro track del usuario
										var blocks = course.blocks;
										Block.findById(blockid)	// Buscar el bloque solicitado
											.then((block) => {
												if(block) {
													var prevblockid = '';
													var nextblockid = '';
													var grades = {};
													if(group.roster[studentIndex].grades) {
														grades = group.roster[studentIndex].grades;
														var myGrade = {};
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
																if(quests.length > 0) {
																	myGrade.quests = quests;
																}
																grades.push(myGrade);
															}
														}
													} else { // No existe el bloque
														if(lastid !== 'empty') {
															grades = [{
																block: lastid,
																track: 100
															}];
															if(quests.length > 0) {
																grades.quests = quests;
															}
														}
													}
													group.roster[studentIndex].grades = grades;
													group.save()
														.catch((err) => {
															sendError(res,err,'nextBlock.Group -- Saving Block --');
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
															blockCode:				block.code,
															blockType: 				block.type,
															blockTitle: 			block.title,
															blockSection: 		block.section,
															blockNumber: 			block.number,
															blockContent: 		block.content,
															blockMinimumTime: block.defaultmin,
															blockCurrentId:		block._id,
															blockPrevId:			prevblockid,
															blockNextId:			nextblockid
														};
														if(block.questionnaries && block.questionnaries.length > 0) {
															var questionnaries =  new Array();
															questionnaries = block.questionnaries;
															var send_questionnaries = new Array();
															questionnaries.forEach(function(quest) {
																if(quest.isVisible) {
																	var questions = quest.questions;
																	var send_questions = new Array();
																	questions.forEach(function(q) {
																		if(q.isVisible) {
																			send_questions.push({
																				text: 		q.text,
																				help: 		q.help,
																				type: 		q.type,
																				w: 				q.w,
																				answers:	q.answers,
																				options:	q.options,
																				footer:		q.footer
																			});
																		}
																	});
																	send_questionnaries.push({
																		type: quest.type,
																		begin: quest.begin,
																		questions: send_questions
																	});
																}
															});
															send_content.questionnaries= send_questionnaries;
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
														res.status(200).json({
															'status': 200,
															'message': send_content
														});
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
												sendError(res,err,'nextBlock.Group -- Finding Block --');
											});
									} else {
										res.status(404).json({
											'status': 404,
											'message': 'Course requested is not found'
										});
									}

								})
								.catch((err) => {
									sendError(res,err,'nextBlock.Group -- Finding Course --');
								});
						} else {
							res.status(404).json({
								'status': 404,
								'message': 'You do not belong to this group. Please contact your administrator'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'nextBlock.Group -- Finding Group --');
					});
			})
			.catch((err) => {
				sendError(res,err,'nextBlock.Group -- Finding User --');
			});
	}
};



// Private Functions -----------------------------------------------------------

function sendError(res, err, section,send_user) {
	logger.info('Course controller -- Section: ' + section + '----');
	logger.info(err);
	if(!send_user) {
		res.status(500).json({
			'status': 500,
			'message': 'Error',
			'Error': err.message
		});
	}
	return;
}
