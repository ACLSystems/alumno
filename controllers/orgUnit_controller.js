const StatusCodes = require('http-status-codes');
const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
const Err = require('../controllers/err500_controller');


module.exports = {
	//register(req, res, next) {
	async register(req, res) {
		var ouProps = new OrgUnit(Object.assign({},req.body));
		const key_user 	= res.locals.user;
		if( key_user.org.name !== ouProps.org && !key_user.roles.isAdmin) { // Validamos si el usuario tiene permisos para crear  unidades en su organizacion
			return res.status(StatusCodes.FORBIDDEN).json({
				'message': 'Usuario ' + key_user.name + ' no tiene permisos para  -' + ouProps.org + '-'
			});
		}
		if(!key_user.roles.isOrg) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				'message': 'Usuario no está autorizado'
			});
		}
		const org = await Org.findOne({ name: ouProps.org })
			.catch(e => {
				Err.sendError(res,e,'orgUnit_controller','create -- Finding org --');
			});
		if(!org) {
			return res.status(StatusCodes.NOT_FOUND).json({
				'message': 'Organización -' + ouProps.org + '- no existe'
			});
		}
		// console.log(org);
		// ------------
		if(!ouProps.parent) {
			ouProps.parent = ouProps.org;
		}
		var orgunitParent = await OrgUnit.findOne({ name: ouProps.parent}).catch((err) => {
			Err.sendError(res,err,'orgUnit_controller','register -- Localizando ou padre --');
		});
		if(!orgunitParent) {
			return res.status(StatusCodes.NOT_FOUND).json({
				'message': 'OU padre -' + ouProps.parent + '- no existe'
			});
		}
		if(ouProps.alias) {
			const temp = ouProps.alias;
			if(Array.isArray(temp)) {
				ouProps.alias = [temp];
			}
		}
		var permUsers = [];
		var permUser = {
			name: key_user.name,
			canRead: true,
			canModify: true,
			canSec: true
		};
		permUsers.push(permUser);
		permUsers.push({
			name: 'admin',
			canRead: true,
			canModify: true,
			canSec: true
		});
		var permRoles = [];
		permRoles.push({
			name: 'isAdmin',
			canRead: true,
			canModify: true,
			canSec: true
		});
		permRoles.push({
			name: 'isOrg',
			canRead: true,
			canModify: true,
			canSec: true
		});
		var permOrgs = [];
		permOrgs.push({
			name: ouProps.org,
			canRead: true,
			canModify: true,
			canSec: true
		});
		ouProps.perm = {
			users: permUser,
			roles: permRoles,
			orgs: permOrgs
		};
		ouProps.org = org._id;
		ouProps.mod = [];
		ouProps.mod.push({
			by: key_user.name,
			when: new Date(),
			what: 'Creación'
		});
		await ouProps.save()
			.catch((err) => {
				Err.sendError(res,err,'orgUnit_controller','register -- crendo OU --');
			});
		res.status(StatusCodes.CREATED).json(ouProps);
	}, //register

	// Masive Register -------------------------------------------

	// massiveRegister(req,res) {
	// 	var org = '';
	// 	var numOU = { requested: req.body.length };
	// 	const key_user 	= res.locals.user;
	// 	var searchOU = {};
	// 	var searchO = {};
	// 	if(!key_user.roles.isOrg && !key_user.roles.isAdmin) { // Validamos si el usuario tiene permisos para crear  unidades en su organizacion
	// 		res.status(StatusCodes.FORBIDDEN).json({
	// 			'message': 'User ' + key_user.name + ' does not have permissions for Org -' + key_user.org + '-'
	// 		});
	// 	} else { //else2
	// 		if(!key_user.roles.isAdmin) {
	// 			org = key_user.org.name;
	// 			searchOU = { org: key_user.org._id };
	// 			searchO = { name: org };
	// 		}
	// 		Org.findOne(searchO)
	// 			.then((org) => {
	// 				if(org) {
	// 					OrgUnit.find(searchOU)
	// 						.then((orgUnits) => {
	// 							var objOUParent = '';
	// 							var ouParent = '';
	// 							var objOrgUnit = '';
	// 							var status = 'ok';
	// 							var parentStatus = 'ok';
	// 							var orgStatus = 'ok';
	// 							var failed = [];
	// 							var ouTOinsert = [];
	// 							var ouToUpdate = [];
	// 							req.body.forEach(function(ou) {  // Bucle
	// 								objOUParent = orgUnits.find(function(objOUParent) { return objOUParent.name === ou.parent; });
	// 								ouParent = req.body.find(function(ouParent) {return ouParent.name === ou.parent; });
	// 								if(!objOUParent && !ouParent) { // validamos que exista el parent
	// 									parentStatus = 'Parent not found in database or not declared in JSON';
	// 									status = 'Some errors found';
	// 								}
	// 								if(!ou.org && !org) {
	// 									orgStatus = 'Org missing';
	// 									status = 'Some errors found';
	// 								}
	// 								if(status === 'Some errors found') {
	// 									failed.push({name: ou.name, parent: ou.parent, pStatus: parentStatus, org: orgStatus});
	// 									status = 'ok';
	// 								} else {
	// 									ou.org = org._id;
	// 									objOrgUnit = orgUnits.find(function(objOrgUnit) { return objOrgUnit.name === ou.name; });
	// 									if(!objOrgUnit) { // quiere decir que no existe el OU y key quiere insertar uno nuevo
	// 										var permUsers = [];
	// 										var permUser = { name: key_user.name, canRead: true, canModify: true, canSec: true };
	// 										permUsers.push(permUser);
	// 										var permOrgs = [];
	// 										var permOrg = { name: ou.org, canRead: true, canModify: true, canSec: true };
	// 										permOrgs.push(permOrg);
	// 										var permRoles = [];
	// 										var permRole =  { name: 'isOrg', canRead: true, canModify: true, canSec: true};
	// 										permRoles.push(permRole);
	// 										ou.perm = { users: permUsers, roles: permRoles, orgs: permOrgs };
	// 										const date = new Date();
	// 										const mod = {
	// 											by: key_user.name,
	// 											when: date,
	// 											what: 'OU creation'
	// 										};
	// 										ou.mod = [];
	// 										ou.mod.push(mod);
	// 										if(ou.alias){
	// 											const temp = ou.alias;
	// 											if(temp.constructor !== Array) {
	// 												ou.alias = [temp];
	// 											}
	// 										}
	// 										ouTOinsert.push(ou);
	// 									} else { // existe el OU
	// 										const date = new Date();
	// 										const mod = {
	// 											by: key_user.name,
	// 											when: date,
	// 											what: 'OU modification'
	// 										};
	// 										ou.mod = [];
	// 										ou.mod.push(mod);
	// 										ou._id = objOrgUnit._id;
	// 										ouToUpdate.push(ou);
	// 									}
	// 								}
	// 							});  // termina el bucle
	// 							if(ouTOinsert) {
	// 								OrgUnit.insertMany(ouTOinsert)
	// 									.catch((err) => {
	// 										Err.sendError(res,err,'orgUnit_controller','massiveRegister -- Inserting orgUnits --');
	// 									});
	// 								numOU.inserted = ouTOinsert.length;
	// 							}
	// 							if(ouToUpdate) {
	// 								ouToUpdate.forEach(function(ou2Up) {
	// 									OrgUnit.updateMany({_id: ou2Up._id}, {$set: ou2Up})
	// 										.catch((err) => {
	// 											Err.sendError(res,err,'orgUnit_controller','massiveRegister -- updating orgUnits --');
	// 										});
	// 								});
	// 								numOU.updated = ouToUpdate.length;
	// 							}
	// 							numOU.failed = failed.length;
	// 							var result = numOU;
	// 							result.details = failed;
	// 							res.status(StatusCodes.OK).json({
	// 								message: result
	// 							});
	// 						})
	// 						.catch((err) => {
	// 							Err.sendError(res,err,'orgUnit_controller','massiveRegister -- Finding orgUnits --');
	// 						});
	// 				} else {
	// 					res.status(StatusCodes.NOT_FOUND).json({
	// 						'message': 'Error: Org not found'
	// 					});
	// 				}
	// 			})
	// 			.catch((err) => {
	// 				Err.sendError(res,err,'orgUnit_controller','massiveRegister -- Finding orgs --');
	// 			});
	// 	} // else2
	// }, //massiveRegister

	// index(req, res){
	// 	res.status(StatusCodes.OK).json({
	// 		'message': 'This API is in maintenance'
	// 	});
	//
	// 	/*
	// 	const lng = req.query.lng;
	// 	const lat = req.query.lat;
	// 	var org = 'public';
	// 	var result = [];
	// 	if(req.query.org) { org = req.query.org; }
	// 	var max = 20000;
	// 	if(req.query.max) { max = parseInt(req.query.max);}
	// 	OrgUnit.geoNear(
	// 		{ type: 'Point', 'coordinates': [parseFloat(lng), parseFloat(lat)] },
	// 		{ spherical: true, maxDistance: max }
	// 	)
	// 		.then((ous) => {
	// 			Org.findOne({ name: org })
	// 				.then((o) => {
	// 					ous.forEach(function(ou) {
	// 						if(String(ou.obj.org) === String(o._id)) {
	// 							var temp = {};
	// 							temp.dis = ou.dis;
	// 							temp.obj = {
	// 								id: ou.obj.id,
	// 								name: ou.obj.name,
	// 								longName: ou.obj.longName,
	// 								type: ou.obj.type,
	// 								parent: ou.obj.parent,
	// 								org: o.name,
	// 								isActive: ou.obj.isActive,
	// 								alias: ou.obj.alias
	// 							};
	// 							result.push(temp);
	// 						}
	// 					});
	// 					res.status(200).json({
	// 						'status': 200,
	// 						'message': {
	// 							'ousNum': result.length,
	// 							'ous': result
	// 						}
	// 					});
	// 				})
	// 				.catch((err) => {
	// 					sendError(res,err,'index -- Finding org --');
	// 				});
	// 		})
	// 		.catch((err) => {
	// 			sendError(res,err,'index -- Finding orgUnit --');
	// 		});
	// 	*/
	// }, // index

	async list(req,res) {
		const key_user = res.locals.user;
		if(!key_user.roles.isOrg && !key_user.roles.isSupervisor && !key_user.roles.isAdmin) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'Usuario no autorizado'
			});
		}
		var sort = req.query.sort ? { longName: req.query.sort } : { name: 1 },
			skip = +req.query.skip || 0,
			limit = req.query.limit ? +req.query.limit : 15,
			query = req.query.query ? JSON.parse(req.query.query) : {};
		if(key_user.roles.isSupervisor && !key_user.roles.isAdmin && !key_user.roles.isOrg) {
			// localizar el parent
			query.parent = (key_user.orgUnit.type === 'state') ? key_user.orgUnit.name : key_user.orgUnit.parent;
		}
		// console.log(query);
		const org = await Org.findOne({ name: req.params.org })
			.catch((err) => {
				Err.sendError(res,err,'orgUnit_controller','list -- Finding org --');
				return;
			});
		if(!org) {
			return res.status(StatusCodes.NOT_FOUND).json({
				'message': `No existe la organización ${req.query.org}`
			});
		}
		query.org = org._id;
		const ous = await OrgUnit.find(query)
			.sort(sort)
			.skip(skip)
			.limit(limit)
			.select('name longName type org parent geometry address')
			.catch(err => {
				console.log(err);
				Err.sendError(res,err,'orgUnit_controller','list -- Finding orgUnit --');
				return;
			});
		res.status(StatusCodes.OK).json(ous);
	}, // list

	async publiclist(req,res) {
		var sort = req.query.sort ? { longName: req.query.sort } : { longName: 1 },
			skip = +req.query.skip || 0,
			limit = req.query.limit ? +req.query.limit : 15,
			query = { parent: req.params.parent };
		const org = await Org.findOne({ name: req.params.org })
			.catch((err) => {
				Err.sendError(res,err,'orgUnit_controller','publiclist -- Finding orgUnit --');
			});
		if(!org) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				message: 'No existe al organización'
			});
		}
		query.org = org._id;
		const ous = await OrgUnit.find(query)
			.sort(sort)
			.skip(skip)
			.limit(limit)
			.select('name longName address')
			.catch((err) => {
				Err.sendError(res,err,'orgUnit_controller','publiclist -- Finding orgUnit --');
			});
		res.status(StatusCodes.OK).json(ous);
	}, // publiclist

	async get(req,res) {
		if(!req.params.ou) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				message: 'Favor de indicar la Unidad Organizacional como parámetro'
			});
		}
		const ou = await OrgUnit.findOne({name: req.params.ou})
			.select('name type parent longName')
			.catch((err) => {
				Err.sendError(res,err,'orgUnit_controller','get -- Finding orgUnit --');
			});
		res.status(StatusCodes.OK).json(ou);
	}, // get

};
