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

	gradesByCampus(req,res) {
		const key_user = res.locals.user;
		if(key_user.orgUnit.type === 'state') {
			OrgUnit.find({parent: key_user.orgUnit.name, org: key_user.org._id})
				.select('_id')
				.then((ous) => {
					Roster.find({ orgUnit: {$in: ous} })
						.populate('student', 'person')
						.populate('group', 'code')
						.populate('orgUnit', 'name longName')
						.sort({orgUnit: 1, group: 1})
						.select('student.person finalGrade track pass')
						.then((rosters)  => {
							var send_rosters 		= new Array();
							var send_group			= new Array();
							var lastGroup				= '';
							var averageTrack		= 0;
							var averageGrade		= 0;
							var studentsPassed 	= 0;
							var at							= 0;
							var ts							= 0;
							var lastOU					= '';
							var lastOUlong			= '';
							rosters.forEach(function(roster) {
								var send_roster = {};
								if(lastOU === '') {
									lastOU 			= roster.orgUnit.name;
									lastOUlong	= roster.orgUnit.longName;
								}
								if(lastGroup === '') {
									lastGroup = roster.group.code;
									send_roster  = {
										//group				: roster.group.code,
										student 		: roster.student.person.name + ' ' + roster.student.person.fatherName + ' ' + roster.student.person.motherName + ' (' + roster.student.person.email + ')',
										finalGrade 	: roster.finalGrade,
										track 			: roster.track,
										pass 				: roster.pass
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
										//group				: roster.group.code,
										student 		: roster.student.person.name + ' ' + roster.student.person.fatherName + ' ' + roster.student.person.motherName + ' (' + roster.student.person.email + ')',
										finalGrade 	: roster.finalGrade,
										track 			: roster.track,
										pass 				: roster.pass
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
									lastGroup = roster.group.code;
									lastOU 			= roster.orgUnit.name;
									lastOUlong	= roster.orgUnit.longName;
									send_roster  = {
										//group				: roster.group.code,
										student 		: roster.student.person.name + ' ' + roster.student.person.fatherName + ' ' + roster.student.person.motherName + ' (' + roster.student.person.email + ')',
										finalGrade 	: roster.finalGrade,
										track 			: roster.track,
										pass 				: roster.pass
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
							});
							if(at > 0) {
								averageTrack = averageTrack / at;
								averageGrade = averageGrade / at;
							}
							send_rosters.push({
								orgUnit					: '(' +lastOU + ') ' + lastOUlong,
								group						: lastGroup,
								totalStudents		: ts,
								studentsOnTrack : at,
								averageTrack		: averageTrack,
								averageGrade		: averageGrade,
								studentsPassed	: studentsPassed,
								efectiveness		: studentsPassed / ts * 100 + '%',
								grades					: send_group
							});
							res.status(200).json({
								'status'	: 200,
								state 		: key_user.orgUnit.name,
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
			Roster.find({ orgUnit: key_user.orgUnit._id })
				.populate('student', 'name person')
				.populate('group', 'code')
				.sort({group: 1})
				.select('student.person finalGrade track pass')
				.then((rosters)  => {
					var send_rosters 		= new Array();
					var send_group			= new Array();
					var lastGroup				= '';
					var averageTrack		= 0;
					var averageGrade		= 0;
					var studentsPassed 	= 0;
					var at							= 0;
					var ts							= 0;
					rosters.forEach(function(roster) {
						var send_roster = {};
						if(lastGroup === '') {
							lastGroup = roster.group.code;
							send_roster  = {
								//group				: roster.group.code,
								student 		: roster.student.person.name + ' ' + roster.student.person.fatherName + ' ' + roster.student.person.motherName + ' (' + roster.student.person.email + ')',
								finalGrade 	: roster.finalGrade,
								track 			: roster.track,
								pass 				: roster.pass
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
								//group				: roster.group.code,
								student 		: roster.student.person.name + ' ' + roster.student.person.fatherName + ' ' + roster.student.person.motherName + ' (' + roster.student.person.email + ')',
								finalGrade 	: roster.finalGrade,
								track 			: roster.track,
								pass 				: roster.pass
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
							lastGroup = roster.group.code;
							send_roster  = {
								//group				: roster.group.code,
								student 		: roster.student.person.name + ' ' + roster.student.person.fatherName + ' ' + roster.student.person.motherName + ' (' + roster.student.person.email + ')',
								finalGrade 	: roster.finalGrade,
								track 			: roster.track,
								pass 				: roster.pass
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
					});
					if(at > 0) {
						averageTrack = averageTrack / at;
						averageGrade = averageGrade / at;
					}
					send_rosters.push({
						group						: lastGroup,
						totalStudents		: ts,
						studentsOnTrack : at,
						averageTrack		: averageTrack,
						averageGrade		: averageGrade,
						studentsPassed	: studentsPassed,
						efectiveness		: studentsPassed / ts * 100 + '%',
						grades					: send_group
					});
					res.status(200).json({
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
