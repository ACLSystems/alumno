//const winston = require('winston');
const User = require('../src/users');
//const Org = require('../src/orgs');
//const OrgUnit = require('../src/orgUnits');
const Course = require('../src/courses');
const Group = require('../src/groups');
const Block = require('../src/blocks');
const Err = require('../controllers/err500_controller');
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
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','create -- Finding User --');
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
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','createRoster -- Finding User --');
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
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','addStudent -- Finding User --');
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
						Err.sendError(res,err,'group_controller','listRoster -- Finding Group --');
					});
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','listRoster -- Finding User --');
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
						Err.sendError(res,err,'group_controller','mygroups -- Finding Groups --');
					});
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','mygroups -- Finding User --');
			});
	}, // mygroups

	myGroup(req,res) {
		const key 		= req.headers.key;
		const groupid	= req.query.groupid;
		User.findOne({$or: [{name: key},{'person.email': key}]})
			.then((key_user) => {
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
														blockNum: send_blocks.length,
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
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','mygroup -- Finding User --');
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
													Err.sendError(res,err,'group_controller','mygrades -- Finding blocks --');
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
									Err.sendError(res,err,'group_controller','mygrades -- Finding Course --');
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
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','mygrades -- Finding User --');
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
														var grades = {};
														var attempts = new Array();
														const today = new Date();
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
																	if(quests.length > 0) {
																		myGrade.quests = quests;
																		attempts.push(today);
																		myGrade.quests.attempts = attempts;
																	}
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
																if(quests.length > 0) {
																	grades.quests = quests;
																	attempts.push(today);
																	myGrade.quests.attempts = attempts;
																}
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
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','nextBlock -- Finding User --');
			});
	}, // nextBlock

	test(req,res) {
		var message = 'Mensaje de prueba';
		Err.sendError(res,message,'group_controller','test -- testing email --');
	}
};




// Private Functions -----------------------------------------------------------
