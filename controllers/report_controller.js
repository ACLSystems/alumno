const User = require('../src/users');
const Roster = require('../src/roster');
const OrgUnit = require('../src/orgUnits');
const Err = require('../controllers/err500_controller');

module.exports = {

	totalUsers(req,res) {
		const key_user = res.locals.user;
		User.count({org: key_user.org})
			.then((count) => {
				res.status(200).json({
					'status'		: 200,
					'reportName': 'Total Org Users',
					'org'				: key_user.org.name,
					'totalUsers': count
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','totals -- Counting Users --');
			});

	}, //totalUsers

	usersByOrgUnit(req,res) {
		const key_user = res.locals.user;
		User.aggregate()
			.match({ org: key_user.org._id })
			.group({ _id: '$orgUnit', count:{$sum:1}})
			//.project({_id:0, 'orgUnit.name':1})
			.then((results) => {
				var ous = new Array();
				var total = 0;
				results.forEach(function(ou) {
					ous.push(ou._id);
					total += ou.count;
				});
				var send_results = new Array();
				OrgUnit.find({ _id: {$in: ous}})
					.where('type').equals('campus')
					.then((ous) => {
						results.forEach(function(rou) {
							var i = 0;
							var keep = true;
							while(i < ous.length && keep) {
								if(rou._id+'' === ous[i]._id+'') {
									send_results.push({
										name			: ous[i].name,
										longName	: ous[i].longName,
										parent		: ous[i].parent,
										count			: rou.count
									});
									keep = false;
								}
								i++;
							}
						});
						res.status(200).json({
							'status'		: 200,
							'reportName': 'Users by OrgUnit',
							'org'				: key_user.org.name,
							'total'			: total,
							'data'			: send_results
						});
					})
					.catch((err) => {
						Err.sendError(res,err,'report_controller','byOrgUnit -- Finding OUs --');
					});
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','byOrgUnit -- Counting Users --');
			});
	}, //byOrgUnit

	percentil(req,res) {
		const key_user  = res.locals.user;
		var 	ou				= '';
		if(key_user.roles.isAdmin && req.query.ou) {
			ou = req.query.ou;
		} else {
			ou = key_user.ou.name;
		}
		Roster.aggregate()
			.match({orgUnit:ou,track: {$gt: 0}})
			.group({ _id: '$orgUnit', count:{$sum:1}})
			.then((results) => {
				res.status(200).json({
					'status': 200,
					'results': results
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','byOrgUnit -- Counting Users --');
			});
	}, //percentil

	gradesByCampus(req,res) {
		const key_user 	= res.locals.user;
		if(key_user.orgUnit.type === 'state') {
			OrgUnit.find({parent: key_user.orgUnit.name, org: key_user.org._id})
				.select('_id')
				.then((ous) => {
					Roster.find({ orgUnit: {$in: ous}, isActive: true })
						.populate('student', 'name person')
						.populate({
							path: 'group',
							select: 'code course',
							match: { isActive: true },
							populate: {
								path: 'course',
								select: 'code title duration durationUnits'
							}
						})
						.populate('orgUnit', 'name longName')
						.sort({orgUnit: 1, group: 1})
						.select('student finalGrade track pass passDate')
						.then((rosters)  => {
							var send_rosters 		= new Array();
							var send_group			= new Array();
							var lastGroup				= '';
							var lastCourse			= '';
							var duration				= '';
							var durationUnits		= '';
							var averageTrack		= 0;
							var averageGrade		= 0;
							var studentsPassed 	= 0;
							var at							= 0;
							var ts							= 0;
							var lastOU					= '';
							var lastOUlong			= '';
							var start						= new Date().getTime();
							var end 						= new Date().getTime();
							var timelimit				= 60000;
							res.writeHead(200, {
								'Content-Type': 'application/json'
							});
							rosters.forEach(function(roster) {
								var send_roster = {};
								if(lastOU === '') {
									lastOU 			= roster.orgUnit.name;
									lastOUlong	= roster.orgUnit.longName;

								}
								if(lastGroup === '') {
									lastGroup 		= roster.group.code;
									lastCourse 		= roster.group.course.title;
									duration			= roster.group.course.duration;
									durationUnits = units(roster.group.course.durationUnits,duration);
									send_roster  	= {
										studentName : roster.student.person.fullName,
										username		: roster.student.name,
										finalGrade 	: roster.finalGrade,
										track 			: roster.track,
										pass 				: roster.pass,
										passDate		: roster.passDate
									};
									if(roster.track > 0) {
										averageTrack = averageTrack + roster.track;
										averageGrade = averageGrade + roster.finalGrade;
										at++;
									}
									if(roster.pass) {
										studentsPassed++;
									}
									ts++;
								} else if (lastGroup === roster.group.code) {
									send_roster  = {
										studentName : roster.student.person.fullName,
										username		: roster.student.name,
										finalGrade 	: roster.finalGrade,
										track 			: roster.track,
										pass 				: roster.pass,
										passDate		: roster.passDate
									};
									if(roster.track > 0) {
										averageTrack = averageTrack + roster.track;
										averageGrade = averageGrade + roster.finalGrade;
										at++;
									}
									if(roster.pass) {
										studentsPassed++;
									}
									ts++;
								} else {
									if(at > 0) {
										averageTrack = averageTrack / at;
										averageGrade = averageGrade / at;
									}
									send_rosters.push({
										orgUnit					: '(' +lastOU + ') ' + lastOUlong,
										group						: lastGroup,
										course					: lastCourse,
										duration				: duration,
										durationUnits		: durationUnits,
										totalStudents		: ts,
										studentsOnTrack : at,
										averageTrack		: averageTrack,
										averageGrade		: averageGrade,
										studentsPassed	: studentsPassed,
										efectiveness		: studentsPassed / ts * 100 + '%',
										grades					: send_group
									});
									at = 0;
									ts = 0;
									studentsPassed = 0;
									send_group 		= new Array();
									lastGroup 		= roster.group.code;
									lastCourse 		= roster.group.course.title;
									duration			= roster.group.course.duration;
									durationUnits = units(roster.group.course.durationUnits,duration);
									lastOU 				= roster.orgUnit.name;
									lastOUlong		= roster.orgUnit.longName;
									send_roster  	= {
										studentName : roster.student.person.fullName,
										username		: roster.student.name,
										finalGrade 	: roster.finalGrade,
										track 			: roster.track,
										pass 				: roster.pass,
										passDate		: roster.passDate
									};
									if(roster.track > 0) {
										averageTrack = averageTrack + roster.track;
										averageGrade = averageGrade + roster.finalGrade;
										at++;
									}
									if(roster.pass) {
										studentsPassed++;
									}
									ts++;
								}
								send_group.push(send_roster);
								end = new Date().getTime();
								if(end - start > timelimit) {
									start = new Date().getTime();
									res.write('tic ');
								}
							}); // forEach
							if(at > 0) {
								averageTrack = averageTrack / at;
								averageGrade = averageGrade / at;
							}
							send_rosters.push({
								orgUnit					: '(' +lastOU + ') ' + lastOUlong,
								group						: lastGroup,
								course					: lastCourse,
								duration				: duration,
								durationUnits		: durationUnits,
								totalStudents		: ts,
								studentsOnTrack : at,
								averageTrack		: averageTrack,
								averageGrade		: averageGrade,
								studentsPassed	: studentsPassed,
								efectiveness		: studentsPassed / ts * 100 + '%',
								grades					: send_group
							});
							//res.status(200).json({
							res.end({
								'status'	: 200,
								state 		: key_user.orgUnit.name,
								username	: key_user.name,
								'message'	: send_rosters
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'report_controller','gradesByCampus -- Finding Roster --');
						});
				})
				.catch((err) => {
					Err.sendError(res,err,'report_controller','gradesByCampus -- Finding Roster by State --');
				});
		}
		if(key_user.orgUnit.type === 'campus') {
			Roster.find({ orgUnit: key_user.orgUnit._id, isActive: true })
				.populate('student', 'name person')
				.populate({
					path: 'group',
					select: 'code course',
					match: { isActive: true },
					populate: {
						path: 'course',
						select: 'code title duration durationUnits'
					}
				})
				.sort({group: 1})
				.select('student finalGrade track pass passDate')
				.then((rosters)  => {
					var send_rosters 		= new Array();
					var send_group			= new Array();
					var lastGroup				= '';
					var lastCourse			= '';
					var duration				= '';
					var durationUnits		= '';
					var averageTrack		= 0;
					var averageGrade		= 0;
					var studentsPassed 	= 0;
					var at							= 0;
					var ts							= 0;
					var start						= new Date().getTime();
					var end 						= new Date().getTime();
					var timelimit				= 60000;
					res.writeHead(200, {
						'Content-Type': 'application/json'
					});
					rosters.forEach(function(roster) {
						var send_roster = {};
						if(lastGroup === '') {
							lastGroup 		= roster.group.code;
							lastCourse 		= roster.group.course.title;
							duration			= roster.group.course.duration;
							durationUnits = units(roster.group.course.durationUnits,duration);
							send_roster  	= {
								studentName : roster.student.person.fullName,
								username		: roster.student.name,
								finalGrade 	: roster.finalGrade,
								track 			: roster.track,
								pass 				: roster.pass,
								passDate		: roster.passDate
							};
							if(roster.track > 0) {
								averageTrack = averageTrack + roster.track;
								averageGrade = averageGrade + roster.finalGrade;
								at++;
							}
							if(roster.pass) {
								studentsPassed++;
							}
							ts++;
						} else if (lastGroup === roster.group.code) {
							send_roster  = {
								studentName : roster.student.person.fullName,
								username		: roster.student.name,
								finalGrade 	: roster.finalGrade,
								track 			: roster.track,
								pass 				: roster.pass,
								passDate		: roster.passDate
							};
							if(roster.track > 0) {
								averageTrack = averageTrack + roster.track;
								averageGrade = averageGrade + roster.finalGrade;
								at++;
							}
							if(roster.pass) {
								studentsPassed++;
							}
							ts++;
						} else {
							if(at > 0) {
								averageTrack = averageTrack / at;
								averageGrade = averageGrade / at;
							}
							send_rosters.push({
								group						: lastGroup,
								course					: lastCourse,
								duration				: duration,
								durationUnits		: durationUnits,
								totalStudents		: ts,
								studentsOnTrack : at,
								averageTrack		: averageTrack,
								averageGrade		: averageGrade,
								studentsPassed	: studentsPassed,
								efectiveness		: studentsPassed / ts * 100 + '%',
								grades					: send_group
							});
							at = 0;
							ts = 0;
							studentsPassed = 0;
							send_group 		= new Array();
							lastGroup 	= roster.group.code;
							lastCourse 	= roster.group.course.title;
							duration		= roster.group.course.duration;
							durationUnits = units(roster.group.course.durationUnits,duration);
							send_roster  = {
								studentName : roster.student.person.fullName,
								username		: roster.student.name,
								finalGrade 	: roster.finalGrade,
								track 			: roster.track,
								pass 				: roster.pass,
								passDate		: roster.passDate
							};
							if(roster.track > 0) {
								averageTrack = averageTrack + roster.track;
								averageGrade = averageGrade + roster.finalGrade;
								at++;
							}
							if(roster.pass) {
								studentsPassed++;
							}
							ts++;
						}
						send_group.push(send_roster);
						end = new Date().getTime();
						if(end - start > timelimit) {
							start = new Date().getTime();
							res.write('tic ');
						}
					}); // forEach
					if(at > 0) {
						averageTrack = averageTrack / at;
						averageGrade = averageGrade / at;
					}
					send_rosters.push({
						group						: lastGroup,
						course					: lastCourse,
						duration				: duration,
						durationUnits		: durationUnits,
						totalStudents		: ts,
						studentsOnTrack : at,
						averageTrack		: averageTrack,
						averageGrade		: averageGrade,
						studentsPassed	: studentsPassed,
						efectiveness		: studentsPassed / ts * 100 + '%',
						grades					: send_group
					});
					//res.status(200).json({
					res.end({
						'status': 200,
						'campus': key_user.orgUnit.longName + ' (' + key_user.orgUnit.name + '), -' + key_user.orgUnit.parent + '-',
						'message': send_rosters
					});
				})
				.catch((err) => {
					Err.sendError(res,err,'report_controller','gradesByCampus -- Finding Roster --');
				});
		}
	}
};

// PRIVATE Functions

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
	} else if(unit === 'd') {
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
