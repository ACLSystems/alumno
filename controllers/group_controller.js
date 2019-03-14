const mongoose 		= require('mongoose');
const User 				= require('../src/users'										);
const orgUnit 		= require('../src/orgUnits'									);
const Course 			= require('../src/courses'									);
const Group 			= require('../src/groups'										);
const Roster 			= require('../src/roster'										);
const Certificate = require('../src/certificates'							);
const Block 			= require('../src/blocks'										);
const Dependency 	= require('../src/dependencies'							);
const Err 				= require('../controllers/err500_controller');
const mailjet 		= require('../shared/mailjet'								);
const Notification = require('../src/notifications'						);
const Attempt 		= require('../src/attempts'									);
const TA 					= require('time-ago'												);
const cache 			= require('../src/cache'										);

const url = process.env.LIBRETA_URI;
const supportEmail = process.env.SUPPORT_EMAIL;
const portal = process.env.PORTAL;

module.exports = {
	create(req,res) {
		const key_user 	= res.locals.user;
		if(!mongoose.Types.ObjectId.isValid(req.body.course)) {
			res.status(406).json({
				'message': 'Error: course must be an ObjectID'
			});
			return;
		}
		if(!mongoose.Types.ObjectId.isValid(req.body.instructor)) {
			res.status(406).json({
				'message': 'Error: instructor must be an ObjectID'
			});
			return;
		}
		if(!mongoose.Types.ObjectId.isValid(req.body.orgUnit)) {
			res.status(406).json({
				'message': 'Error: orgUnit must be an ObjectID'
			});
			return;
		}
		var group = req.body;
		if(!group.instructor) {
			group.instructor = key_user._id;
		}
		Promise.all([
			Course.findOne({ _id: group.course })
			// Esta parte sirve para recolectar la rúbrica
				.populate({
					path: 'blocks',
					match: {type: {$in: ['task','questionnarie']}},
					select: 'w wt wq'
				}),
			// ----
			// Hay que ver si el instructor es un usuario válido
			User.findById(group.instructor).lean()
		])
			.then((results) => {
				var [course,instructor] = results;
				if(!instructor) {
					res.status(401).json({
						'message': 'Instructor is not found. Please provide a valid user id'
					});
					return;
				} else if(!instructor.roles.isInstructor) {
					res.status(401).json({
						'message': 'User has no role of Instructor. Please provide a valid user id with valid role'
					});
					return;
				}
				if(course) {
					const date = new Date();
					group.org = key_user.org._id;
					if(key_user.roles.isAdmin || key_user.roles.isBusiness) {
						if(!group.orgUnit) {
							group.orgUnit = key_user.orgUnit._id;
						} else {
							if(!mongoose.Types.ObjectId.isValid(req.body.orgUnit)) {
								res.status(401).json({
									'message': 'Error: orgUnit is not a valid ObjectID'
								});
							}
						}
					} else {
						group.orgUnit = key_user.orgUnit._id;
					}
					if(!group.type) {
						group.type = course.type;
					}
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
					// Agregar la rúbrica recolectada desde los bloques
					group.rubric = [];
					if(course.blocks.length > 0) {
						course.blocks.forEach(function(block) {
							group.rubric.push({
								block	: block._id,
								w			: block.w,
								wq		: block.wq,
								wt		: block.wt
							});
						});
					}
					//	---------
					group.roster = [];
					group.students = [];
					orgUnit.findById(group.orgUnit).lean()
						.then((ou) => {
							if(ou) {
								Group.create(group)
									.then((grp) => {
										res.status(200).json({
											'message': 'Group created',
											'group': {
												id: grp.id,
												code: grp.code,
												name: grp.name
											}
										});
										if(course.type === 'tutor') {
											mailjet.sendMail(supportEmail, 'Administrador', 'Alerta: Se ha generado un grupo de tipo tutor. Favor de gestionar. +' + group.code,679640,portal,'Se ha generado un grupo de tipo tutor. Favor de gestionar. +' + group.code + ' ' + group.course.title);
										} else {
											mailjet.sendMail(supportEmail, 'Administrador', 'Aviso: Se ha generado un grupo. + ' + group.code,679640,portal,'Se ha generado un grupo. + ' + group.code + ' ' + group.course.title);
										}
									})
									.catch((err) => {
										if(err.message.indexOf('E11000 duplicate key error collection') !== -1 ) {
											res.status(406).json({
												'message': 'Error -: group -' + group.code + '- already exists'
											});
										} else {
											Err.sendError(res,err,'group_controller','create -- creating Group --');
										}
									});
							} else {
								res.status(401).json({
									'message': 'Error -: orgUnit -' + group.orgUnit + '- does not exists'
								});
							}
						})
						.catch((err) => {
							Err.sendError(res,err,'group_controller','create -- Finding orgUnit --');
						});
				} else {
					res.status(404).json({
						'message': 'Error -: Course -'+ group.course + '- not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','create -- Finding Course --');
			});
	}, // create

	get(req,res) {
		// se requiere el ID del grupo
		//const key_user = res.locals.user;
		Group.findById(req.query.groupid)
			.then((group) => {
				if(group) {
					var varEnum	= {
						status				: varenum('status'),
						type					: varenum('type'),
						presentBlockBy: varenum('presentBlockBy')
					};
					res.status(200).json({
						status	: 200,
						message	: group,
						enum		: varEnum
					});
				} else {
					res.status(200).json({
						status	: 200,
						message	: 'Group ' + req.query.groupid + ' not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','get -- Finding group --');
			});
	}, // get

	modify(req,res) {
		// se requiere el ID del grupo
		const key_user = res.locals.user;
		Group.findById(req.body.groupid)
			.then((group) => {
				if(group) {
					var date = new Date();
					var mod = {
						by: key_user.name,
						when: date,
						what: 'Group modification'
					};
					group.mod.push(mod);
					var req_group = req.body;
					if(req_group.code							) {group.code 							= req_group.code;							}
					if(req_group.name							) {group.name 							= req_group.name;							}
					if(req_group.status						) {group.status 						= req_group.status;						}
					if(req_group.type							) {group.type 							= req_group.type;							}
					if(req_group.course						) {group.course 						= req_group.course;						}
					if(req_group.instructor				) {group.instructor 				= req_group.instructor;				}
					if(req_group.orgUnit					) {group.orgUnit		 				= req_group.orgUnit;					}
					if(req_group.org							) {group.org				 				= req_group.org;							}
					if(req_group.beginDate				) {group.beginDate					= req_group.beginDate;				}
					if(req_group.endDate					) {group.endDate						= req_group.endDate;					}
					if(req_group.rubric						) {group.rubric			 				= req_group.rubric;						}
					if(req_group.certificateActive) {group.certificateActive	= req_group.certificateActive;}
					if(req_group.isActive					) {group.isActive						= req_group.isActive;					}
					if(req_group.minTrack					) {group.minTrack						= req_group.minTrack;					}
					if(req_group.minGrade					) {group.minGrade						= req_group.minGrade;					}
					if(req_group.lapseBlocks			) {group.lapseBlocks				= req_group.lapseBlocks;			}
					if(req_group.lapse						) {group.lapse							= req_group.lapse;						}
					if(req_group.dates						) {group.dates							= req_group.dates;						}
					if(req_group.presentBlockBy		) {group.presentBlockBy			= req_group.presentBlockBy;		}
					group.save()
						.then(() => {
							res.status(200).json({
								'status': 200,
								'message': 'Group -'+ group._id +'- modified'
							});
						});
				} else {
					res.status(200).json({
						status	: 200,
						message	: 'Group ' + req.body.groupid + ' not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','modify -- Finding group --');
			});
	}, // modify

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
				var send_groups = [];
				groups.forEach(function(group) {
					var send_group = {
						id					: group._id,
						code				: group.code,
						name				: group.name,
						status			: group.status,
						type				: group.type,
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
					var send_students = [];
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
				var send_groups = [];
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
					var send_students = [];
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
		if(roster.roster && roster.roster.length > 0) {
			roster.roster = unique(roster.roster);
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
						if(group.status !== 'active') {
							res.status(200).json({
								'status': 200,
								'message': 'Group ' + group.name + ' (' + group.code + ') is not active'
							});
							return;
						}
						var mod = {
							by: key_user.name,
							when: date,
							what: 'Adding student(s) to roster'
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
													blocks[cursor].dependencies = [];
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
													blocks[cursor].dependencies = [];
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
										var my_roster 		= [];
										var new_students	= [];
										var status				= roster.status || 'pending';
										students.forEach(function(student) {
											// el siguiente código es para validar si el usuario ya está registrado en este grupo
											// si ya existe el id del usuario, se lo brinca
											var found = false;
											if(group.students){
												found = group.students.find(function(st) {
													return st + '' === student._id + '';
												});
											}
											if(!found) { // Si encontramos el id del usuario, no hagas nada...
												var grade = [];
												var sec = 0;
												blocks.forEach(function(block) {
													var gradePushed = {
														block					: block._id,
														track					: 0,
														maxGradeQ 		: 0,
														gradeT				: 0,
														w							: block.w,
														wq						: block.wq,
														wt						: block.wt,
														dependencies	: block.dependencies
													};
													var gradeIndex = -1;
													if(group.rubric && group.rubric.length > 0) { gradeIndex = group.rubric.findIndex(rubric => rubric.block + '' === gradePushed.block + ''); }
													if(gradeIndex > -1 ) {
														gradePushed.w 	= group.rubric[gradeIndex].w;
														gradePushed.wt 	= group.rubric[gradeIndex].wt;
														gradePushed.wq 	= group.rubric[gradeIndex].wq;
													}
													grade.push(gradePushed);
													if(block.section !== sec) {
														sec++;
													}
												});
												if(blocks[0].section === 0) {
													sec++;
												}
												var sections = [];
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
												/*
										// Modificar la rúbrica que trajimos el curso y colocar la del grupo
										if(group.rubric && group.rubric.length > 0) {
											var rubcount = 0;
											group.rubric.forEach(function(rub) {
												var found = false;
												var i 		= 0;
												while(!found && i < group.grade.length) {
													if(rub.block + '' === group.grade[i].block + '') {
														found = true;
													} else {
														i++;
													}
												}
												if(found) {
													group.rubric[rubcount].w 	= group.grade[i].w;
													group.rubric[rubcount].wq = group.grade[i].wq;
													group.rubric[rubcount].wt = group.grade[i].wt;
												}
												rubcount++;
											});
										}
										*/
												//
												var new_roster = new Roster({
													student		: student,
													status		: status,
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
													}],
													mod 		: [{
														what		: 'Roster creation',
														who			: key_user.name,
														when		: date
													}],
												});
												new_students.push(student._id);
												my_roster.push(new_roster._id);
												new_roster.save()
													.then(() => {
														mailjet.sendMail(student.person.email, student.person.name, 'Has sido enrolado al curso ' + group.course.title,339994,link,group.course.title);
														var not = new Notification({
															destination: {
																kind: 'users',
																item: student._id,
																role: 'user'
															},
															objects: [
																{
																	kind: 'courses',
																	item: group.course._id
																},
																{
																	kind: 'groups',
																	item: group._id
																},
																{
																	kind: 'blocks',
																	item: group.course.blocks[0]._id
																}
															],
															type: 'system',
															message: 'Has sido enrolado al curso ' + group.course.title
														});
														not.save()
															.catch((err) => {
																Err.sendError(res,err,'group_controller','createRoster -- Creating Notification --',false,false,`Group: ${group.name} Student: ${student.person.email}`);
															});
													})
													.catch((err) => {
														Err.sendError(res,err,'group_controller','createRoster -- Saving Student --');
													});
											}
										});
										group.students 	= group.students.concat(new_students);
										group.roster		= group.roster.concat(my_roster);
										group.mod.push(mod);
										group.save()
											.catch((err) => {
												Err.sendError(res,err,'group_controller','createRoster -- Saving group -- user: ' +
													key_user.name + ' groupid: ' + group._id);
											});
										var newStudents = 0;
										var totalRoster = 0;
										var alreadyIn		= 0;
										if(new_students && new_students.length > 0) {
											newStudents = new_students.length;
										}
										if(group.students && group.students.length > 0) {
											totalRoster = group.students.length;
										}
										alreadyIn = roster.roster.length - newStudents;
										res.status(200).json({
											'status': 200,
											'message': 'Roster created',
											'newStudents': newStudents,
											'totalRoster': totalRoster,
											'alreadyIn': alreadyIn
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
		} else {
			res.status(200).json({
				'status': 200,
				'mesage': 'No students to add. Please send students in roster array to add.'
			});
		}
	}, //createRoster

	notify(req,res) {
		var query				= {};
		if(req.body.courseid) {
			query.course = req.body.courseid;
		}
		if(req.body.ouid) {
			query.orgUnit = req.body.ouid;
		}
		if(req.body.groupid) {
			query = {_id : req.body.groupid};
		}
		const message  	= req.body.message;
		var find_groups = [];
		var send_groups = [];
		Group.find(query)
			.select('_id name code')
			.then((groups) => {
				if(groups && groups.length > 0) {
					groups.forEach(g => {
						find_groups.push(g._id);
						send_groups.push({
							name: g.name,
							code: g.code
						});
					});
					Roster.find({group: {$in: find_groups}})
						.populate([
							{
								path: 'student',
								select: 'person'
							},
							{
								path: 'group',
								select: 'course code',
								populate: {
									path: 'course',
									select: 'title'
								}
							}])
						.select('student group')
						.lean()
						.then((items)  => {
							if(items.length > 0) {
								res.status(200).json({
									'status'	: 20,
									'message'	: items.length + ' emails are being sending',
									'groups'	: send_groups
								});
								items.forEach(function(roster) {
									mailjet.sendMail(roster.student.person.email, roster.student.person.name, 'Mensaje del curso ' + roster.group.course.title,391119,roster.group.course.title,message);
								});
							} else {
								res.status(200).json({
									'status'	: 200,
									'message'	: 'Students not found. Maybe wrong group id?',
									'query'		: query
								});
							}
						})
						.catch((err) => {
							Err.sendError(res,err,'group_controller','notify -- Finding Roster --');
						});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','notify -- Finding Groups --');
			});
	},

	/*
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
	*/

	modifyRosterStatus(req,res) {
		const key_user 	= res.locals.user;
		var groupid			= req.body.groupid;
		var roster			= req.body.roster;
		var status			= req.body.status;
		var query				= { group: groupid };

		if(roster && roster.length > 0) {
			query.student = { $in: roster };
		}
		const date = new Date();
		Roster.find(query).select('_id mod').lean()
			.then((results) => {
				if(results && results.length > 0) {
					results.forEach(function(item) {
						var mod = [];
						if(item.mod && item.mod.length > 0){
							mod = item.mod;
							mod.push({
								by: key_user.name,
								when: date,
								what: 'Changing status to ' + status
							});
						} else {
							mod = [{
								by: key_user.name,
								when: date,
								what: 'Changing status to ' + status
							}];
						}
						Roster.findByIdAndUpdate(item._id,{$set: {status: status, mod: mod}})
							.catch((err) => {
								Err.sendError(res,err,'group_controller','modifyRosterStatus -- Updating status --', false,false,'Roster: ' + item + ' status: ' + status);
							});
					});
					res.status(200).json({
						'status': 200,
						'message': 'Status modified',
						'rostersModified': results.length
					});
				} else {
					res.status(200).json({
						'status': 404,
						'message': 'No rosters found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','modifyRosterStatus -- Finding rosters --');
			});
	}, //modifyRosterStatus

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
					select: 'section number title'
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
						groupid			: group._id,
						groupcode		: group.code,
						groupname		: group.name,
						groupStatus : group.status,
						coursetitle	: group.course.title,
						courseid		: group.course._id,
						instructor	: `${group.instructor.person.name} ${group.instructor.person.fatherName}`,
						beginDate		: group.beginDate,
						endDate			: group.endDate,
						orgUnit			: group.orgUnit.name,
						orgUnitLong	: group.orgUnit.longName,
						numStudents : group.roster.length,
					};
					var students 	= [];
					var pending 	= 0;
					var active 		= 0;
					group.roster.forEach(function(s) {
						if(!s.pass) {
							s.pass = false;
						}
						if(s.status === 'pending')	{ pending++;}
						if(s.status === 'active')		{ active++;	}
						var send_student = {
							userid					: s.student._id,
							userName				: s.student.person.name,
							userFatherName	: s.student.person.fatherName,
							userMotherName	: s.student.person.motherName,
							useremail				: s.student.name,
							status					: s.status,
							name						: s.student.person.fullName,
							finalGrade			: s.finalGrade,
							track						: s.track,
							pass						: s.pass,
							passDate				: s.passDate,
							newTask					: s.newTask
						};

						var send_grades = [];

						if(s.grades && s.grades.length > 0) {
							var lastBlockSeen = -1;
							var acc 					= 0;
							s.grades.forEach(function(g) {
								var send_grade 	= {};
								var flag 				= false;
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
													send_grade.blockid	= blocks[b]._id;
													send_grade.section 	= blocks[b].section;
													send_grade.number		= blocks[b].number;
													if(g.tasktries && g.tasktries.length > 0) {
														send_grade.taskDelivered = true;
													} else {
														send_grade.taskDelivered = false;
													}
													send_grade.track = g.track;
													if(g.gradeT > 0){
														send_grade.taskGrade 	= g.gradeT;
													}
													if(g.gradedT === true) {
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
								if(g.track > 0) {
									lastBlockSeen = acc;
								}
								acc++;
								if(flag) {
									send_grades.push(send_grade);
								}
							});
							if(lastBlockSeen > -1) {
								let section = 0;
								let number = 0;
								let title  = 'Alumno no ha comenzado el curso';
								if(group.course &&
									group.course.blocks &&
									group.course.blocks[lastBlockSeen] &&
									group.course.blocks[lastBlockSeen].section ) {
									section = group.course.blocks[lastBlockSeen].section;
								}
								if(group.course &&
									group.course.blocks &&
									group.course.blocks[lastBlockSeen] &&
									group.course.blocks[lastBlockSeen].number ) {
									number = group.course.blocks[lastBlockSeen].number;
								}
								if(group.course &&
									group.course.blocks &&
									group.course.blocks[lastBlockSeen] &&
									group.course.blocks[lastBlockSeen].title ) {
									title = group.course.blocks[lastBlockSeen].title;
								}
								send_student.lastBlock = {
									section	: section,
									number	: number,
									title		: title
								};
							} else {
								send_student.lastBlock = {
									section	: 0,
									number	: 0,
									title		: 'Alumno no ha comenzado el curso'
								};
							}
						}
						send_student.grades = send_grades;
						students.push(send_student);
					});
					send_group.totalActive = active;
					send_group.totalPending = pending;
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

	async myGroups(req,res) {
		function sendGroups(items) {
			var send_groups = [];
			items.forEach(function(item) {
				var send_group = {};
				send_group = {
					code						: item.group.code,
					groupid					: item.group._id,
					name						: item.group.name,
					beginDate				: item.group.beginDate,
					endDate					: item.group.endDate,
					status					: item.group.status,
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
		}

		const key_user 	= res.locals.user;
		let myGroups = await cache.hget('mygroups:' + key_user._id, 'groups');
		if(!myGroups) {
			Roster.find({student: key_user._id})
				.populate({
					path: 'group',
					model: 'groups',
					select: 'code name beginDate endDate presentBlockBy lapse status',
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
				.select('status track group')
				.lean()
				.then((items) => {
					if(items.length > 0) {
						cache.hset('mygroups:' + key_user._id, 'groups', JSON.stringify(items));
						cache.expire('mygroups:' + key_user._id,cache.ttl);
						sendGroups(items);
					} else {
						res.status(200).json({
							'message': 'No groups found'
						});
					}
				})
				.catch((err) => {
					Err.sendError(res,err,'group_controller','mygroups -- Finding groups through Roster --');
				});
		} else {
			sendGroups(JSON.parse(myGroups));
		}
	}, // mygroups

	myGroup(req,res) {

		async function setCache(group,course,orgUnit,user) {
			const key = 'group:' + group + '-' +
			'course:' + course + '-' +
			'orgunit:' + orgUnit + '-' +
			'user:' + user;
			await cache.set(key,user+'');
			await cache.expire(key, cache.ttl);
		}

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
					var blocks 		= [];
					if(item.group.course.blocks && item.group.course.blocks.length > 0) {
						blocks = item.group.course.blocks;
					}
					var new_blocks	= [];
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
									const begDate = new Date(new_block.beginDate);
									const now = new Date();
									const diff = begDate.getTime() - now.getTime();
									if(diff > 0) {
										new_block.beginDate = item.sections[block.section].beginDate;
									}
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
					setCache(item.group._id,course,item.orgUnit,key_user._id);
				}	else {
					res.status(200).json({
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
							select: 'course code name beginDate endDate status',
							populate: {
								path: 'course',
								select: 'code title'
							}
						})
						.lean()
						.then((items) => {
							if(items.length > 0 ) {
								var send_items = [];
								items.forEach(function(item) {
									var beginDate;
									var endDate;
									if(item.group.beginDate) {beginDate = new Date(item.group.beginDate);}
									if(item.group.endDate) {endDate = new Date(item.group.endDate);}
									send_items.push({
										status			: item.status,
										group				: {
											id				: item.group._id,
											name			: item.group.name,
											code			: item.group.code,
											status 		: item.group.status,
											beginDate	: beginDate.toDateString(),
											endDate		: endDate.toDateString()
										},
										course			:	{
											title			: item.group.course.title,
											code 			:	item.group.course.code,
										}
									});
								});
								res.status(200).json({
									'message': {
										'name'	: user.person.fullName,
										'id'		: user._id,
										'groups': send_items
									}
								});
							} else {
								res.status(200).json({
									'message': 'User ' + user.person.fullName + ' -'+ user._id +'- '+' has no groups'
								});
							}
						})
						.catch((err) => {
							Err.sendError(res,err,'group_controller','getGroups -- Finding Roster Group Course --');
						});
				} else {
					res.status(200).json({
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
					var index = -1;
					if(item.group.rubric && item.group.rubric.length > 0) { index = item.group.rubric.findIndex(i => i.block + '' === myGrade.block + ''); }
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
							//if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].w) {
							//	myGrade.w = item.group.course.blocks[0].w;
							//}
							// implementamos la rúbrica desde el grupo
							if(item.group && item.group.rubric && item.group.rubric.length > 0 && index > -1 && item.group.rubric[index].w) {
								myGrade.w = item.group.rubric[index].w;
							}
						}
						if(myGrade.wq === 0) {
							//if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wq) {
							//	myGrade.wq = item.group.course.blocks[0].wq;
							//}
							if(item.group && item.group.rubric && item.group.rubric.length > 0 && index > -1 && item.group.rubric[index].wq) {
								myGrade.wq = item.group.rubric[index].wq;
							}
						}
						if(myGrade.wt === 0) {
							//if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wt) {
							//	myGrade.wt = item.group.course.blocks[0].wt;
							//}
							if(item.group && item.group.rubric && item.group.rubric.length > 0 && index > -1 && item.group.rubric[index].wt) {
								myGrade.wt = item.group.rubric[index].wt;
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
						//if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].w) {
						//	myGrade.w = item.group.course.blocks[0].w;
						//}
						if(item.group && item.group.rubric && item.group.rubric.length > 0 && index > -1 && item.group.rubric[index].w) {
							myGrade.w = item.group.rubric[index].w;
						}
						//if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wq) {
						//	myGrade.wq = item.group.course.blocks[0].wq;
						//}
						if(item.group && item.group.rubric && item.group.rubric.length > 0 && index > -1 && item.group.rubric[index].wq) {
							myGrade.wq = item.group.rubric[index].wq;
						}
						//if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wt) {
						//	myGrade.wt = item.group.course.blocks[0].wt;
						//}
						if(item.group && item.group.rubric && item.group.rubric.length > 0 && index > -1 && item.group.rubric[index].wt) {
							myGrade.wt = item.group.rubric[index].wt;
						}
						item.grades = [myGrade];
					}
					item.save()
						.then((item) => {
							const attempt = new Attempt({
								attempt : quest,
								roster	: item._id,
								block		: blockid,
								user		: key_user._id
							});
							attempt.save()
								.then(() => {
									res.status(200).json({
										'status': 200,
										'message': 'Attempt saved'
									});
								})
								.catch((err) => {
									Err.sendError(res,err,'group_controller','createAttempt -- Saving attempt --',false,false,'Roster: ' + item._id + ' User: '+ key_user.name + ' Quest: ' + JSON.stringify(quest));
								});
						})
						.catch((err) => {
							var errString = err.toString();
							var re = new RegExp('VersionError: No matching document found for id');
							var found = errString.match(re);
							if(found) {
								res.status(200).json({
									'status': 200,
									'message': 'Attempt saved',
									'warning': 'VersionError'
								});
							}
							Err.sendError(res,err,'group_controller','createAttempt -- Saving Roster --',false,false,'Roster: ' + item._id + ' User: '+ key_user.name + ' Quest: ' + JSON.stringify(quest));
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
				var index = -1;
				if(item.group.rubric && item.group.rubric.length > 0) { index = item.group.rubric.findIndex(i => i.block + '' === myGrade.block + ''); }
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
						//if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].w) {
						//	myGrade.w = item.group.course.blocks[0].w;
						//}
						if(item.group && item.group.rubric && item.group.rubric.length > 0 && index > -1 && item.group.rubric[index].w) {
							myGrade.w = item.group.rubric[index].w;
						}
						//if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wq) {
						//	myGrade.wq = item.group.course.blocks[0].wq;
						//}
						if(item.group && item.group.rubric && item.group.rubric.length > 0 && index > -1 && item.group.rubric[index].wq) {
							myGrade.wq = item.group.rubric[index].wq;
						}
						//if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wt) {
						//	myGrade.wt = item.group.course.blocks[0].wt;
						//}
						if(item.group && item.group.rubric && item.group.rubric.length > 0 && index > -1 && item.group.rubric[index].wt) {
							myGrade.wt = item.group.rubric[index].wt;
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
					//if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].w) {
					//	myGrade.w = item.group.course.blocks[0].w;
					//}
					if(item.group && item.group.rubric && item.group.rubric.length > 0 && index > -1 && item.group.rubric[index].w) {
						myGrade.w = item.group.rubric[index].w;
					}
					//if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wq) {
					//	myGrade.wq = item.group.course.blocks[0].wq;
					//}
					if(item.group && item.group.rubric && item.group.rubric.length > 0 && index > -1 && item.group.rubric[index].wq) {
						myGrade.wq = item.group.rubric[index].wq;
					}
					//if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].wt) {
					//	myGrade.wt = item.group.course.blocks[0].wt;
					//}
					if(item.group && item.group.rubric && item.group.rubric.length > 0 && index > -1 && item.group.rubric[index].wt) {
						myGrade.wt = item.group.rubric[index].wt;
					}
					if(item.group && item.group.course && item.group.course.blocks && item.group.course.blocks[0] && item.group.course.blocks[0].task && item.group.course.blocks[0].task.justDelivery) {
						task.justDelivery = item.group.course.blocks[0].task.justDelivery;
					}
					myGrade.tasks = task;
					item.grades = [myGrade];
					item.grades.tasktries = [now];
				}
				item.newTask = true;
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
												var send_tasks = [];
												/*
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
												*/
												////////
												myGrade.tasks.forEach(task => {
													var itemTask = block.task.items.find(item => item._id === task.id);
													if(!itemTask) {
														itemTask = block.task.items.find(item => item.label === task.label);
													}
													if(itemTask) {
														var send_task = {
															taskId	: task._id,
															taskText: itemTask.text,
															content	: task.content,
															type 		: task.type,
															label		: task.label,
															grade		: task.grade,
															graded	: task.graded,
															date		: task.date
														};
														send_tasks.push(send_task);
													}
												});
												///////
												// Ordenamos el arreglo
												send_tasks.sort(function(a,b) {
													var labelA = a.label.toUpperCase();
													var labelB = b.label.toUpperCase();
													if(labelA < labelB) {
														return -1;
													}
													if(labelA > labelB) {
														return 1;
													}
													return 0;
												});

												res.status(200).json({
													'status'		: 200,
													'message'		: {
														'studentFullName'		: item.student.person.fullName,
														'studentEmail'			: item.student.person.email,
														'studentName'				: item.student.person.name,
														'studentFathername'	: item.student.person.fatherName,
														'studentMothername'	: item.student.person.motherName,
														'courseid'					: item.group.course._id,
														'course'						: item.group.course.title,
														'courseCode'				: item.group.course.code,
														'groupid'						: item.group._id,
														'group'							: item.group.name,
														'groupCode'					: item.group.code,
														'blockId'						: block._id,
														'blockContent'			: block.content,
														'blockSection'			: block.section,
														'blockNumber'				: block.number,
														'rosterid'					: item._id,
														'taskGrade'					: myGrade.gradeT,
														'tasks'							: send_tasks
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
										'message'	: 'Grade saved',
										'taskid'	: item.grades[myGrade].tasks[myTask]._id
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
						select: 'title section number w wq wt type'
					}
				}
			})
			.then((item) => {
				if(item) {
					var blocks		= [];
					const bs 			= item.group.course.blocks;
					var rubric  	= [];
					if(item.group.rubric) {
						rubric 	= item.group.rubric;
					}
					// ------------

					var grades = item.grades;
					var i=0;
					while(i < bs.length) {
						var j=0;
						var found = false;
						while(!found && j < grades.length) {
							if(rubric.length > 0){
								if(rubric[i].block + '' === grades[j].block + '') {
									grades[j].w 			= rubric[i].w;
									grades[j].wq 			= rubric[i].wq;
									grades[j].wt 			= rubric[i].wt;
									grades[j].repair	= 1;
									found = true;
								}
							} else {
								if(bs[i]._id + '' === grades[j].block + '') {
									grades[j].w 			= bs[i].w;
									grades[j].wq 			= bs[i].wq;
									grades[j].wt 			= bs[i].wt;
									grades[j].repair	= 1;
									found = true;
								}
							}
							j++;
						}
						if(!found) {
							if(rubric.length > 0){
								grades.push({
									block	: rubric[i].block,
									w 		: rubric[i].w,
									wq 		:	rubric[i].wq,
									wt		: rubric[i].wt,
									repair: 1
								});
							} else {
								grades.push({
									block	: bs[i]._id,
									w 		: bs[i].w,
									wq 		: bs[i].wq,
									wt		: bs[i].wt,
									repair: 1
								});
							}
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
												blockW			: grade.w,
												blockType		: bs[i].type,
												blockId			: bs[i]._id
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
								rosterid					: item._id,
								status						: item.status,
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
							if(item.passDate) {
								send_grade.passDateSpa = dateInSpanish(item.passDate);
							}
							if(item.group.course.duration) {
								send_grade.duration 			= item.group.course.duration;
								send_grade.durationUnits	= units(item.group.course.durationUnits,item.group.course.duration);
							}
							if(item.certificateNumber > 0) {
								var certificate = '' + item.certificateNumber;
								send_grade.certificateNumber = certificate.padStart(7, '0');
							}
							if(item.pass && item.certificateNumber === 0) {
								var cert = new Certificate();
								cert.roster = item._id;
								Certificate.findOne({roster:cert.roster})
									.then((certFound) => {
										if(certFound) {
											var certificate = '' + certFound.number;
											send_grade.certificateNumber = certificate.padStart(7, '0');
											res.status(200).json({
												'status': 200,
												'message': send_grade
											});
										} else {
											cert.save()
												.then((cert) => {
													var certificate = '' + cert.number;
													send_grade.certificateNumber = certificate.padStart(7, '0');
													res.status(200).json({
														'status': 200,
														'message': send_grade
													});
												})
												.catch((err) => {
													Err.sendError(res,err,'group_controller','mygrades -- Saving certificate -- Roster: '  + item._id);
												});
										}
									})
									.catch((err) => {
										Err.sendError(res,err,'group_controller','mygrades -- Finding certificate -- Roster: '  + item._id);
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

	getGrade(req,res) {
		const key_user 	= res.locals.user;
		const groupid		= req.query.groupid;
		const blockid		= req.query.blockid;
		Roster.findOne({student: key_user._id, group: groupid})
			.populate([{
				path: 'group',
				select: 'course',
				populate: {
					path: 'course',
					select: 'title blocks',
					populate: {
						path: 'blocks',
						match: { _id: blockid },
						select: 'type questionnarie task w wt wq',
						populate: [
							{
								path: 'task'
							},
							{
								path: 'questionnarie'
							}
						]
					}
				}
			},
			{
				path: 'student',
				select: 'person'
			}])
			.select('grades')
			.lean()
			.then((item) => {
				if(item) {
					if(item.grades && item.grades.length > 0){
						var grade = item.grades.find(grade => grade.block + '' === blockid + '');
						var myGrade = {};
						if(item.group.course.blocks[0].type === 'task') {
							myGrade = {
								student 		: {
									id			:	item.student._id,
									fullName: `${item.student.person.name} ${item.student.person.fatherName} ${item.student.person.motherName}`
								},
								blockid			: item.group.course.blocks[0]._id,
								type 				: item.group.course.blocks[0].type,
								blockTask 	: {
									items: item.group.course.blocks[0].task.items
								},
								w						: grade.w,
								wt					: grade.wt,
								wq					: grade.wq,
								finalGrade	: grade.finalGrade,
								gradedT			: grade.gradedT,
								gradeT			: grade.gradeT,
								track				: grade.track,
								task				: grade.tasks,
								tasktries		: grade.tasktries
							};
						}
						res.status(200).json({
							'status': 200,
							'myGrade': myGrade
						});
					} else {
						res.status(200).json({
							'status': 404,
							'message': 'No grades found'
						});
					}
				} else {
					res.status(200).json({
						'status': 404,
						'message': 'No roster found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','getGrade -- Finding Roster --',false,false,`User: ${key_user.name}, groupid: ${groupid}, blockid: ${blockid}`);
			});
	}, //getGrade

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
					var blocks	= [];
					const bs 		= item.group.course.blocks;
					item.grades.forEach(function(grade) {
						if((grade.wq > 0 || grade.wt > 0 ) && grade.track > 0) {
							var i = 0;
							var block = {};
							while (i < bs.length) {
								if(grade.block + '' === bs[i]._id + '') {
									block = {
										blockid			: bs[i]._id,
										blockTitle	: bs[i].title,
										blockSection: bs[i].section,
										blockNumber	: bs[i].number,
									};
									var index = -1;
									if(item.group.rubric && item.group.rubric.length > 0) { index = item.group.rubric.findIndex(e => e.block + '' === grade.block + ''); }
									if(index > -1 ) {
										block.blockW = item.group.rubric[index].w;
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
						rosterid					: item._id,
						name							: item.student.person.fullName,
						email 						: item.student.person.email,
						course						: item.group.course.title,
						certificateActive : item.group.certificateActive,
						beginDate					: item.group.beginDate,
						endDate						: item.group.endDate,
						finalGrade				: item.finalGrade,
						minGrade					: item.minGrade,
						status						: item.status,
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
				Err.sendError(res,err,'group_controller','studentGrades -- Finding Roster --');
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
					var blocks	= [];
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
										var attempts = [];
										grade.quests.forEach(function(attempt) {
											attempts.push(attempt.attempt);
										});
										block.blockAttempts = attempts;
									}
									if(grade.wt > 0 && grade.tasks.length > 0) {
										var tasks = [];
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
				Err.sendError(res,err,'group_controller','studentHistoric -- Finding Roster --');
			});
	}, // studentHistoric

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
						var send_resources = [];
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
				select: 'course name code admin presentBlockBy beginDate endDate dates lapse lapseBlocks',
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
					// Detener el flujo aquí si el curso está inactivo
					if(!item.group.course) {
						res.status(200).json({
							'status'	: 204,
							'message'	: `Course for group -${item.group.name}- is not available, not visible or not published`
						});
						return;
					}
					//
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

					var grades = [];
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
						//var length 	= grades.length;
						grades.forEach(function(grade) {
							if(grade && grade.block && grade.block._id) {
								if(grade.block._id + '' === lastid + '') {
									//myGrade = grade.block;
									lastIndex 	= i;
									lastSection = grade.block.section;
									nextSection = grade.block.section + 1;
								}
								if(grade.block._id + '' === blockid + '') {
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
								var lastGrade = { block : lastid };
								if(lastid === 'empty') {
									lastGrade.track = 0;
								} else {
									lastGrade.track = 100;
								}
								grades.push(lastGrade);
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
					if(item.sections && item.sections.length > 0 && item.sections[section] && item.sections[section].beginDate) {
						const begDate = new Date(item.sections[section].beginDate);
						const now = new Date();
						const diff = begDate.getTime() - now.getTime();
						if(!item.sections[section].viewed && diff > 0) {
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
									item.sections[nextSection] = {};
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
									item.sections = [];
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
						item.sections = [];
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
										select: 'type begin minimum maxAttempts questions w shuffle show diagnostic'
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
										var send_questions = [];
										questions.forEach(function(q) {
											var send_question = {};
											// Crear una forma de generar el id de la pregunta y guardarla si esta no existe
											if(q._id)					{send_question.id					= q._id;				}
											else
											{
												Err.sendError(res,'question without id','group_controller','nextBlock -- Finding question -- User: ' + key_user.name + ' Userid: ' + key_user._id + ' GroupId: ' + groupid + ' Block: ' + blockid + ' Questionnarie: ' + questionnarie._id);
											}
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
												var options = [];
												q.options.forEach(function(o) {
													options.push({
														name	: o.name,
														value	: o.value,
														eval	: o.eval
													});
												});
												send_question.options = options;
											}
											var answers = [];
											var answer = {};
											if(q.answers && q.answers.length > 0){
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
													answers.push(answer);
												});
												send_question.answers = answers;
											}
											send_questions.push(send_question);
										});
										// si está configurado que se vayan en random, ponlas en random

										var send_questions_shuffle = [];
										if(questionnarie.shuffle && questionnarie.shuffle === true){ send_questions_shuffle = shuffle(send_questions); }
										else
										{ send_questions_shuffle = send_questions; }

										// si está configurado para que muestre solo algunas preguntas, se corta el arreglo
										if(questionnarie.show && questionnarie.show > 0) {

											if(questionnarie.show <= send_questions_shuffle.length){
												send_questions_shuffle = send_questions_shuffle.slice(0,questionnarie.show);
											}
										}
										send_questionnarie = {
											id 						: questionnarie._id,
											type					: questionnarie.type,
											begin					: questionnarie.begin,
											minimum				: questionnarie.minimum,
											maxAttempts		: questionnarie.maxAttempts,
											//attempts			: numAttempts,
											//lastGrade			: lastGrade,
											w							: questionnarie.w,
											questions			: send_questions_shuffle
										};
										if(questionnarie.diagnostic && questionnarie.diagnostic.aspects && questionnarie.diagnostic.aspects.length > 0) {
											send_questionnarie.diagnostic = questionnarie.diagnostic;
										}
										send_block.questionnarie = send_questionnarie;
									}
									if(block.type === 'task' && block.task) {
										var task = block.task;
										var send_items = [];
										task.items.forEach(function(item) {
											var send_item={
												text: item.text,
												type: item.type
											};
											if(item._id)					{send_item.id					= item._id;				}
											else
											{
												Err.sendError(res,'task without id','group_controller','nextBlock -- Finding task -- User: ' + key_user.name + ' Userid: ' + key_user._id + ' GroupId: ' + groupid + ' Block: ' + blockid + ' Questionnarie: ' + task._id);
											}
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
								Err.sendError(res,err,'group_controller','nextBlock -- Finding Block -- User: ' + key_user.name + ' Userid: ' + key_user._id + ' GroupId: ' + groupid + ' Block: ' + blockid);
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
				Err.sendError(res,err,'group_controller','nextBlock -- Finding Roster --',false,false, `User: ${key_user.name} Userid: ${key_user._id} GroupId: ${groupid} BlockId: ${blockid}`);
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
					var usersInGroups = [];
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

	resetAttempt(req,res) {
		const blockid 	= req.query.blockid;
		var query = {group:req.query.groupid};
		if(req.query.userid) {
			query.student = req.query.userid;
		}
		Roster.find(query)
			.then((items) => {
				if(items && items.length > 0) {
					items.forEach(item => {
						var found = false;
						if(item.grades && item.grades.length > 0) {
							item.grades.forEach(grade => {

								if(grade.block + '' === blockid + '') {
									grade.maxGradeQ = 0;
									grade.gradedQ = false;
									grade.finalGrade = false;
									grade.quests = [];
									found = true;
								}
							});
						}
						if(found) {
							item.save()
								.catch((err) => {
									Err.sendError(res,err,'group_controller','resetAttempt -- Saving grades -- groupid: ' + item.group + ' blockid: ' + req.query.blockid + ' student: ' + item.student);
								});
						}
					});
					res.status(200).json({
						'status': 200,
						'message': 'Attempts reset',
						'rosters': items.length
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No rosters found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','resetAttempt -- Finding Rosters -- groupid: ' + req.query.groupid + ' blockid: ' + req.query.blockid );
			});
	}, //resetAttempt

	setGrade(req,res) {
		const blockid 	= req.query.blockid;
		const newGrade	= parseInt(req.query.grade);
		if(newGrade < 1) {
			res.status(406).json({
				'status': 406,
				'message': 'grade must be greater than 0'
			});
			return;
		}
		if(newGrade > 100) {
			res.status(406).json({
				'status': 406,
				'message': 'grade must be less than 100'
			});
			return;
		}
		var query = {group:req.query.groupid};
		if(req.query.userid) {
			query.student = req.query.userid;
		}
		Roster.find(query)
			.then((items) => {
				if(items && items.length > 0) {
					items.forEach(item => {
						var found = false;
						if(item.grades && item.grades.length > 0) {
							item.grades.forEach(grade => {
								if(grade.block + '' === blockid + '') {
									grade.track = 100;
									grade.maxGradeQ = newGrade;
									grade.gradedQ = true;
									grade.finalGrade = newGrade;
									found = true;
								}
							});
						}
						if(found) {
							item.save()
								.catch((err) => {
									Err.sendError(res,err,'group_controller','setGrade -- Saving grades -- groupid: ' + item.group + ' blockid: ' + req.query.blockid + ' student: ' + item.student);
								});
						}
					});
					res.status(200).json({
						'status': 200,
						'message': 'Grades set',
						'rosters': items.length
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No rosters found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','setGrade -- Finding Rosters -- groupid: ' + req.query.groupid + ' blockid: ' + req.query.blockid );
			});
	}, //setGrade

	setRubric(req,res) {
		const rubric = req.body.rubric;
		if(rubric && rubric.length < 0) {
			res.status(406).json({
				'status': 406,
				'message': 'No rubric found. Please provide some rubric'
			});
			return;
		}
		var query = {course: req.body.course};
		if(req.body.group) {
			query = {_id: req.body.group};
		}
		Group.find(query)
			.then((groups) => {
				if(groups && groups.length > 0) {
					groups.forEach(group => {
						if(group.rubric && group.rubric.length > 0) {
							rubric.forEach(r => {
								var found = false;
								group.rubric.forEach(rub => {
									if(rub.block + '' === r.block + '') {
										rub.w 	= r.w;
										rub.wq 	= r.wq;
										rub.wt 	= r.wt;
										found = true;
									}
								});
								if(!found) {
									group.rubric.push({
										w			: r.w,
										wq		:	r.wq,
										wt		: r.wt,
										block	: mongoose.Types.ObjectId(r.block)
									});
								}
							});
						}
						group.save()
							.catch((err) => {
								Err.sendError(res,err,'group_controller','setRubric -- Saving group -- group: ' + group._id);
							});
					});
					res.status(200).json({
						'status': 200,
						'message': 'Rubric set',
						'groups': groups.length
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No groups found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','setGrade -- Finding Rosters -- groupid: ' + req.query.groupid + ' blockid: ' + req.query.blockid );
			});
	}, //setGrade

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
						var send_results = [];
						var i = 0;
						while(i < items.length){
							if(items[i] && items[i].grades && items[i].grades.length > 0) {
								items[i].grades.map(function(x) {
									x.track = track;
								});
							}
							if(items[i] && items[i].sections && items[i].sections.length > 0 ) {
								const sections = items[i].sections;
								var new_sections = [];
								/*
								items[i].sections.map(function(x) {
									if(!x.viewed){
										x.viewed = now;
									}
								});
								*/
								var k = 0;
								var sec = {};
								while (k < sections.length) {

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
					Roster.countDocuments({group: groupid})
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
							var roster = [];
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
	}, // repairGroup

	addCertToRoster(req,res) {
		Certificate.find()
			.then((certs) => {
				if(certs.length) {
					certs.forEach(function(cert) {
						Roster.findById(cert.roster)
							.then((item) => {
								if(item) {
									item.certificateNumber = cert.number;
									item.save()
										.catch((err) => {
											Err.sendError(res,err,'group_controller','addCertToRoster -- Saving Roster -- Roster: ' + cert.roster);
										});
								}
							})
							.catch((err) => {
								Err.sendError(res,err,'group_controller','addCertToRoster -- Finding Roster -- Roster: ' + cert.roster);
							});
					});
					res.status(200).json({
						'status': 200,
						'message': 'Rosters ready'
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No certs found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'group_controller','addCertToRoster -- Finding Certs --');
			});
	}, //addCertToRoster

	repairTasksInRoster(req,res) {
		Roster.find({group:req.query.group})
			.then((rosters) => {
				var counter = 0;
				if(rosters && Array.isArray(rosters) && rosters.length > 0) {
					rosters.forEach(roster => {
						if(roster.grades && Array.isArray(roster.grades) && roster.grades.length > 0) {
							roster.grades.forEach(grade => {
								if(grade.tasks && Array.isArray(grade.tasks) && grade.tasks.length > 0) {
									grade.tasks.forEach(task => {
										task.repair = 'Repaired';
									});
									roster.save().catch((err) => {
										Err.sendError(res,err,'group_controller','repairTasksInRoster -- Saving Roster --');
									});
									counter++;
								}
							});
						}
					});
					res.status(200).json({
						message: `Rosters repaired for group ${req.query.group}. ${counter} tasks repaired`
					});
				} else {
					res.status(404).json({
						message: `Rosters in group ${req.query.group} not found`
					});
				}
			}).catch((err) => {
				Err.sendError(res,err,'group_controller','repairTasksInRoster -- Finding Rosters --');
			});
	} //repairTasksInRoster
};




// Private Functions -----------------------------------------------------------

// expiresIn - función que regresa una fecha de expiración
// date -> fecha
// numDays -> número de días
//
// al final entrega una fecha + el número de días = fecha + dias
function expiresIn(date, numDays) {
	var dateObj = new Date(date);
	return dateObj.setDate(dateObj.getDate() + numDays);
}

// units - Muestra las unidades de tiempo en español
// unit -> la unidad a cambiar, por ejemplo 'h' que sería horas
// cnt	-> el número de las unidades. Aquí solo importa si es 1 unidad o varias para ponerle la 's' (hora/horas)
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

// dateInSpanish - Muestra los meses en español
// date -> fecha a la que se devuelve el mes en español
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

// varenum - Muestra en el query los valores enum que soporta una propiedad del esquema
// field -> campo al que se le quieren mostrar los valores enum
function varenum(field) {
	return Group.schema.path(field).enumValues;
}

// suffle - función que desordena un arreglo y lo presenta en forma aleatoria
// requiere que el arreglo tenga objetos con la propiedad _id definida
// array -> arreglo que se va a desordenar
function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function unique(arrAY) {
	return arrAY.filter((elem, pos, arr) => {
		return arr.indexOf(elem) == pos;
	});
}
