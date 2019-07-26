const StatusCodes = require('http-status-codes');
const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
const Err = require('../controllers/err500_controller');


module.exports = {
	//register(req, res, next) {
	register(req, res) {
		const ouProps = req.body;
		const key_user 	= res.locals.user;
		if( key_user.org.name !== ouProps.org && !key_user.roles.isAdmin) { // Validamos si el usuario tiene permisos para crear  unidades en su organizacion
			res.status(403).json({
				'status': 403,
				'message': 'User ' + key_user.name + ' does not have permissions for Org -' + ouProps.org + '-'
			});
		} else { //else2
			if(key_user.roles.isOrg) {
				if(!ouProps.org) {
					res.status(406).json({
						'status': 406,
						'message': 'Please, give OU'
					});
				} else { //else3
					Org.findOne({ name: ouProps.org }, { name: true} )
						.then((org) => {
							if(!org) {
								res.status(404).json({
									'status': 404,
									'message': 'Org -' + ouProps.org + '- does not exist'
								});
							} else {
								// ------------
								if(!ouProps.parent) {
									ouProps.parent = ouProps.org;
									if(ouProps.alias) {
										const temp = ouProps.alias;
										if(temp.constructor !== Array) {
											ouProps.alias = [temp];
										}
									}
									var permUsers = [];
									var permUser = { name: key_user.name, canRead: true, canModify: true, canSec: true };
									permUsers.push(permUser);
									permUser = { name: 'admin', canRead: true, canModify: true, canSec: true };
									permUsers.push(permUser);
									var permRoles = [];
									var permRole = { name: 'isAdmin', canRead: true, canModify: true, canSec: true };
									permRoles.push(permRole);
									permRole = { name: 'isOrg', canRead: true, canModify: true, canSec: true };
									permRoles.push(permRole);
									var permOrgs = [];
									const permOrg = { name: ouProps.org, canRead: true, canModify: true, canSec: true };
									permOrgs.push(permOrg);
									ouProps.perm = { users: permUser, roles: permRoles, orgs: permOrgs };
									const date = new Date();
									const mod = {by: key_user.name, when: date, what: 'OU creation'};
									ouProps.org = org._id;
									ouProps.mod = [];
									ouProps.mod.push(mod);
									OrgUnit.create(ouProps)
										.then(() => {
											res.status(201).json({
												'status': 201,
												'message': 'OU -' + ouProps.name + '- created under -' + org.name + '- org'
											});
										})
										.catch((err) => {
											Err.sendError(res,err,'orgUnit_controller','create -- orgUnit --');
										});
								} else {
									OrgUnit.findOne({ name: ouProps.parent}, { name: true })
										.then((orgunitParent) => {
											if(!orgunitParent) {
												res.status(404).json({
													'status': 404,
													'message': 'Parent OU -' + ouProps.parent + '- does not exist'
												});
											} else {
												var temp = ouProps.alias;
												if(temp.constructor !== Array) {
													ouProps.alias = [temp];
												}
												var permUsers = [];
												var permUser = { name: key_user.name, canRead: true, canModify: true, canSec: true };
												permUsers.push(permUser);
												permUser = { name: 'admin', canRead: true, canModify: true, canSec: true };
												permUsers.push(permUser);
												var permRoles = [];
												var permRole = { name: 'isAdmin', canRead: true, canModify: true, canSec: true };
												permRoles.push(permRole);
												permRole = { name: 'isOrg', canRead: true, canModify: true, canSec: true };
												permRoles.push(permRole);
												var permOrgs = [];
												const permOrg = { name: ouProps.org, canRead: true, canModify: true, canSec: true };
												permOrgs.push(permOrg);
												ouProps.perm = { users: permUser, roles: permRoles, orgs: permOrgs };
												const date = new Date();
												const mod = {by: key_user.name, when: date, what: 'OU creation'};
												ouProps.org = org._id;
												ouProps.mod = [];
												ouProps.mod.push(mod);
												OrgUnit.create(ouProps)
													.then(() => {
														res.status(201).json({
															'status': 201,
															'message': 'OU -' + ouProps.name + '- created under -' + org.name + '- org'
														});
													})
													.catch((err) => {
														Err.sendError(res,err,'orgUnit_controller','create -- Finding orgUnit --');
													});
											}
										})
										.catch((err) => {
											Err.sendError(res,err,'orgUnit_controller','create -- Finding parent orgUnit --');
										});
								}
							}
						})
						.catch((err) => {
							Err.sendError(res,err,'orgUnit_controller','create -- Finding org --');
						});
				} //else3
			} else { // else aqui
				res.status(StatusCodes.UNAUTHORIZED).json({
					'message': 'User is not authorized'
				});
			}  // aqui
		} //else2
	}, //register

	// Masive Register -------------------------------------------

	massiveRegister(req,res) {
		var org = '';
		var numOU = { requested: req.body.length };
		const key_user 	= res.locals.user;
		var searchOU = {};
		var searchO = {};
		if(!key_user.roles.isOrg && !key_user.roles.isAdmin) { // Validamos si el usuario tiene permisos para crear  unidades en su organizacion
			res.status(StatusCodes.FORBIDDEN).json({
				'message': 'User ' + key_user.name + ' does not have permissions for Org -' + key_user.org + '-'
			});
		} else { //else2
			if(!key_user.roles.isAdmin) {
				org = key_user.org.name;
				searchOU = { org: key_user.org._id };
				searchO = { name: org };
			}
			Org.findOne(searchO)
				.then((org) => {
					if(org) {
						OrgUnit.find(searchOU)
							.then((orgUnits) => {
								var objOUParent = '';
								var ouParent = '';
								var objOrgUnit = '';
								var status = 'ok';
								var parentStatus = 'ok';
								var orgStatus = 'ok';
								var failed = [];
								var ouTOinsert = [];
								var ouToUpdate = [];
								req.body.forEach(function(ou) {  // Bucle
									objOUParent = orgUnits.find(function(objOUParent) { return objOUParent.name === ou.parent; });
									ouParent = req.body.find(function(ouParent) {return ouParent.name === ou.parent; });
									if(!objOUParent && !ouParent) { // validamos que exista el parent
										parentStatus = 'Parent not found in database or not declared in JSON';
										status = 'Some errors found';
									}
									if(!ou.org && !org) {
										orgStatus = 'Org missing';
										status = 'Some errors found';
									}
									if(status === 'Some errors found') {
										failed.push({name: ou.name, parent: ou.parent, pStatus: parentStatus, org: orgStatus});
										status = 'ok';
									} else {
										ou.org = org._id;
										objOrgUnit = orgUnits.find(function(objOrgUnit) { return objOrgUnit.name === ou.name; });
										if(!objOrgUnit) { // quiere decir que no existe el OU y key quiere insertar uno nuevo
											var permUsers = [];
											var permUser = { name: key_user.name, canRead: true, canModify: true, canSec: true };
											permUsers.push(permUser);
											var permOrgs = [];
											var permOrg = { name: ou.org, canRead: true, canModify: true, canSec: true };
											permOrgs.push(permOrg);
											var permRoles = [];
											var permRole =  { name: 'isOrg', canRead: true, canModify: true, canSec: true};
											permRoles.push(permRole);
											ou.perm = { users: permUsers, roles: permRoles, orgs: permOrgs };
											const date = new Date();
											const mod = {
												by: key_user.name,
												when: date,
												what: 'OU creation'
											};
											ou.mod = [];
											ou.mod.push(mod);
											if(ou.alias){
												const temp = ou.alias;
												if(temp.constructor !== Array) {
													ou.alias = [temp];
												}
											}
											ouTOinsert.push(ou);
										} else { // existe el OU
											const date = new Date();
											const mod = {
												by: key_user.name,
												when: date,
												what: 'OU modification'
											};
											ou.mod = [];
											ou.mod.push(mod);
											ou._id = objOrgUnit._id;
											ouToUpdate.push(ou);
										}
									}
								});  // termina el bucle
								if(ouTOinsert) {
									OrgUnit.insertMany(ouTOinsert)
										.catch((err) => {
											Err.sendError(res,err,'orgUnit_controller','massiveRegister -- Inserting orgUnits --');
										});
									numOU.inserted = ouTOinsert.length;
								}
								if(ouToUpdate) {
									ouToUpdate.forEach(function(ou2Up) {
										OrgUnit.update({_id: ou2Up._id}, {$set: ou2Up})
											.catch((err) => {
												Err.sendError(res,err,'orgUnit_controller','massiveRegister -- updating orgUnits --');
											});
									});
									numOU.updated = ouToUpdate.length;
								}
								numOU.failed = failed.length;
								var result = numOU;
								result.details = failed;
								res.status(StatusCodes.OK).json({
									message: result
								});
							})
							.catch((err) => {
								Err.sendError(res,err,'orgUnit_controller','massiveRegister -- Finding orgUnits --');
							});
					} else {
						res.status(StatusCodes.NOT_FOUND).json({
							'message': 'Error: Org not found'
						});
					}
				})
				.catch((err) => {
					Err.sendError(res,err,'orgUnit_controller','massiveRegister -- Finding orgs --');
				});
		} // else2
	}, //massiveRegister

	index(req, res){
		res.status(StatusCodes.OK).json({
			'message': 'This API is in maintenance'
		});

		/*
		const lng = req.query.lng;
		const lat = req.query.lat;
		var org = 'public';
		var result = [];
		if(req.query.org) { org = req.query.org; }
		var max = 20000;
		if(req.query.max) { max = parseInt(req.query.max);}
		OrgUnit.geoNear(
			{ type: 'Point', 'coordinates': [parseFloat(lng), parseFloat(lat)] },
			{ spherical: true, maxDistance: max }
		)
			.then((ous) => {
				Org.findOne({ name: org })
					.then((o) => {
						ous.forEach(function(ou) {
							if(String(ou.obj.org) === String(o._id)) {
								var temp = {};
								temp.dis = ou.dis;
								temp.obj = {
									id: ou.obj.id,
									name: ou.obj.name,
									longName: ou.obj.longName,
									type: ou.obj.type,
									parent: ou.obj.parent,
									org: o.name,
									isActive: ou.obj.isActive,
									alias: ou.obj.alias
								};
								result.push(temp);
							}
						});
						res.status(200).json({
							'status': 200,
							'message': {
								'ousNum': result.length,
								'ous': result
							}
						});
					})
					.catch((err) => {
						sendError(res,err,'index -- Finding org --');
					});
			})
			.catch((err) => {
				sendError(res,err,'index -- Finding orgUnit --');
			});
		*/
	}, // index

	list(req,res) {
		//const key_user 	= res.locals.user;
		var sort = { name: 1 };
		var skip = 0;
		var limit = 15;
		var query = {};
		if(req.query.sort) { sort = { longName: req.query.sort }; }
		if(req.query.skip) { skip = parseInt( req.query.skip ); }
		if(req.query.limit) { limit = parseInt( req.query.limit ); }
		if(req.query.query) { query = JSON.parse(req.query.query); }
		Org.findOne({ name: req.query.org })
			.then((org) => {
				query.org = org._id;
				OrgUnit.find(query)
					.sort(sort)
					.skip(skip)
					.limit(limit)
					.then((ous) => {
						var send_ous = [];
						ous.forEach(function(ou) {
							send_ous.push({
								id: ou._id,
								name: ou.name,
								longName: ou.longName,
								type: ou.type,
								org: org.name,
								parent: ou.parent,
								geometry: ou.geometry,
								address: ou.address
							});
						});
						res.status(StatusCodes.OK).json({
							'message': {
								ousNum: send_ous.length,
								ous: send_ous}
						});
					})
					.catch((err) => {
						Err.sendError(res,err,'orgUnit_controller','list -- Finding orgUnit --');
					});
			})
			.catch((err) => {
				Err.sendError(res,err,'orgUnit_controller','list -- Finding org --');
			});
	}, // list

	publiclist(req,res) {
		if(!req.query.org) {
			res.status(StatusCodes.NOT_ACCEPTABLE).json({
				'message': 'Error: missing org name by query'
			});
			return;
		}
		var sort = { longName: 1 };
		var skip = 0;
		var limit = 15;
		var query = {};
		if(req.query.sort) { sort = { longName: req.query.sort }; }
		if(req.query.skip) { skip = parseInt( req.query.skip ); }
		if(req.query.limit) { limit = parseInt( req.query.limit ); }
		if(req.query.query) { query = JSON.parse(req.query.query); }
		Org.findOne({ name: req.query.org })
			.then((org) => {
				query.org = org._id;
				OrgUnit.find(query)
					.sort(sort)
					.skip(skip)
					.limit(limit)
					.then((ous) => {
						var send_ous = [];
						ous.forEach(function(ou) {
							send_ous.push({
								id: ou._id,
								name: ou.name,
								longName: ou.longName,
								address: ou.address
							});
						});
						res.status(200).json({
							'status': 200,
							'message': {
								ousNum: send_ous.length,
								ous: send_ous}
						});
					})
					.catch((err) => {
						Err.sendError(res,err,'orgUnit_controller','publiclist -- Finding orgUnit --');
					});
			})
			.catch((err) => {
				Err.sendError(res,err,'orgUnit_controller','publiclist -- Finding orgUnit --');
			});
	}, // publiclist

	get(req,res) {
		OrgUnit.findOne({name: req.query.ou})
			.select('name type parent longName')
			.then(ou =>  {
				res.status(StatusCodes.OK).json({
					'message': ou
				});
			}).catch((err) => {
				Err.sendError(res,err,'orgUnit_controller','get -- Finding orgUnit --');
			});
	}, // get

};
