//const winston = require('winston');
const User = require('../src/users');
//const Org = require('../src/orgs');
//const OrgUnit = require('../src/orgUnits');
const Course = require('../src/courses');
const Group = require('../src/groups');
const Roster = require('../src/roster');
const Block = require('../src/blocks');
const Err = require('../controllers/err500_controller');
const mailjet = require('../shared/mailjet');
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
					if(!group.instructor) {
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
			.populate('course', 'title code numBlocks')
			.populate('instructor', 'name person')
			.populate('org', 'name')
			.populate('orgUnit', 'name longName')
			.populate('students', 'name person')
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
		const link = url;
		Group.findOne({ code: roster.code })
			.populate({
				path: 'course',
				select: 'blocks',
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
						what: 'Roster Creation'
					};
					const blocks = group.course.blocks;
					User.find({_id: { $in: roster.roster}})
						.select('person')
						.then((students) => {
							students.forEach(function(student) {
								var grade = new Array();
								var sec = 0;
								blocks.forEach(function(block) {
									grade.push({
										block			: block._id,
										track			: 0,
										maxGradeQ : 0,
										gradeT		: 0,
										w					: block.w,
										wq				: block.wq,
										wt				: block.wt
									});
									if(block.section !== sec) {
										sec++;
									}
								});
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
									sections 	: sections
								});
								new_roster.save()
									.then(() => {
										mailjet.sendMail(student.person.email, student.person.name, 'Has sido enrolado a un curso',339994,link,group.course.title);
									})
									.catch((err) => {
										Err.sendError(res,err,'group_controller','createRoster -- Saving Student --');
									});
								group.roster.push(student);
							});
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

	// FALTA ARREGLAR addStudent!!!
	addStudent(req,res) {
		const key_user 	= res.locals.user;
		var roster = req.body;
		const date = new Date();
		const link = url;
		Group.findOne({ code: roster.code })
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
			.populate({
				path: 'roster',
				populate: {
					path: 'student',
					select: 'name person student'
				}
			})
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
					res.status(404).json({
						'status': 404,
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
								new_block.duration = block.duration + block.durationUnits;
							}
							if(item.sections && item.sections.length > 0 && item.sections[block.section] && item.sections[block.section].beginDate) {
								new_block.beginDate = item.sections[block.section].beginDate;
							}
							if(item.sections && item.sections.length > 0 && item.sections[block.section] && item.sections[block.section].endDate) {
								new_block.endDate = item.sections[block.section].endDate;
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
					res.status(404).json({
						'status': 404,
						'message': 'Group with id -' + groupid + '- not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','mygroup -- Finding Roster/Group --');
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
		var maxAttempts = 5;
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
						select: 'questionnarie w wq wt',
						populate: {
							path: 'questionnarie',
							select: 'maxAttempts'
						}
					}
				}
			})
			.then((item) => {
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
						myGrade.quests 	= [quest];
						myGrade.track		= 100;
					}
					if(myGrade.w === 0) {
						if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].w === 1) {
							myGrade.w = 1;
						}
					}
					if(myGrade.wq === 0) {
						if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wq === 1) {
							myGrade.wq = 1;
						}
					}
					if(myGrade.wt === 0) {
						if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wt === 1) {
							myGrade.wt = 1;
						}
					}
					item.grades[k] = myGrade;
				} else {
					myGrade = {
						block	: blockid,
						quests: [quest],
						track	: 100
					};
					if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].w === 1) {
						myGrade.w = 1;
					}
					if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wq === 1) {
						myGrade.wq = 1;
					}
					if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wt === 1) {
						myGrade.wt = 1;
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
		const file 			= req.body.file;
		const text			= req.body.text;
		var task = {
			file 		: file,
			text		: text,
			date		: new Date()
		};
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
							select: 'items'
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
					if(myGrade.tasks && myGrade.tasks.length > 0) {
						myGrade.tasks.push(task);
					} else {
						myGrade.tasks 	= [task];
						myGrade.track		= 100;
					}
					item.grades[k] = myGrade;
				} else {
					myGrade = {
						block	: blockid,
						tasks: [task],
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
					item.grades = [myGrade];
				}
				item.save()
					.then(() => {
						res.status(200).json({
							'status': 200,
							'message': 'task saved'
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

	myGrades(req,res){
		const groupid		= req.query.groupid;
		const key_user 	= res.locals.user;
		Roster.findOne({student: key_user.id, group: groupid})
			.populate({
				path: 'group',
				select: 'course',
				populate: {
					path: 'course',
					select: 'blocks',
					populate: {
						path: 'blocks',
						select: 'title section number'
					}
				}
			})
			.then((item) => {
				if(item) {
					var blocks	= new Array();
					const bs 		= item.group.course.blocks;
					item.grades.forEach(function(grade) {
						if(grade.w > 0) {
							var i = 0;
							var block = {};
							while (i < bs.length) {
								if(grade.block + '' === bs[i]._id + '') {
									block = {
										blockTitle	: bs[i].title,
										blockSection: bs[i].section,
										blockNumber	: bs[i].number
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
					res.status(200).json({
						'status': 200,
						'message': {
							name			: key_user.person.fullName,
							finalGrade: item.finalGrade,
							minGrade	: item.minGrade,
							track			: parseInt(item.track) + '%',
							minTrack	: item.minTrack + '%',
							pass			: item.pass,
							passDate	: item.passDate,
							blocks		: blocks
						}
					});
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'You are not enrolled in this group'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','mygrades -- Finding Roster --');
			});
	}, // myGrades

	getResource(req,res) {
		const key_user 	= res.locals.user;
		const groupid		= req.query.groupid;
		Roster.findOne({student: key_user.id, group: groupid})
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
			},
			{
				path: 'grades.block',
				select: 'section'
			}
			])
			.then((item) => {
				var prevblockid = '';
				var nextblockid = '';
				const studentStatus = item.status;
				const blocks = item.group.course.blocks;
				// Existe el roster? Si no existe, quiere decir que el alumno no está enrolado a este grupo
				if(item) {
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
							cause = 'Course will begin at ' + item.group.beginDate;
							causeSP = 'El curso comenzará el ' + item.group.beginDate;
						} else
						if(item.group.endDate && item.group.endDate < now) {
							ok 		= false;
							cause = 'Course ended at ' + item.group.endDate;
							causeSP = 'El curso terminó el ' + item.group.endDate;
						}
					}

					var grades = new Array();
					var currentBlockGrade = 0;
					var lastAttempt = 0;
					var numAttempts = 0;
					var lastIndex = 0;
					var lastSection = 0;
					var section 		= 0;
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
						var track = 0;
						grades.forEach(function(grade) {
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
								track 						= grade.track;
								section 					= grade.block.section;
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
						ok = false;
						cause = 'Section '+ sectionDisp +' will begin at ' + item.sections[section].beginDate;
						causeSP = 'La sección '+ sectionDisp +' comenzará el ' + item.sections[section].beginDate;
					}
					if(item.sections && item.sections.length > 0 && item.sections[section] && item.sections[section].endDate && item.sections[section].endDate < now) {
						ok = false;
						cause = 'Section '+ sectionDisp +' was closed at ' + item.sections[section].endDate;
						causeSP = 'La sección '+ sectionDisp +' terminó el ' + item.sections[section].endDate;
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
							if(item.group.presentBlockBy && item.group.presentBlockBy === 'lapse'){
								item.sections[lastSection].viewed	= now;
								if(item.group && item.group.lapseBlocks.length > 0 && item.group.lapseBlocks[nextSection]) {
									item.sections[nextSection].beginDate = expiresIn(now, item.group.lapseBlocks[nextSection]);
								}
								save = true;
							} else {
								item.sections[lastSection].viewed = now;
								save = true;
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
								Err.sendError(res,err,'group_controller','nextBlock -- Saving item --');
							});
					}
					if(ok) {
						var blockIndex 	= blocks.findIndex(blockIndex => blockIndex == blockid + '');
						if(blockIndex === -1) {
							res.status(404).json({
								'status': 404,
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
											'message': send_block
										});
									}
								} else { // if(block)
									res.status(404).json({
										'status': 404,
										'message': 'Block requested is not found'
									});
								}
							}) // then((block))
							.catch((err) => {
								Err.sendError(res,err,'group_controller','nextBlock -- Finding Block --');
							});
					} else { // if(ok)
						res.status(404).json({
							'status': 404,
							'message': 'Block cannot be displayed because: ' + cause,
							'messageUser': 'El bloque no puede presentarse debido a: ' + causeSP
						});
					}
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'You are not enrolled to this group'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','nextBlock -- Finding Roster --');
			});
	}, // nextBlock

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
					res.status(404).json({
						'status': 404,
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
							grade = parseInt(grades[i].quests[0].grade + 1);
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
									grade = parseInt(grades[i].quests[0].grade - 1);
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

	test(req,res) {
		//var message = 'Mensaje de prueba';
		res.status(200).json({
			'url': process.env.LIBRETA_URI,
			'public': process.env.MJ_APIKEY_PUBLIC,
			'private': process.env.MJ_APIKEY_PRIVATE,
			'hola': 'mundo'
		});
		//Err.sendError(res,message,'group_controller','test -- testing email --');
	}
};




// Private Functions -----------------------------------------------------------


function expiresIn(date, numDays) {
	var dateObj = new Date(date);
	return dateObj.setDate(dateObj.getDate() + numDays);
}

/*
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
*/
