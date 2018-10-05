const mongoose 	= require('mongoose');
const User 			= require('../src/users');
const Roster 		= require('../src/roster');
const File 			= require('../src/files');
const OrgUnit 	= require('../src/orgUnits');
const Group 		= require('../src/groups');
const Err 			= require('../controllers/err500_controller');

module.exports = {

	totalUsers(req,res) {
		const key_user = res.locals.user;
		User.countDocuments({org: key_user.org})
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

	rosterSummary(req,res){
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
			.match({orgUnit: mongoose.Types.ObjectId(ou),report: {$ne:false}})
			.unwind('grades')
			.match(
				{$or:[
					{'grades.wq':{$gt:0},'grades.maxGradeQ':{$gt:0}},
					{'grades.wt':{$gt:0},'grades.gradeT':{$gt:0}}
				]
				})
			.lookup({
				from: 'blocks',
				localField: 'grades.block',
				foreignField: '_id',
				as: 'myBlocks'})
			.project({
				grades	:	1,
				title 	: '$myBlocks.title'
			})
			.unwind('title')
			.group({
				_id: '$title',
				total: {$sum:1}
			})
			.project({
				_id		: 0,
				title	: '$_id',
				total	: 1
			})
			.then((evals) => {
				res.status(200).json({
					'status': 200,
					'message': evals
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','rosterSummary -- Aggregate --');
			});
	}, //rosterSummary

	orgTree(req,res) {
		const key_user  = res.locals.user;
		var query 	= {};
		var type 	= 'campus';
		if(key_user.orgUnit.type === 'org' || key_user.orgUnit.type === 'country') {
			query = {org: key_user.org._id};
			type 		= 'org';
		} else if(key_user.orgUnit.type === 'state') {
			query = {$or:[{parent: key_user.orgUnit.name},{name: key_user.orgUnit.name}]};
			type 		= 'state';
		}
		if(type === 'org' || type === 'state') {
			OrgUnit.find(query)
				.select('name parent type longName')
				.lean()
				.then((resOUs) => {
					if(resOUs && resOUs.length > 0){
						var ouIds = new Array();
						resOUs.forEach(ou => {ouIds.push(mongoose.Types.ObjectId(ou._id));});
						Group.aggregate()
							.match({orgUnit:{$in:ouIds}})
							.project({
								code		: 1,
								name		: 1,
								course	: 1,
								orgUnit	: 1
							})
							.lookup({
								from				: 'courses',
								localField	: 'course',
								foreignField: '_id',
								as					: 'course'
							})
							.project({
								groupCode		: '$code',
								groupName		: '$name',
								orgUnit			: 1,
								courseTitle	: '$course.title'
							})
							.unwind('courseTitle')
							.group({
								_id: '$orgUnit',
								groups: {
									$push: {
										groupCode		: '$groupCode',
										groupName		: '$groupName',
										courseTitle	: '$courseTitle'
									}
								}
							})
							.project({
								ou					: '$_id',
								groups	 		: '$groups'
							})
							.lookup({
								from				: 'orgunits',
								localField	: '_id',
								foreignField: '_id',
								as					: 'ou'
							})
							.unwind('ou')
							.project({
								ouName			: '$ou.name',
								ouLongName	: '$ou.longName',
								ouId				: '$ou._id',
								ouType			: '$ou.type',
								ouParent		: '$ou.parent',
								groups	 		: '$groups',
								_id					: false
							})
							.group({
								_id: {
									ouName: '$ouParent',
								},
								ous: {
									$push: {
										ouName			: '$ouName',
										ouLongName	: '$ouLongName',
										ouId				: '$ouId',
										ouType			: '$ouType',
										ouParent		: '$ouParent',
										groups	 		: '$groups'
									}
								}
							})
							.project({
								ouName		: '$_id.ouName',
								ous				: '$ous',
								_id				: false
							})
							.then((resultGrps) => {
								var allGroups = new Array();
								if(resultGrps && resultGrps.length > 0) {
									var firstLiners = resultGrps.map(a => a.ouName);
									if(firstLiners && firstLiners.length > 0) {
										var i=0;
										firstLiners.forEach(fl => {
											var j=0;
											resultGrps.forEach(gps => {
												if(gps.ous && gps.ous.length > 0) {
													var k=0;
													gps.ous.forEach(ou => {
														if(fl === ou.ouName) {
															if(ou.ouType === 'org') {
																resultGrps[i].ouType 			= ou.ouType;
																resultGrps[i].ouId	 			= ou.ouId;
																resultGrps[i].ouLongName 	= ou.ouLongName;
																resultGrps[i].groups 			= ou.groups;
																resultGrps[i].ous.splice(k,1);
															} else {
																resultGrps[j].ous[k].ous 	= resultGrps[i].ous;
																resultGrps.splice(i,1);
															}
														}
														k++;
													});
												}
												j++;
											});
											i++;
										});
									}
								}
								if(type === 'org') {
									resultGrps.forEach(rg => {
										if(rg.groups && rg.groups.length > 0) {
											rg.groups.forEach(g => {
												allGroups.push(g.groupCode);
											});
										}
										if(rg.ous && rg.ous.length > 0){
											rg.ous.forEach(ou => {
												if(ou.groups && ou.groups.length > 0) {
													ou.groups.forEach(g => {
														allGroups.push(g.groupCode);
													});
												}
												if(ou.ous && ou.ous.length > 0) {
													ou.ous.forEach(gou => {
														if(gou.groups && gou.groups.length > 0) {
															gou.groups.forEach(goug => {
																allGroups.push(goug.groupCode);
															});
														}
													});
												}
											});
										}
									});
								} else
								if(type === 'state') {
									resultGrps = resultGrps[0].ous;
									resultGrps.forEach(ou => {
										if(ou.groups && ou.groups.length > 0) {
											ou.groups.forEach(g => {
												allGroups.push(g.groupCode);
											});
										}
										if(ou.ous && ou.ous.length > 0) {
											ou.ous.forEach(gou => {
												if(gou.groups && gou.groups.length > 0) {
													gou.groups.forEach(goug => {
														allGroups.push(goug.groupCode);
													});
												}
											});
										}
									});
								}
								res.status(200).json({
									'status'		: 200,
									'groups' 		: resultGrps,
									'allGroups'	: allGroups
								});
							})
							.catch((err) => {
								Err.sendError(res,err,'report_controller','orgTree -- Aggregate Groups --',false,false,'User: ' + key_user.name);
							});
					} else {
						res.status(200).json({
							'status': 200,
							'message' : 'No OUs found'
						});
					}
				})
				.catch((err) => {
					Err.sendError(res,err,'report_controller','orgTree -- Finding OUs --',false,false,'User: ' + key_user.name);
				});
		} else {
			Group.aggregate()
				.match({orgUnit:mongoose.Types.ObjectId(key_user.orgUnit._id)})
				.project({
					code		: 1,
					name		: 1,
					course	: 1,
					orgUnit	: 1
				})
				.lookup({
					from				: 'courses',
					localField	: 'course',
					foreignField: '_id',
					as					: 'course'
				})
				.project({
					groupCode		: '$code',
					groupName		: '$name',
					orgUnit			: 1,
					courseTitle	: '$course.title'
				})
				.unwind('courseTitle')
				.group({
					_id: '$orgUnit',
					groups: {
						$push: {
							groupCode		: '$groupCode',
							groupName		: '$groupName',
							courseTitle	: '$courseTitle'
						}
					}
				})
				.project({
					ou					: '$_id',
					groups	 		: '$groups'
				})
				.lookup({
					from				: 'orgunits',
					localField	: '_id',
					foreignField: '_id',
					as					: 'ou'
				})
				.unwind('ou')
				.project({
					ouName			: '$ou.name',
					ouLongName	: '$ou.longName',
					ouId				: '$ou._id',
					ouType			: '$ou.type',
					ouParent		: '$ou.parent',
					groups	 		: '$groups',
					_id					: false
				})
				.then((resultGrps) => {
					var allGroups = new Array();
					var campus = {};
					if(resultGrps && resultGrps.length > 0) {
						if(resultGrps.length === 1) {
							campus = resultGrps[0];
							if(campus.groups && campus.groups.length > 0) {
								campus.groups.forEach(g => {
									allGroups.push(g.groupCode);
								});
							}
						}
					}
					res.status(200).json({
						'status'		: 200,
						'groups' 		: resultGrps,
						'allGroups'	: allGroups
					});
				})
				.catch((err) => {
					Err.sendError(res,err,'report_controller','orgTree -- Aggregate Groups --',false,false,'User: ' + key_user.name);
				});
		}
	}, // orgTree

	percentil(req,res) {
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

		Roster.aggregate() // Buscar Track
			.match({orgUnit: mongoose.Types.ObjectId(ou),report: {$ne:false},track:{$gt:0}})
			.group({ _id: '$group', usersOnTrack:{$sum:1}})
			.then((resultsT) => {
				// Resultados de Track
				var group_ids = new Array();
				var results 	= resultsT;
				results.forEach(function(res) {
					group_ids.push(res._id);
				});
				Roster.aggregate() // Buscar Track
					.match({orgUnit: mongoose.Types.ObjectId(ou),report: {$ne:false},pass:true})
					.group({ _id: '$group', usersPassed:{$sum:1}})
					.then((resultsP) => {
						if(resultsP.length > 0){
							resultsP.forEach(function(res) {
								var i = 0;
								var found = false;
								while(!found && i < results.length) {
									if(results[i]){
										if(res._id + '' === results[i]._id +'')  {
											found=true;
											results[i].usersPassed = res.usersPassed;
										}
									}
									i++;
								}
								if(!found) {
									group_ids.push(res._id);
									results.push(res);
								}
							});
						}
						Roster.aggregate()
							.match({orgUnit: mongoose.Types.ObjectId(ou),report: {$ne:false}})
							.group({ _id: '$group', totalUsers:{$sum:1}})
							.then((resultsR) => {
								if(resultsR.length > 0){
									resultsR.forEach(function(res) {
										var i = 0;
										var found = false;
										while(!found && i < results.length) {
											if(results[i]){
												if(res._id + '' === results[i]._id +'')  {
													found=true;
													results[i].totalUsers = res.totalUsers;
												}
											}
											i++;
										}
										if(!found) {
											group_ids.push(res._id);
											results.push(res);
										}
									});
								}
								if(results.length === 0) {
									res.status(200).json({
										'status': 200,
										'totalUsers'	: 0,
										'usersOnTrack': 0,
										'usersPassed'	: 0,
										'results'			: 'No results'
									});
									return;
								}

								Group.find({_id: {$in: group_ids}})
									.select('name orgUnit')
									.populate('orgUnit', 'name longName')
									.then((groups) => {
										if(groups.length > 0 ) {
											groups.forEach(function(group) {
												var i = 0;
												var found = false;
												while(!found && i < results.length) {
													if(results[i]._id + '' === group._id +'') {
														found = true;
														results[i].group  = group.name;
													}
													i++;
												}
											});
											var totalTracks = 0;
											var totalPassed = 0;
											var totalUsers 	= 0;
											results.forEach(function(res) {
												if(res.usersOnTrack	)	{totalTracks += res.usersOnTrack; }
												if(res.usersPassed	)	{totalPassed += res.usersPassed;  }
												if(res.totalUsers		)	{totalUsers  += res.totalUsers;   }
											});

											res.status(200).json({
												'status'			: 200,
												'orgUnit'			: groups[0].orgUnit.name,
												'orgUnitName' : groups[0].orgUnit.longName,
												'totalUsers'	: totalUsers,
												'usersOnTrack': totalTracks,
												'usersPassed'	: totalPassed,
												'results'			: results
											});
											// esto es del total

										// del total
										} else {
											res.status(200).json({
												'status': 200,
												'results': 'No groups found'
											});
										}
									})
									.catch((err) => {
										Err.sendError(res,err,'report_controller','percentil -- Searching group names --');
									});
							})
							.catch((err) => {
								Err.sendError(res,err,'report_controller','percentil -- Searching totalUsers --');
							});
					})
					.catch((err) => {
						Err.sendError(res,err,'report_controller','percentil -- Counting Passed --');
					});
				// Resultados de track

			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','percentil -- Counting track --');
			});
	}, //percentil

	gradesByGroup(req,res) {
		//const key_user  = res.locals.user;
		var 	groupid				= '';
		if(req.query.groupid) {
			groupid = req.query.groupid;
		}
		Group.findById(groupid)
			.populate('course', 'title duration durationUnits')
			.then((group) => {
				if(group) {
					Roster.aggregate()
						.match({group: mongoose.Types.ObjectId(groupid),report: {$ne:false}})
						.project('student grades finalGrade track pass passDate -_id certificateNumber')
						.lookup({
							from				: 'users',
							localField	: 'student',
							foreignField: '_id',
							as					: 'myUser'
						})
						.project({
							grades			:	1,
							finalGrade	:	1,
							track				:	1,
							pass				:	1,
							passDate		:	1,
							certificateNumber : '' + '$certificateNumber',
							name				:	'$myUser.person.name',
							fatherName	:	'$myUser.person.fatherName',
							motherName	: '$myUser.person.motherName',
							email				: '$myUser.person.email',
							rfc					: '$myUser.fiscal.id'
						})
						.unwind('name')
						.unwind('fatherName')
						.unwind('motherName')
						.unwind('email')
						.unwind('rfc')
						.unwind('grades')
						.match({$or: [{'grades.wq': {$gt:0}},{'grades.wt': {$gt:0}}]})
						.lookup({
							from				: 'blocks',
							localField	: 'grades.block',
							foreignField: '_id',
							as					: 'myBlocks'
						})
						.project({
							finalGrade	:	1,
							track				:	1,
							pass				:	1,
							passDate		:	1,
							certificateNumber: 1,
							name				:	1,
							fatherName	:	1,
							motherName	:	1,
							email				:	1,
							rfc 				: 1,
							blockTitle	:	'$myBlocks.title',
							blockGrade	:	'$grades.finalGrade',
							blockPond		:	'$grades.w'
						})
						.unwind('blockTitle')
						.group({
							_id: {
								rfc					: '$rfc',
								name				: '$name',
								fatherName	: '$fatherName',
								motherName	: '$motherName',
								email				: '$email',
								track				: '$track',
								finalGrade	: '$finalGrade',
								pass				: '$pass',
								passDate		: '$passDate',
								certificateNumber: '$certificateNumber'
							},
							grades: {
								$push: {
									blockTitle	: '$blockTitle',
									blockGrade	: '$blockGrade',
									blockPond		: '$blockPond'
								}
							}
						})
						.project({
							rfc 				: '$_id.rfc',
							name				: '$_id.name',
							fatherName	: '$_id.fatherName',
							motherName	: '$_id.motherName',
							email				: '$_id.email',
							track				: '$_id.track',
							finalGrade	: '$_id.finalGrade',
							pass				: '$_id.pass',
							passDate		: '$_id.passDate',
							certificateNumber	: '$_id.certificateNumber'.padStart(7,'0'),
							grades			: true,
							_id 				: false
						})
						.then((items) => {
							res.status(200).json({
								'status'				: 200,
								'group'					: group.name,
								'course'				: group.course.title,
								'courseDuration': group.course.duration,
								'courseDurUnits': units(group.course.durationUnits),
								'beginDate'			: group.beginDate,
								'endDate'				: group.endDate,
								'beginDateSpa'	: dateInSpanish(group.beginDate),
								'endDateSpa'		: dateInSpanish(group.endDate),
								'roster'				: items
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'report_controller','gradesByGroup -- Finding roster items --');
						});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'Group not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','gradesByGroup -- Finding group --');
			});
	}, // gradesByGroup

	filesBygroup(req,res) {
		const groupid = req.query.groupid;
		Group.findById(groupid)
			.populate('course', 'title duration durationUnits')
			.then((group) => {
				if(group) {
					Roster.aggregate()
						.match({group: mongoose.Types.ObjectId(groupid),report: {$ne:false}})
						.project({
							grades:true,
							student:true
						})
						.unwind('grades')
						.match({
							'grades.w'	: 10,
							'grades.wt'	: 1
						})
						.project({
							student	:true,
							task		: '$grades.tasks'
						})
						.unwind('task')
						.project({
							student	:true,
							file		: '$task.content'
						})
						.lookup({
							from				: 'users',
							localField	: 'student',
							foreignField: '_id',
							as					: 'user'
						})
						.unwind('user')
						.project({
							name 				: '$user.person.name',
							fatherName 	: '$user.person.fatherName',
							motherName	: '$user.person.motherName',
							email				: '$user.person.email',
							RFC					: '$user.fiscal.id',
							file				: true
						})
						.then((items) => {
							if(items.length > 0 ) {
								var files = new Array();
								items.forEach(function(item) {
									if(item.file) {
										files.push(item.file);
									}
								});
								File.find({_id:{$in:files}})
									.then((filesFound) => {
										if(filesFound.length > 0) {
											var results = new Array();
											var i = 0;
											while(i < filesFound.length) {
												var found = false;
												var j = 0;
												while(!found && j < items.length) {
													if(filesFound[i]._id + '' === items[j].file + '') {
														found = true;
														results.push({
															name				: items[j].name,
															fatherName	: items[j].fatherName,
															motherName	: items[j].motherName,
															RFC					: items[j].RFC,
															email				: items[j].email,
															fileName		: filesFound[i].name,
															fileId			: filesFound[i].filename,
															filePath		: filesFound[i].path,
															fileSize		: filesFound[i].size
														});
													}
													j++;
												}
												i++;
											}
											res.status(200).json({
												'status'		: 200,
												'groupCode'	: group.code,
												'groupName'	: group.name,
												'count'			: results.length,
												'message'		: results
											});
										} else {
											res.status(200).json({
												'status': 200,
												'message': 'No files found'
											});
										}
									})
									.catch((err) => {
										Err.sendError(res,err,'report_controller','filesBygroup -- Finding rosters --');
									});
							} else {
								res.status(200).json({
									'status': 200,
									'message': 'No items found'
								});
							}

						})
						.catch((err) => {
							Err.sendError(res,err,'report_controller','filesBygroup -- Finding rosters --');
						});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No group found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','filesBygroup -- Finding group --');
			});
	}, // filesBygroup

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
							res.status(200).json({
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
			Roster.find({ orgUnit: key_user.orgUnit._id, report: true })
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
