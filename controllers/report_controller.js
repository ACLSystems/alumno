const mongoose 	= require('mongoose'												);
const User 			= require('../src/users'										);
const Roster 		= require('../src/roster'										);
const File 			= require('../src/files'										);
const OrgUnit 	= require('../src/orgUnits'									);
const Group 		= require('../src/groups'										);
//const Course 		= require('../src/courses'									);
const Err 			= require('../controllers/err500_controller');
const Session		= require('../src/sessions'									);
const Query 		= require('../src/queries'									);
const TA 				= require('time-ago'												);
const StatusCodes = require('http-status-codes'							);

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
				var ous = [];
				var total = 0;
				results.forEach(function(ou) {
					ous.push(ou._id);
					total += ou.count;
				});
				var send_results = [];
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
		//var type 	= 'campus';
		var level = 3;
		if(key_user.orgUnit.level === 1) {
			query = {org: key_user.org._id};
			//type 		= 'org';
			level		= 1;
		} else if(key_user.orgUnit.level === 2) {
			query = {$or:[{parent: key_user.orgUnit.name},{name: key_user.orgUnit.name}]};
			//type 		= 'state';
			level		= 2;
		}
		if(req.query.project) {
			query.project = req.query.project;
		}
		Query.deleteMany({user:key_user._id})
			.then(() => {
				if(level < 3) { // Si es un nivel 1 o 2
				//if(type === 'org' || type === 'state') {
					OrgUnit.find(query)
						.select('name parent type level longName displayEvals')
						.lean()
						.then((resOUs) => {
							if(resOUs && resOUs.length > 0){
								var ouIds = [];
								resOUs.forEach(ou => {ouIds.push(mongoose.Types.ObjectId(ou._id));});
								Group.find({orgUnit: {$in: resOUs},report: {$ne:false}})
									.select('name code orgUnit course')
									.populate('orgUnit', 'name parent longName type level')
									.populate('course', 'title')
									.lean()
									.then((grps) => {
										if(grps && grps.length > 0) {
											// parents necesita ser un arreglo con valores únicos
											// por lo que vamos a conseguirlo usando un SET y luego
											// convirtiendolo en un arreglo
											let parents = [...new Set(grps.map(a => a.orgUnit.parent))];
											let uniqueOUs = [...new Set(grps.map(a => a.orgUnit.name))];
											var fullList = [...new Set(parents.concat(uniqueOUs))];
											OrgUnit.aggregate()
												.match({name: {$in:fullList}})
												.project('name type parent longName level')
												.group({
													_id: '$parent',
													ous: {
														$push: {
															ouId				: '$_id',
															ouName			: '$name',
															ouLongName	: '$longName',
															ouType			: '$type',
															ouLevel			: '$level',
															ouParent		: '$parent',
															groups			: [],
															query				: [],
															ous					: []
														}
													}
												})
												.project({
													ouName		: '$_id',
													ous				: '$ous',
													//ouType		: type,
													ouLevel		: level,
													_id				: false
												})
												.then((orgOus) => {
													// Acomodamos el arbol
													var cut = [];
													var i=0;
													if(orgOus && orgOus.length > 0) {
														var firstLiners = orgOus.map(a => a.ouName);
														if(firstLiners  && firstLiners.length > 0) {
															i=0;
															firstLiners.forEach(fl => {
																var j=0;
																orgOus.forEach(gps => {
																	if(gps.ous && gps.ous.length > 0) {
																		var k=0;
																		gps.ous.forEach(ou => {
																			if(fl === ou.ouName) {
																				if(ou.ouLevel === 1) {
																					//if(ou.ouType === 'org') {
																					orgOus[i].ouLevel 		= ou.ouLevel;
																					orgOus[i].ouType 			= ou.ouType;
																					orgOus[i].ouId	 			= ou.ouId;
																					orgOus[i].ouLongName 	= ou.ouLongName;
																					orgOus[i].groups 			= ou.groups;
																					orgOus[i].ous.splice(k,1);
																				} else {
																					orgOus[j].ous[k].ous 	= [...orgOus[i].ous];
																					cut.push(fl);
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
													// Cortamos lo que sobra del arbol
													for (i = 0; i < orgOus.length; i++){
														cut.forEach((cutty) => {
															if(orgOus[i].ouName===cutty){orgOus.splice(i,1);}
														});
													}
													// Ahora metemos los grupos dentro del árbol
													orgOus.forEach(n1 => {
														var g1 = [];
														// Primero vemos si hay grupos para el primer nivel
														i=0;
														grps.forEach(g => {
															if(g.orgUnit.name === n1.ouName) {
																if(!n1.groups) {
																	n1.groups = [];
																}
																n1.groups.push({
																	groupId 		: g._id,
																	groupName		: g.name,
																	groupCode		: g.code,
																	courseTitle	: g.course.title
																});
															}
														});
														// listo... ahora nos vamos al segundo nivel
														n1.ous.forEach(n2 => {
															var g2 = [];
															// Vemos si hay grupos para el segundo nivel
															i=0;
															grps.forEach(g => {
																if(g.orgUnit.name === n2.ouName) {
																	if(!n2.groups) {
																		n2.groups = [];
																	}
																	n2.groups.push({
																		groupId			: g._id,
																		groupName		: g.name,
																		groupCode		: g.code,
																		courseTitle	: g.course.title
																	});
																}
																i++;
															});
															// listo... ahora nos vamos al tercer nivel
															i=0;

															n2.ous.forEach(n3 => {
																g2.push(n3.ouId);
																grps.forEach(g => {
																	if(g.orgUnit.name === n3.ouName) {
																		n3.groups.push({
																			groupId 		: g._id,
																			groupName		: g.name,
																			groupCode		: g.code,
																			courseTitle	: g.course.title
																		});
																	}
																	i++;
																});
																var query3 = new Query({
																	query: n3.ouId,
																	user: key_user._id
																});
																query3.save()
																	.catch((err) => {
																		Err.sendError(res,err,'report_controller','orgTree -- Saving Query 3 --',false,false,'User: ' + key_user.name);
																	});
																n3.query = query3._id;
															});
															g2.push(n2.ouId);
															g1 = g1.concat(g2);
															var query2 = new Query({
																query: g2,
																user: key_user._id
															});
															query2.save()
																.catch((err) => {
																	Err.sendError(res,err,'report_controller','orgTree -- Saving Query 2 --',false,false,'User: ' + key_user.name);
																});
															n2.query = [query2._id];
														});
														g1.push(n1.ouId);
														var query1 = new Query({
															query: g1,
															user: key_user._id
														});
														query1.save()
															.catch((err) => {
																Err.sendError(res,err,'report_controller','orgTree -- Saving Query 1 --',false,false,'User: ' + key_user.name);
															});
														n1.query = [query1._id];
													});
													// Por último, si estamos con un 'state' hay que quitar la raiz del 'org'
													// if(key_user.orgUnit.type === 'state') {
													// 	if(orgOus[0].ouType === 'org' || orgOus[0].ouName === key_user.org.name) {
													// 		orgOus = orgOus[0].ous;
													// 	}
													// }
													if(key_user.orgUnit.level === 2) {
														if(orgOus[0].ouLevel === 1 || orgOus[0].ouName === key_user.org.name) {
															orgOus = orgOus[0].ous;
														}
													}
													if(orgOus.length === 1) {
														orgOus = orgOus[0];
													}
													// console.log(require('util').inspect(orgOus, { depth: 3, colors:true}));
													res.status(200).json({
														'displayEvals': key_user.orgUnit.displayEvals,
														'groupNumber' : grps.length,
														'tree'			: orgOus
													});
												})
												.catch((err) => {
													Err.sendError(res,err,'report_controller','orgTree -- Finding Groups --',false,false,'User: ' + key_user.name);
												});
										}
									})
									.catch((err) => {
										Err.sendError(res,err,'report_controller','orgTree -- Finding Groups --',false,false,'User: ' + key_user.name);
									});
							} else {
								res.status(200).json({
									'displayEvals': false,
									'groupNumber' : 0,
									'tree'			: []
								});
							}
						})
						.catch((err) => {
							Err.sendError(res,err,'report_controller','orgTree -- Finding OUs --',false,false,'User: ' + key_user.name);
						});

				} else { // Si es un nivel 3 (level >= 3)
					let query = {orgUnit:mongoose.Types.ObjectId(key_user.orgUnit._id)};
					if(req.query.project) {
						query.project = mongoose.Types.ObjectId(req.query.project);
					}
					Group.aggregate()
						.match(query)
						.sort({code: 1})
						.project({
							_id			: 1,
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
							groupId			: '$_id',
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
									groupId			: '$groupId',
									groupCode		: '$groupCode',
									groupName		: '$groupName',
									courseTitle	: '$courseTitle'
								}
							}
						})
						.project({
							ou					: '$_id',
							groups	 		: '$groups',
							query				: key_user.orgUnit._id
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
							ouLevel 		: '$ou.level',
							ouParent		: '$ou.parent',
							groups	 		: '$groups',
							query				: '$query',
							_id					: false
						})
						.then((resultGrps) => {

							var allGroups = [];
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

							if(resultGrps.length === 1) {
								resultGrps = resultGrps[0];
							}

							var query = new Query({
								query: resultGrps.query,
								user: key_user._id
							});
							query.save()
								.catch((err) => {
									Err.sendError(res,err,'report_controller','orgTree -- Saving Query --',false,false,'User: ' + key_user.name);
								});
							resultGrps.query = query._id;
							res.status(200).json({
								'displayEvals': key_user.orgUnit.displayEvals,
								'groupNumber' : resultGrps.length,
								'tree'			: resultGrps
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'report_controller','orgTree -- Aggregate Groups --',false,false,'User: ' + key_user.name);
						});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','orgtree -- Delete prev queries --');
			});
	}, // orgTree

	percentil(req,res) {
		const key_user  = res.locals.user;
		var 	ou				= req.query.ou || key_user.orgUnit._id;
		var 	project		= req.query.project || false;
		var query1 = {}; // Users on track
		var query2 = {}; // Users Passed
		var query3 = {}; // Total users
		if(!mongoose.Types.ObjectId.isValid(ou)) {
			ou = JSON.parse(ou);
		}
		if(Array.isArray(ou)) {
			ou = ou[0];
		}
		Query.findOne({user:key_user._id,_id:ou}).lean()
			.then((query) => {
				if(query && query.query) {
					ou = query.query;
				}
				if(key_user.orgUnit.type === 'campus') {
					ou = key_user.orgUnit._id;
				}
				var ouIds = [];
				if(Array.isArray(ou)) {
					if(ou.length > 0) {
						ou.forEach(o => {ouIds.push(mongoose.Types.ObjectId(o));});
						query1 = {orgUnit: {$in:ouIds},report: {$ne:false},track:{$gt:0}};
						query2 = {orgUnit: {$in:ouIds},report: {$ne:false},pass:true};
						query3 = {orgUnit: {$in:ouIds},report: {$ne:false}};
					}
				} else {
					query1 = {orgUnit: mongoose.Types.ObjectId(ou),report: {$ne:false},track:{$gt:0}};
					query2 = {orgUnit: mongoose.Types.ObjectId(ou),report: {$ne:false},pass:true};
					query3 = {orgUnit: mongoose.Types.ObjectId(ou),report: {$ne:false}};
				}
				if(project) {
					query1.project = mongoose.Types.ObjectId(project);
					query2.project = mongoose.Types.ObjectId(project);
					query3.project = mongoose.Types.ObjectId(project);
				}
				query1.type = 'group';
				query2.type = 'group';
				query3.type = 'group';

				Promise.all([
					Roster.aggregate() // Buscar Track
						.match(query1)
						.group({ _id: '$group', usersOnTrack:{$sum:1}}),
					Roster.aggregate() // Buscar Aprobados
						.match(query2)
						.group({ _id: '$group', usersPassed:{$sum:1}}),
					Roster.aggregate() // Total de usuarios
						.match(query3)
						.group({ _id: '$group', totalUsers:{$sum:1}})
				])
					.then((globalResults) => {
						var [resultsT,resultsP,resultsR] = globalResults;
						// Resultados de Track
						var group_ids = [];
						var results 	= resultsT;
						results.forEach(function(res) {
							group_ids.push(res._id);
						});
						// Resultados de aprobados
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
						// Resultados de totales
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

						Group.find({_id: {$in: group_ids}, report: {$ne:false}})
							.select('name code orgUnit course')
							.populate('orgUnit', 'name longName parent level')
							.populate('course', 'title code')
							.then((groups) => {
								if(groups.length > 0 ) {
									groups.forEach(function(group) {
										var i = 0;
										var found = false;
										while(!found && i < results.length) {
											if(results[i]._id + '' === group._id +'') {
												found = true;
												results[i].groupId 		= group._id;
												results[i].group  		= group.name;
												results[i].code  			= group.code;
												results[i].course  		= group.course.title;
												results[i].courseCode = group.course.code;
												results[i].ouName 		= group.orgUnit.name;
												results[i].ouLongName = group.orgUnit.longName;
												results[i].ouLevel		= group.orgUnit.level;
												results[i].ouId 			= group.orgUnit._id;
												results[i].ouParent 	= group.orgUnit.parent;
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

									var send_results = [];

									if(results.length > 0) {
										let uniqueOUs = [...new Set(results.map(a => a.ouName))];
										uniqueOUs.forEach(a => {
											send_results.push({
												ouName : a,
												ous: []
											});
										});
										send_results.forEach(a => {
											results.forEach(b => {
												if(b.ouName === a.ouName) {
													a.ous.push({
														usersOnTrack	: b.usersOnTrack,
														usersPassed		: b.usersPassed,
														totalUsers		: b.totalUsers,
														groupId				: b.groupId,
														groupName			: b.group,
														groupCode 		: b.code,
														course				: b.course,
														courseCode 		: b.courseCode
														//ouName				: b.ouName,
														//ouLongName		: b.ouLongName,
														//ouParent			: b.ouParent
													});
													if(!a.ouLongName) {
														a.ouLongName 	= b.ouLongName;
														a.ouId				= b.ouId;
													}
												}
											});
										});
									}

									res.status(200).json({
										'status'			: 200,
										//'orgUnit'			: groups[0].orgUnit.name,
										//'orgUnitName' : groups[0].orgUnit.longName,
										'totalUsers'	: totalUsers,
										'usersOnTrack': totalTracks,
										'usersPassed'	: totalPassed,
										'results'			: send_results
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
						Err.sendError(res,err,'report_controller','percentil -- Promises for Results --');
					});
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','percentil -- Finding Query --');
			});


	}, //percentil

	async publicSummary(req,res) {
		const key_user  = res.locals.user;
		if(!key_user.roles.isMoocSupervisor) {
			return res.status(404).json({
				message: 'No tienes permisos para ver este reporte'
			});
		}
		const lastNMonths = +req.query.lastnmonths || 0;
		const now = new Date(),
			y = now.getFullYear(),
			m = now.getMonth() - lastNMonths;
		const firstDate = new Date(y, m, 1);
		const [totalCount,totalByCourse] = await Promise.all([
			Roster.countDocuments({
				type: 'public',
				createDate: {$gte: firstDate},
				course: {$exists: true}
			}),
			Roster.aggregate()
				.match({
					type: 'public',
					createDate: {$gte: firstDate},
					course: {$exists: true}
				})
				.group({
					_id: '$course',
					count:{$sum:1}
				})
				.lookup({
					from: 'courses',
					localField: '_id',
					foreignField: '_id',
					as: 'course'
				})
				.unwind('course')
				.project({
					_id: 0,
					course: '$course.title',
					courseCode: '$course.code',
					count: '$count'
				})
		]);
		totalByCourse.sort((a,b) => (a.count < b.count) ? 1 : -1);
		const labels = [];
		const series = [];
		const labels2 = [];
		totalByCourse.forEach(c => {
			labels.push(c.course);
			series.push(c.count);
			labels2.push(c.courseCode);
		});
		res.status(200).json({
			firstDate: firstDate,
			totalCount: totalCount,
			totalByCourse: {
				labels,labels2,series
			}
		});
	}, //publicSummary

	async publicProgress(req,res) {
		const key_user  = res.locals.user;
		if(!key_user.roles.isMoocSupervisor) {
			return res.status(404).json({
				message: 'No tienes permisos para ver este reporte'
			});
		}
		const thisMonth = req.query.date ? new Date(req.query.date) : new Date();
		// console.log(thisMonth);
		const firstDate = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
		const firstDateNext = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 1);
		var query = {
			type: 'public',
			createDate: {
				$gte: firstDate,
				$lt: firstDateNext
			}
		};
		// console.log(query);
		const items = await Roster.find(query)
			.select('status track passDate finalGrade course')
			.populate('student','name person')
			.populate('course','title')
			.catch(e =>
				Err.sendError(res,e,'report_controller','publicProgress -- Finding rosters --'));
		if(items && items.length > 0) {
			res.status(200).json(items);
		} else {
			res.status(200).json({
				'message': 'No hay registros'
			});
		}
	}, //publicProgress

	async gradesByGroup(req,res) {
		//const key_user  = res.locals.user;
		if(!req.query.groupid) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				'message': 'Groupid es requerido'
			});
		}
		const group = await Group.findById(req.query.groupid)
			.populate('course', 'title duration durationUnits')
			.populate('orgUnit', 'displayRFC')
			.catch((err) => {
				Err.sendError(res,err,'report_controller','gradesByGroup -- Finding group --');
				return;
			});
		if(!group) {
			res.status(StatusCodes.NOT_FOUND).json({
				'message': 'Group no localizado'
			});
		}
		const displayRFC = group.orgUnit.displayRFC || group.displayRFC || false;
		const items = await Roster.aggregate()
			.match({group: mongoose.Types.ObjectId(group._id),report: {$ne:false}})
			// .project('_id student grades finalGrade track pass passDate certificateNumber')
			.project({
				rosterid		: '$_id',
				_id					: 0,
				student			: 1,
				grades 			: 1,
				finalGrade 	: 1,
				track				: 1,
				pass 				: 1,
				passDate 		: 1,
				certificateNumber : 1
			})
			.lookup({
				from				: 'users',
				localField	: 'student',
				foreignField: '_id',
				as					: 'myUser'
			})
			.project({
				rosterid 		: 1,
				grades			:	1,
				finalGrade	:	1,
				track				:	1,
				pass				:	1,
				passDate		:	1,
				certificateNumber : '' + '$certificateNumber',
				id					: '$myUser._id',
				name				:	'$myUser.person.name',
				fatherName	:	'$myUser.person.fatherName',
				motherName	: '$myUser.person.motherName',
				email				: '$myUser.person.email',
				RFC					: {$cond: [displayRFC,'$myUser.admin.initialPassword','--']}
			})
			.unwind('name')
			.unwind('fatherName')
			.unwind('motherName')
			.unwind('email')
			.unwind('RFC')
			.unwind('grades')
			.unwind('id')
			.match({$or: [{'grades.wq': {$gt:0}},{'grades.wt': {$gt:0}}]})
			.lookup({
				from				: 'blocks',
				localField	: 'grades.block',
				foreignField: '_id',
				as					: 'myBlocks'
			})
			.project({
				rosterid 		: 1,
				finalGrade	:	1,
				track				:	1,
				pass				:	1,
				passDate		:	1,
				certificateNumber: 1,
				name				:	1,
				fatherName	:	1,
				motherName	:	1,
				email				:	1,
				RFC					: 1,
				id					: 1,
				blockTitle	:	'$myBlocks.title',
				blockGrade	:	'$grades.finalGrade',
				blockPond		:	'$grades.w'
			})
			.unwind('blockTitle')
			.group({
				_id: {
					rosterid 		: '$rosterid',
					name				: '$name',
					fatherName	: '$fatherName',
					motherName	: '$motherName',
					email				: '$email',
					RFC 				: '$RFC',
					id					: '$id',
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
				rosterid 		: '$_id.rosterid',
				id					: '$_id.id',
				name				: '$_id.name',
				fatherName	: '$_id.fatherName',
				motherName	: '$_id.motherName',
				email				: '$_id.email',
				RFC					: '$_id.RFC',
				track				: '$_id.track',
				finalGrade	: '$_id.finalGrade',
				pass				: '$_id.pass',
				passDate		: '$_id.passDate',
				certificateNumber	: '$_id.certificateNumber'.padStart(7,'0'),
				grades			: true,
				_id 				: false
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','gradesByGroup -- Finding roster items --');
				return;
			});
		if(items && items.length > 0 ){
			items.forEach(i => {
				let passDate = false;
				if(group.dates &&
					Array.isArray(group.dates) &&
					group.dates.length > 0
				) {
					let findCertificateDate = group.dates.find(date => date.type === 'certificate');
					// esta parte era por si la fecha mínima era la de liberación de constancia
					//if(findCertificateDate && send_grade.passDate < findCertificateDate.beginDate) {
					// Y esta es la fecha de liberación de constancia
					if(findCertificateDate) {
						passDate = findCertificateDate.beginDate;
					}
				}
				if(i.passDate) {
					if(passDate) {
						i.passDate = passDate;
						i.passDateSpa = dateInSpanish(passDate);
					} else {
						i.passDateSpa = dateInSpanish(i.passDate);
					}
				}
			});
		}
		res.status(StatusCodes.OK).json({
			group					: group.name,
			groupid				: group._id,
			groupCode			: group.code,
			displayRFC,
			course				: group.course.title,
			courseDuration : group.course.duration,
			courseDurUnits : units(group.course.durationUnits),
			beginDate			: group.beginDate,
			endDate				: group.endDate,
			beginDateSpa	: dateInSpanish(group.beginDate),
			endDateSpa		: dateInSpanish(group.endDate),
			otherDateSpa	: group.otherDate ? dateInSpanish(group.otherDate) : dateInSpanish(new Date()),
			presentedEndDate : group.presentedEndDate || 'passDate',
			number				: items.length,
			roster				: items
		});


	}, // gradesByGroup

	async filesBygroup(req,res) {
		const group = await Group.findById(req.params.groupid)
			.populate('course', 'title duration durationUnits')
			.catch((err) => {
				Err.sendError(res,err,'report_controller','filesBygroup -- Finding group --');
				return;
			});
		if(!group) {
			return res.status(StatusCodes.NOT_FOUND).json({
				'message': 'No se encontró grupo'
			});
		}
		const items = await Roster.aggregate()
			.match({
				group: mongoose.Types.ObjectId(req.params.groupid),
				report: {
					$ne:false
				}
			})
			.project({
				grades:true,
				student:true
			})
			.unwind('grades')
			.match({ // buscar las tareas por rúbrica
				'grades.w'	: +req.query.w,
				'grades.wt'	: +req.query.wt,
			})
			.project({
				student	: true,
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
				RFC					: '$user.admin.initialPassword',
				file				: true
			}).catch((err) => {
				Err.sendError(res,err,'report_controller','filesBygroup -- Finding rosters --');
				return;
			});
		if(items.length === 0) {
			return res.status(StatusCodes.NOT_FOUND).json({
				'message': `No se encontraron rosters para grupo ${group.code}`
			});
		}
		var files = [];
		items.forEach(function(item) {
			if(item.file) {
				files.push(item.file);
			}
		});
		const filesFound = await File.find({_id:{$in:files}})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','filesBygroup -- Finding rosters --');
				return;
			});
		if(filesFound.length === 0) {
			return res.status(200).json({
				'message': 'No se encontraron archivos'
			});
		}
		var results = [];
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
		res.status(StatusCodes.OK).json({
			groupCode	: group.code,
			groupName	: group.name,
			count			: results.length,
			message		: results
		});
	}, // filesBygroup

	async expandedGradesByGroup(req,res) {
		if(!req.params.groupid) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				'message': 'Groupid es requerido'
			});
		}
		const group = await Group.findById(req.params.groupid)
			.select('_id orgUnit course')
			.populate('orgUnit', 'displayRFC')
			.catch((err) => {
				Err.sendError(res,err,'report_controller','questionnariesByGroup -- Finding group --');
				return;
			});
		if(!group) {
			res.status(StatusCodes.NOT_FOUND).json({
				'message': 'Group no localizado'
			});
		}
		await group.populate({
			path: 'course',
			select: 'blocks',
			populate: {
				path: 'blocks',
				select: 'title',
				match: {
					wq: {$gt:0}
				}
			}
		}).execPopulate();
		const blocks = {};
		group.course.blocks.forEach(block => {
			blocks[block._id+''] = block.title;
		});
		const displayRFC = group.orgUnit.displayRFC || group.displayRFC || false;
		const select = displayRFC ? 'person admin.initialPassword' : 'person';
		var items = await Roster.find({
			group		: mongoose.Types.ObjectId(req.params.groupid),
			report	: {$ne:false}
		})
			.select('student finalGrade track grades.block grades.w grades.wq grades.finalGrade grades.quests')
			.populate('student', select)
			.lean()
			.catch((err) => {
				Err.sendError(res,err,'report_controller','expandedGradesByGroup -- Finding rosters --');
				return;
			});
		items = items.map(item => {
			return {
				grades: item.grades
					.filter(grade => grade.wq)
					.map(grade => {
						return {
							block: blocks[grade.block+''],
							finalGrade: grade.finalGrade,
							quests: grade.quests
						};
					}),
				RFC: displayRFC ? item.student.admin.initialPassword : '--',
				name: item.student.person.name,
				fatherName: item.student.person.fatherName,
				motherName: item.student.person.motherName,
				email: item.student.person.email
			};
		});
		items.forEach(roster => {
			if(roster.grades.length > 0) {
				roster.grades.forEach(g => {
					if(g.quests.length > 0) {
						g.quests.forEach(q => {
							var answers = [];
							if(q.answers.length > 0) {
								q.answers.forEach(a => {
									answers.push(a.result.map(r => {
										return {
											response: r.responseString,
											points: a.points
										};
									}));
								});
							}
							q.answers = answers;
						});
					}
				});
			}
		});
		res.status(StatusCodes.OK).json(items);
	}, //expandedGradesByGroup

	gradesByCampus(req,res) { // Revisar y rearmar porque no funciona correctamente
		const key_user 	= res.locals.user;
		const project   = req.query.project || null;
		if(key_user.orgUnit.type === 'state') {
			let query = {parent: key_user.orgUnit.name, org: key_user.org._id};
			if(project) {
				query.project = mongoose.Types.ObjectId(project);
			}
			OrgUnit.find(query)
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
							var send_rosters 		= [];
							var send_group			= [];
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
									send_group 		= [];
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
							Err.sendError(res,err,'report_controller','gradesByCampus -- Finding Roster --',false,false,'User: -' + key_user.name + '-');
						});
				})
				.catch((err) => {
					Err.sendError(res,err,'report_controller','gradesByCampus -- Finding Roster by State --',false,false,'User: -' + key_user.name + '-');
				});
		} else
		if(key_user.orgUnit.type === 'campus') {
			let query = { orgUnit: key_user.orgUnit._id, report: {$ne:false} };
			if(project) {
				query.project = mongoose.Types.ObjectId(project);
			}
			Roster.find(query)
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
					var send_rosters 		= [];
					var send_group			= [];
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
							send_group 		= [];
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
					res.status(200).json({
						'status': 200,
						'campus': key_user.orgUnit.longName + ' (' + key_user.orgUnit.name + '), -' + key_user.orgUnit.parent + '-',
						'message': send_rosters
					});
				})
				.catch((err) => {
					Err.sendError(res,err,'report_controller','gradesByCampus -- Finding Roster --',false,false,'User: -' + key_user.name + '-');
				});
		}
	}, //gradesByCampus

	studentHistory(req,res) {
		const key_user 	= res.locals.user;
		const userId		= req.query.userid;
		Promise.all([
			Session.find({user: userId}).select('url date token -_id').sort({date: -1}),
			User.findById(userId).populate('orgUnit', 'name longName parent').select('name person orgUnit')
		])
			.then((results) => {
				var [sessions,user]  = results;
				if(user) {
					var send_s = [];
					if(sessions && sessions.length > 0) {
						sessions.forEach(s => {
							var obj = {
								dateAgo : TA.ago(s.date),
								date		: s.date
							};
							if(s.url) 	{obj.url 			= s.url;				}
							if(s.token) {obj.message 	= 'User login';	}
							send_s.push(obj);
						});
					}
					if(key_user.orgUnit.type === 'org') {
						if(sessions && sessions.length > 0) {
							res.status(200).json({
								'status': 200,
								'sessions': send_s
							});
						} else {
							res.status(200).json({
								'status': 200,
								'sessions': 'No sessions found for user: ' + user.name
							});
						}
					} else if(key_user.orgUnit.type === 'state') {
						if(user.orgUnit.parent === key_user.orgUnit.name || user.orgUnit._id +'' === key_user.orgUnit._id + '') {
							res.status(200).json({
								'status': 200,
								'sessions': send_s
							});
						} else {
							res.status(200).json({
								'status': 200,
								'message': 'User ' + user.name + ' is not on same state as you'
							});
						}
					} else if(key_user.orgUnit.type === 'campus') {
						if(user.orgUnit._id +'' === key_user.orgUnit._id + '') {
							res.status(200).json({
								'status': 200,
								'sessions': send_s
							});
						} else {
							res.status(200).json({
								'status': 200,
								'message': 'User ' + user.name + ' is not on same campus as you'
							});
						}
					} else {
						res.status(200).json({
							'status': 200,
							'message': 'You do not have access to this user'
						});
					}
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'User not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','studentHistory -- Finding User and Sessions --',false,false,'User: -' + key_user.name + '-');
			});
	}, //studentHistory

	userMassSearch(req,res) {
		const key_user = res.locals.user;
		User.aggregate()
			.match({name:{$in:req.body.users}})
			.project('name person char1 char2')
			.then((users) => {
				if(users && users.length > 0){
					res.status(200).json({
						'status': 200,
						'users'	: users
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message'	: 'No users found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','userMassSearch -- Finding Users --',false,false,'User: -' + key_user.name + '-');
			});
	}, //userMassSearch

	groupsQuery(req,res) {
		const key_user = res.locals.user;
		var query = {};
		var query2 = {};
		if(req.query.course) {query = {course:mongoose.Types.ObjectId(req.query.course)};}
		if(req.query.parent) {query2 = {ouParent:req.query.parent};}
		Group.aggregate()
			.match(query)
			.project('code name orgUnit')
			.group({
				_id: '$orgUnit',
				groups: {
					$push: {
						id		: '$_id',
						code	: '$code',
						name	: '$name'
					}
				}
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
				ouParent		: '$ou.parent',
				groups	 		: '$groups',
				_id					: false
			})
			.match(query2)
			.then((ous) => {
				if(ous){
					var gps = 0;
					ous.forEach(ou => {
						gps = gps + ou.groups.length;
					});
					res.status(200).json({
						'status': 200,
						'ous': ous.length,
						'groups': gps,
						'message': ous
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No groups found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','groupsQuery -- Finding groups --',false,false,'User: -' + key_user.name + '-');
			});
	}, // groupsQuery


	async accessLog(req,res) { //Descarga de bitácoras de acceso de cada estudiante por grupo
		const key_user  = res.locals.user;
		const {
			isAdmin,
			isSupervisor,
			isRequester
		} = key_user.roles;
		const groupid = req.params.groupid;
		const displayRFC = req.query.displayRFC ? true : false;
		if(!isAdmin && !isSupervisor && !isRequester) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes privilegios'
			});
		}
		if(!groupid) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				message: 'Hace falta el groupid'
			});
		}
		const select = displayRFC ? 'person admin.initialPassword' : 'person';
		// console.log(displayRFC);
		// console.log(select);
		const group = await Group.findById(groupid)
			.select('students beginDate endDate')
			.populate('students', select)
			.catch((err) => {
				Err.sendError(res,err,'report_controller','accessLog-- Finding group --',false,false,'User: -' + key_user.name + '-');
				return;
			});
		if(!group) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: `No se encontró el grupo ${groupid}`
			});
		}
		// console.log(group);
		const stus = group.students.map(stu => stu._id);
		const logs = await Session
			.find({
				user:{$in:stus},
				date: {
					$gte: group.beginDate,
					$lte: group.endDate
				}
			})
			.select('user date url')
			// .limit(10)
			.catch((err) => {
				Err.sendError(res,err,'report_controller','accessLog-- Finding group --',false,false,'User: -' + key_user.name + '-');
				return;
			});
		var fullLog = [];
		group.students.forEach(stu => {
			const log = logs.filter(lo => lo.user + '' === stu.id + '').map(lo => {
				return displayRFC ? {
					RFC: stu.admin.initialPassword,
					name: stu.person.name,
					fatherName: stu.person.fatherName,
					motherName: stu.person.motherName,
					email: stu.person.email,
					date: dateAndTimeInSpanish(lo.date),
					url: lo.url
				} : {
					name: stu.person.name,
					fatherName: stu.person.fatherName,
					motherName: stu.person.motherName,
					email: stu.person.email,
					date: dateAndTimeInSpanish(lo.date),
					url: lo.url
				};
			});
			fullLog.push(log);
		});
		res.status(StatusCodes.OK).json([].concat(...fullLog));
	}, // accessLog

	async discussionLog(req,res) {
		const key_user  = res.locals.user;
		const {
			isAdmin,
			isSupervisor,
			isRequester
		} = key_user.roles;
		const groupid = req.params.groupid;
		const displayRFC = req.query.displayRFC ? true : false;
		if(!isAdmin && !isSupervisor && !isRequester) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes privilegios'
			});
		}
		if(!groupid) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				message: 'Hace falta el groupid'
			});
		}

		const group = await Group.findById(groupid)
			.select('_id')
			.catch((err) => {
				Err.sendError(res,err,'report_controller','discussionLog-- Finding group --',false,false,'User: -' + key_user.name + '-');
				return;
			});
		if(!group) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: `No se encontró el grupo ${groupid}`
			});
		}
		const Discussion = require('../src/discussions');
		const select = displayRFC ? 'person admin.initialPassword' : 'person';
		var discussions = await Discussion.find({group:groupid,pubtype:'question'})
			.select('user type text date')
			.populate('user',select)
			.catch((err) => {
				Err.sendError(res,err,'report_controller','discussionLog-- Finding discussions --',false,false,'User: -' + key_user.name + '-');
				return;
			});
		discussions = discussions.map(disc => {
			return displayRFC ? {
				RFC: disc.user.admin.initialPassword,
				name: disc.user.person.name,
				fatherName: disc.user.person.fatherName,
				motherName: disc.user.person.motherName,
				email: disc.user.person.email,
				date: dateAndTimeInSpanish(disc.date),
				type: disc.type,
				text: disc.text
			} : {
				name: disc.user.person.name,
				fatherName: disc.user.person.fatherName,
				motherName: disc.user.person.motherName,
				email: disc.user.person.email,
				date: dateAndTimeInSpanish(disc.date),
				type: disc.type,
				text: disc.text
			};
		});
		res.status(StatusCodes.OK).json([].concat(...discussions));
	}, //discussionLog

	cube(req,res){
		const key_user  = res.locals.user;
		var 	ou				= req.query.ou || key_user.orgUnit._id;
		var query1 = {}; // Users on track
		var query2 = {}; // Users Passed
		var query3 = {}; // Total users
		if(!mongoose.Types.ObjectId.isValid(ou)) {
			ou = JSON.parse(ou);
		}
		if(Array.isArray(ou)) {
			ou = ou[0];
		}
		Query.findOne({user:key_user._id,_id:ou}).lean()
			.then((query) => {
				if(query && query.query) {
					ou = query.query;
				}
				if(key_user.orgUnit.type === 'campus') {
					ou = key_user.orgUnit._id;
				}
				var ouIds = [];
				if(Array.isArray(ou)) {
					if(ou.length > 0) {
						ou.forEach(o => {ouIds.push(mongoose.Types.ObjectId(o));});
						query1 = {orgUnit: {$in:ouIds},report: {$ne:false},track:{$gt:0}};
						query2 = {orgUnit: {$in:ouIds},report: {$ne:false},pass:true};
						query3 = {orgUnit: {$in:ouIds},report: {$ne:false}};
					}
				} else {
					query1 = {orgUnit: mongoose.Types.ObjectId(ou),report: {$ne:false},track:{$gt:0}};
					query2 = {orgUnit: mongoose.Types.ObjectId(ou),report: {$ne:false},pass:true};
					query3 = {orgUnit: mongoose.Types.ObjectId(ou),report: {$ne:false}};
				}

				Promise.all([
					Roster.aggregate() // Buscar Track
						.match(query1)
						.project('orgUnit group')
						.lookup({
							from				: 'groups',
							localField	: 'group',
							foreignField: '_id',
							as					: 'group'
						})
						.unwind('group')
						.project({
							orgUnit	:	true,
							course	:	'$group.course'
						})
						.lookup({
							from				: 'courses',
							localField	: 'course',
							foreignField: '_id',
							as					: 'course'
						})
						.unwind('course')
						.project({
							orgUnit	:	true,
							course	:	'$course.title'
						})
						.lookup({
							from				: 'orgunits',
							localField	: 'orgUnit',
							foreignField: '_id',
							as					: 'ou'
						})
						.unwind('ou')
						.project({
							course	:	true,
							ou: {
								name: '$ou.name',
								longName: '$ou.longName',
								parent: '$ou.parent'
							}
						})
						.group({
							_id: {
								ou: '$ou',
								course: '$course'
							},
							usersOnTrack: {$sum:1}
						})
						.group({
							_id: {
								ou: '$_id.ou'
							},
							results: {
								$push: {
									course		: '$_id.course',
									usersOnTrack: '$usersOnTrack'
								}
							}
						})
						.project({
							ou			: '$_id.ou',
							results	: true,
							_id			: false
						})
						.group({
							_id: '$ou.parent',
							results: {
								$push: '$$ROOT'
							}
						})
						.project({
							state		: '$_id',
							results	: true,
							_id			: false
						}),
					Roster.aggregate() // Buscar Aprobados
						.match(query2)
						.project('orgUnit group')
						.lookup({
							from				: 'groups',
							localField	: 'group',
							foreignField: '_id',
							as					: 'group'
						})
						.unwind('group')
						.project({
							orgUnit	:	true,
							course	:	'$group.course'
						})
						.lookup({
							from				: 'courses',
							localField	: 'course',
							foreignField: '_id',
							as					: 'course'
						})
						.unwind('course')
						.project({
							orgUnit	:	true,
							course	:	'$course.title'
						})
						.lookup({
							from				: 'orgunits',
							localField	: 'orgUnit',
							foreignField: '_id',
							as					: 'ou'
						})
						.unwind('ou')
						.project({
							course	:	true,
							ou: {
								name: '$ou.name',
								longName: '$ou.longName',
								parent: '$ou.parent'
							}
						})
						.group({
							_id: {
								ou: '$ou',
								course: '$course'
							},
							usersPassed: {$sum:1}
						})
						.group({
							_id: {
								ou: '$_id.ou'
							},
							results: {
								$push: {
									course		: '$_id.course',
									usersPassed: '$usersPassed'
								}
							}
						})
						.project({
							ou			: '$_id.ou',
							results	: true,
							_id			: false
						})
						.group({
							_id: '$ou.parent',
							results: {
								$push: '$$ROOT'
							}
						})
						.project({
							state		: '$_id',
							results	: true,
							_id			: false
						}),
					Roster.aggregate() // Total de usuarios
						.match(query3)
						.project('orgUnit group')
						.lookup({
							from				: 'groups',
							localField	: 'group',
							foreignField: '_id',
							as					: 'group'
						})
						.unwind('group')
						.project({
							orgUnit	:	true,
							course	:	'$group.course'
						})
						.lookup({
							from				: 'courses',
							localField	: 'course',
							foreignField: '_id',
							as					: 'course'
						})
						.unwind('course')
						.project({
							orgUnit	:	true,
							course	:	'$course.title'
						})
						.lookup({
							from				: 'orgunits',
							localField	: 'orgUnit',
							foreignField: '_id',
							as					: 'ou'
						})
						.unwind('ou')
						.project({
							course	:	true,
							ou: {
								name: '$ou.name',
								longName: '$ou.longName',
								parent: '$ou.parent'
							}
						})
						.group({
							_id: {
								ou: '$ou',
								course: '$course'
							},
							totalUsers: {$sum:1}
						})
						.group({
							_id: {
								ou: '$_id.ou'
							},
							results: {
								$push: {
									course		: '$_id.course',
									totalUsers: '$totalUsers'
								}
							}
						})
						.project({
							ou			: '$_id.ou',
							results	: true,
							_id			: false
						})
						.group({
							_id: '$ou.parent',
							results: {
								$push: '$$ROOT'
							}
						})
						.project({
							state		: '$_id',
							results	: true,
							_id			: false
						})
				])
					.then((globalResults) => {
						var [resultsT,resultsP,resultsR] = globalResults;
						// Resultados de Track
						var group_ids = [];
						var results 	= resultsT;
						results.forEach(function(res) {
							group_ids.push(res._id);
						});
						// Resultados de aprobados
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
						// Resultados de totales
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
							.populate('orgUnit', 'name longName parent')
							.then((groups) => {
								if(groups.length > 0 ) {
									groups.forEach(function(group) {
										var i = 0;
										var found = false;
										while(!found && i < results.length) {
											if(results[i]._id + '' === group._id +'') {
												found = true;
												results[i].groupId 		= group._id;
												results[i].group  		= group.name;
												results[i].ouName 		= group.orgUnit.name;
												results[i].ouLongName = group.orgUnit.longName;
												results[i].ouId 			= group.orgUnit._id;
												results[i].ouParent 	= group.orgUnit.parent;
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

									var send_results = [];

									if(results.length > 0) {
										let uniqueOUs = [...new Set(results.map(a => a.ouName))];
										uniqueOUs.forEach(a => {
											send_results.push({
												ouName : a,
												ous: []
											});
										});
										send_results.forEach(a => {
											results.forEach(b => {
												if(b.ouName === a.ouName) {
													a.ous.push({
														usersOnTrack	: b.usersOnTrack,
														usersPassed		: b.usersPassed,
														totalUsers		: b.totalUsers,
														groupId				: b.groupId,
														groupName			: b.group,
														//ouName				: b.ouName,
														//ouLongName		: b.ouLongName,
														//ouParent			: b.ouParent
													});
													if(!a.ouLongName) {
														a.ouLongName 	= b.ouLongName;
														a.ouId				= b.ouId;
													}
												}
											});
										});
									}

									res.status(200).json({
										'status'			: 200,
										//'orgUnit'			: groups[0].orgUnit.name,
										//'orgUnitName' : groups[0].orgUnit.longName,
										'totalUsers'	: totalUsers,
										'usersOnTrack': totalTracks,
										'usersPassed'	: totalPassed,
										'results'			: send_results
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
						Err.sendError(res,err,'report_controller','percentil -- Promises for Results --');
					});
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','percentil -- Finding Query --');
			});

	}, // cube

	minicube(req, res) {
		//const ou = req.query.ou;
		Roster.aggregate() // Total de usuarios
			.match({report: {$ne:false}})
			.project('orgUnit group')
			.lookup({
				from				: 'groups',
				localField	: 'group',
				foreignField: '_id',
				as					: 'group'
			})
			.unwind('group')
			.project({
				orgUnit	:	true,
				course	:	'$group.course'
			})
			.lookup({
				from				: 'courses',
				localField	: 'course',
				foreignField: '_id',
				as					: 'course'
			})
			.unwind('course')
			.project({
				orgUnit	:	true,
				course	:	'$course.title'
			})
			.lookup({
				from				: 'orgunits',
				localField	: 'orgUnit',
				foreignField: '_id',
				as					: 'ou'
			})
			.unwind('ou')
			.project({
				course	:	true,
				ou: {
					name: '$ou.name',
					longName: '$ou.longName',
					parent: '$ou.parent'
				}
			})
			.group({
				_id: {
					ou: '$ou',
					course: '$course'
				},
				totalUsers: {$sum:1}
			})
			.project({
				clavePlantel	: '$_id.ou.name',
				nombrePlantel : '$_id.ou.longName',
				estado				: '$_id.ou.parent',
				curso 				: '$_id.course',
				totalUsuarios : '$totalUsers',
				_id						: false
			})
			.then((results) => {
				res.status(200).json({
					'status': 200,
					'report': results
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','minicube -- roster aggregate --');
			});
	}, // minicube

	minicubeT(req, res) {
		//const ou = req.query.ou;
		Roster.aggregate() // Total de usuarios
			.match({report: {$ne:false},track:{$gt:0}})
			.project('orgUnit group')
			.lookup({
				from				: 'groups',
				localField	: 'group',
				foreignField: '_id',
				as					: 'group'
			})
			.unwind('group')
			.project({
				orgUnit	:	true,
				course	:	'$group.course'
			})
			.lookup({
				from				: 'courses',
				localField	: 'course',
				foreignField: '_id',
				as					: 'course'
			})
			.unwind('course')
			.project({
				orgUnit	:	true,
				course	:	'$course.title'
			})
			.lookup({
				from				: 'orgunits',
				localField	: 'orgUnit',
				foreignField: '_id',
				as					: 'ou'
			})
			.unwind('ou')
			.project({
				course	:	true,
				ou: {
					name: '$ou.name',
					longName: '$ou.longName',
					parent: '$ou.parent'
				}
			})
			.group({
				_id: {
					ou: '$ou',
					course: '$course'
				},
				usersOnTrack: {$sum:1}
			})
			.project({
				clavePlantel	: '$_id.ou.name',
				nombrePlantel : '$_id.ou.longName',
				estado				: '$_id.ou.parent',
				curso 				: '$_id.course',
				usuariosActivos : '$usersOnTrack',
				_id						: false
			})
			.then((results) => {
				res.status(200).json({
					'status': 200,
					'report': results
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','minicube -- roster aggregate --');
			});
	}, // minicubeT

	minicubeP(req, res) {
		//const ou = req.query.ou;
		Roster.aggregate() // Total de usuarios
			.match({report: {$ne:false},pass:true})
			.project('orgUnit group')
			.lookup({
				from				: 'groups',
				localField	: 'group',
				foreignField: '_id',
				as					: 'group'
			})
			.unwind('group')
			.project({
				orgUnit	:	true,
				course	:	'$group.course'
			})
			.lookup({
				from				: 'courses',
				localField	: 'course',
				foreignField: '_id',
				as					: 'course'
			})
			.unwind('course')
			.project({
				orgUnit	:	true,
				course	:	'$course.title'
			})
			.lookup({
				from				: 'orgunits',
				localField	: 'orgUnit',
				foreignField: '_id',
				as					: 'ou'
			})
			.unwind('ou')
			.project({
				course	:	true,
				ou: {
					name: '$ou.name',
					longName: '$ou.longName',
					parent: '$ou.parent'
				}
			})
			.group({
				_id: {
					ou: '$ou',
					course: '$course'
				},
				usersPassed: {$sum:1}
			})
			.project({
				clavePlantel	: '$_id.ou.name',
				nombrePlantel : '$_id.ou.longName',
				estado				: '$_id.ou.parent',
				curso 				: '$_id.course',
				usuariosAprobados : '$usersPassed',
				_id						: false
			})
			.then((results) => {
				res.status(200).json({
					'status': 200,
					'report': results
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','minicube -- roster aggregate --');
			});
	}, // minicubeP

	listRoster(req,res){
		//const key_user 	= res.locals.user;
		var course	= '';
		if(req.query.course) {
			course = req.query.course;
		} else {
			res.status(200).json({
				'message': 'Please give course code'
			});
			return;
		}
		Roster.aggregate()
			.project({
				student	: true,
				orgUnit	: true,
				group		: true,
				finalGrade 	: true,
				track				: true,
				pass				: true
			})
			.lookup({
				from				: 'groups',
				localField	: 'group',
				foreignField: '_id',
				as					: 'group'
			})
			.unwind('group')
			.project({
				student	: true,
				orgUnit	:	true,
				course	:	'$group.course',
				finalGrade 	: true,
				track				: true,
				pass				: true
			})
			.lookup({
				from				: 'courses',
				localField	: 'course',
				foreignField: '_id',
				as					: 'course'
			})
			.unwind('course')
			.match({'course.code': course})
			.project({
				student	: true,
				orgUnit	:	true,
				courseCode	:	'$course.code',
				courseTitle : '$course.title',
				finalGrade 	: true,
				track				: true,
				pass				: true
			})
			.lookup({
				from				: 'orgunits',
				localField	: 'orgUnit',
				foreignField: '_id',
				as					: 'ou'
			})
			.unwind('ou')
			.project({
				student	: true,
				courseCode	:	true,
				courseTitle	:	true,
				ouname: '$ou.name',
				ouLongName: '$ou.longName',
				ouParent: '$ou.parent',
				finalGrade 	: true,
				track				: true,
				pass				: true
			})
			.lookup({
				from				: 'users',
				localField	: 'student',
				foreignField: '_id',
				as					: 'student'
			})
			.unwind('student')
			.project({
				nombre			: '$student.person.name',
				apellidoPaterno	: '$student.person.fatherName',
				apellidoMaterno	: '$student.person.motherName',
				email 			: '$student.person.email',
				courseCode	:	true,
				courseTitle	:	true,
				ouname			: true,
				ouLongName	: true,
				ouParent		: true,
				finalGrade 	: true,
				track				: true,
				pass				: true,
				_id					: false
			})
			.then((results) => {
				if(results && results.length > 0){
					res.status(200).json(results);
				} else {
					res.status(200).json({
						'message': 'No students found with that criteria'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','listRoster -- roster aggregate --');
			});

	}, // listRoster
	async unReport(req,res) { //API para sacar al grupo y a sus participantes de los reportes
		try {
			const group = await Group.findOne({code:req.query.code})
				.select('_id students')
				.lean();
			try {
				if(group){
					if(Array.isArray(group.students) && group.students.length > 0){
						for(var i=0; i < group.students.length; i++) {
							await updateRoster(group.students[i]);
						}
						res.status(200).json({
							'message': 'Rosters actualizados',
							'group': group
						});
					} else {
						res.status(404).json({
							'message': `El grupo ${req.query.code} no tiene rosters`,
							'group': group
						});
					}
				} else {
					res.status(404).json({
						'message': 'No existe grupo',
						'group': group
					});
				}
			} catch (err) {
				Err.sendError(res,err,'report_controller','unReport -- updating Rosters --');
			}
		} catch (err){
			Err.sendError(res,err,'report_controller','unReport -- finding group --');
		}
	}, // unReport

	async repEval(req,res) {
		const ou 			= req.query.ou || undefined;
		const project = req.query.project || undefined;
		if(!ou) {
			res.status(404).json({
				'message': 'Please give ou id'
			});
			return;
		} else {
			const query = {
				orgUnit: mongoose.Types.ObjectId(ou),
				report: {$ne: false}
			};
			if(project) {
				query.project = mongoose.Types.ObjectId(project);
			}
			try {
				const results = await Roster.aggregate()
					.match(query)
					.unwind('grades')
					.match({
						'grades.wq': {$gt:0},
						'grades.maxGradeQ': {$gt:0}
					})
					.lookup({
						from				: 'blocks',
						localField	: 'grades.block',
						foreignField: '_id',
						as					: 'myBlocks'
					})
					//.limit(2)
					.project({
						'myBlocks.title': 1
					}).unwind('myBlocks')
					.group({
						_id: '$myBlocks.title',
						total: {$sum:1}
					})
					;
				if(results) {
					res.status(200).json({
						'message': results,
						'query': query
					});
				} else {
					res.status(404).json({
						'message': 'No hay resultados'
					});
				}
			} catch (err) {
				Err.sendError(res,err,'report_controller','repEval');
			}
		}
	} // repEval
};



// PRIVATE Functions

async function updateRoster(student) {
	await Roster.updateMany({student:student,report:true},{$set:{report:false}});
	return;
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

function dateAndTimeInSpanish(date) {
	const day 	= date.getDate();
	const month = date.getMonth();
	const year	= date.getFullYear();
	const hour	= date.getHours();
	const minute = date.getMinutes();
	return `${year}/${(month+1+'').padStart(2,'0')}/${(day+'').padStart(2,'0')} ${(hour+'').padStart(2,'0')}:${(minute+'').padStart(2,'0')}`;
}
