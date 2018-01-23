const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
const Users = require('../src/users');
const winston = require('winston');
//const obj_type = 'orgunit';
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
	//register(req, res, next) {
	register(req, res) {
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Please, give data to process'
			});
		} else {  //else1
			const ouProps = req.body;
			var key = (req.body && req.body.x_key) || req.headers['x-key'];
			Users.findOne({ name: key }, { name: true, org: true, roles: true })
				.populate('org')
				.then((key_user) => {
					if( key_user.org !== ouProps.org && !key_user.roles.isAdmin) { // Validamos si el usuario tiene permisos para crear  unidades en su organizacion
						res.status(403).json({
							'status': 403,
							'message': 'User ' + key + ' does not have permissions for Org -' + ouProps.org + '-'
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
												var permUsers = new Array();
												var permUser = { name: key_user.name, canRead: true, canModify: true, canSec: true };
												permUsers.push(permUser);
												permUser = { name: 'admin', canRead: true, canModify: true, canSec: true };
												permUsers.push(permUser);
												var permRoles = new Array();
												var permRole = { name: 'isAdmin', canRead: true, canModify: true, canSec: true };
												permRoles.push(permRole);
												permRole = { name: 'isOrg', canRead: true, canModify: true, canSec: true };
												permRoles.push(permRole);
												var permOrgs = new Array();
												const permOrg = { name: ouProps.org, canRead: true, canModify: true, canSec: true };
												permOrgs.push(permOrg);
												ouProps.perm = { users: permUser, roles: permRoles, orgs: permOrgs };
												const date = new Date();
												const mod = {by: key, when: date, what: 'OU creation'};
												ouProps.org = org._id;
												ouProps.mod = new Array();
												ouProps.mod.push(mod);
												OrgUnit.create(ouProps)
													.then(() => {
														logger.info('OU -' + ouProps.name + '- created under -' + org.name + '- org');
														res.status(201).json({
															'status': 201,
															'message': 'OU -' + ouProps.name + '- created under -' + org.name + '- org'
														});
													})
													.catch((err) => {
														logger.info(err);
														const mess = {id: 409, error: 'Error: OU -' + ouProps.name + '- already exists'};
														logger.info(mess);
														res.status(409).json({
															'status': 409,
															'message': 'OU -' + ouProps.name + '- already exists'
														});
													});
											} else {
												OrgUnit.findOne({ name: ouProps.parent}, { name: true })
													.then((orgunitParent) => {
														if(!orgunitParent) {
															const mess = {id: 404, error: 'Error: Parent OU -' + ouProps.parent + '- does not exist'};
															logger.info(mess);
															res.status(404).json({
																'status': 404,
																'message': 'Parent OU -' + ouProps.parent + '- does not exist'
															});
														} else {
															var temp = ouProps.alias;
															if(temp.constructor !== Array) {
																ouProps.alias = [temp];
															}
															var permUsers = new Array();
															var permUser = { name: key_user.name, canRead: true, canModify: true, canSec: true };
															permUsers.push(permUser);
															permUser = { name: 'admin', canRead: true, canModify: true, canSec: true };
															permUsers.push(permUser);
															var permRoles = new Array();
															var permRole = { name: 'isAdmin', canRead: true, canModify: true, canSec: true };
															permRoles.push(permRole);
															permRole = { name: 'isOrg', canRead: true, canModify: true, canSec: true };
															permRoles.push(permRole);
															var permOrgs = new Array();
															const permOrg = { name: ouProps.org, canRead: true, canModify: true, canSec: true };
															permOrgs.push(permOrg);
															ouProps.perm = { users: permUser, roles: permRoles, orgs: permOrgs };
															const date = new Date();
															const mod = {by: key, when: date, what: 'OU creation'};
															ouProps.org = org._id;
															ouProps.mod = new Array();
															ouProps.mod.push(mod);
															OrgUnit.create(ouProps)
																.then(() => {
																	logger.info('OU -' + ouProps.name + '- created under -' + org.name + '- org');
																	res.status(201).json({
																		'status': 201,
																		'message': 'OU -' + ouProps.name + '- created under -' + org.name + '- org'
																	});
																})
																.catch((err) => {
																	sendError(res,err,'register -- Create orgUnit --');
																});
														}
													})
													.catch((err) => {
														sendError(res,err,'register -- Finding parent orgUnit --');
													});
											}
										}
									})
									.catch((err) => {
										sendError(res,err,'register -- Finding Org --');
									});
							} //else3
						} else { // else aqui
							res.status(403);
							res.json({
								'status': 403,
								'message': 'User is not authorized'
							});
						}  // aqui
					} //else2
				})
				.catch((err) => {
					sendError(res,err,'register -- Finding Key User --');
				});
		} //else1
	}, //register

	// Masive Register -------------------------------------------

	massiveRegister(req,res) {
		var org = '';
		var numOU = { requested: req.body.length };
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Please, give data to process'
			});
		} else {  //else1
			var key = (req.body && req.body.x_key) || req.headers['x-key'];
			var searchOU = {};
			var searchO = {};
			Users.findOne({ name: key }, { name: true, org: true, roles: true })
				.populate('org')
				.then((key_user) => {
					//console.log(key_user);
					if(!key_user.roles.isOrg && !key_user.roles.isAdmin) { // Validamos si el usuario tiene permisos para crear  unidades en su organizacion
						res.status(403).json({
							'status': 403,
							'message': 'User ' + key + ' does not have permissions for Org -' + key_user.org + '-'
						});
					} else { //else2
						if(!key_user.roles.isAdmin) {
							org = key_user.org.name;
							searchOU = { org: key_user.org._id };
							searchO = { name: org };
						}
					} // else2
					//console.log(org); // eslint-disable-line
					//console.log(req.body); // eslint-disable-line
					Org.find(searchO)
						.then((org) => {
							OrgUnit.find(searchOU)
								.then((orgUnits) => {
									var objOUParent = '';
									var objOrgUnit = '';
									var status = 'ok';
									var parentStatus = 'ok';
									var orgStatus = 'ok';
									var failed = new Array();
									var ouTOinsert = new Array();
									var ouToUpdate = new Array();
									req.body.forEach(function(ou) {  // Bucle
										if(!ou.parent) {
											parentStatus = 'Parent missing';
											status = 'Some errors found';
										}
										objOUParent = orgUnits.find(function(objOUParent) { return objOUParent.name === ou.parent; });
										if(!objOUParent) {
											parentStatus = 'Parent not found';
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
											if(!ou.org) {
												ou.org = org._id;
											}
											objOrgUnit = orgUnits.find(function(objOrgUnit) { return objOrgUnit.name === ou.name; });
											if(!objOrgUnit) { // quiere decir que no existe el OU y key quiere insertar uno nuevo
												var permUsers = new Array();
												var permUser = { name: key, canRead: true, canModify: true, canSec: true };
												permUsers.push(permUser);
												var permOrgs = new Array();
												var permOrg = { name: ou.org, canRead: true, canModify: true, canSec: true };
												permOrgs.push(permOrg);
												var permRoles = new Array();
												var permRole =  { name: 'isOrg', canRead: true, canModify: true, canSec: true};
												permRoles.push(permRole);
												ou.perm = { users: permUsers, roles: permRoles, orgs: permOrgs };
												const date = new Date();
												const mod = {
													by: key,
													when: date,
													what: 'OU creation'
												};
												ou.mod = new Array();
												ou.mod.push(mod);
												const temp = ou.alias;
												if(temp.constructor !== Array) {
													ou.alias = [temp];
												}
												ouTOinsert.push(ou);
											} else { // existe el OU
												const date = new Date();
												const mod = {
													by: key,
													when: date,
													what: 'OU creation'
												};
												ou.mod = new Array();
												ou.mod.push(mod);
												ou._id = objOrgUnit._id;
											}
										}
									});  // termina el bucle
									if(ouTOinsert) {
										OrgUnit.insertMany(ouTOinsert)
											.catch((err) => {
												sendError(res,err,'massiveRegister -- Inserting OrgUnits --');
											});
										numOU.inserted = ouTOinsert.length;
									}
									if(ouToUpdate) {
										ouToUpdate.forEach(function(ou2Up) {
											OrgUnit.update({_id: ou2Up._id}, {$set: ou2Up})
												.catch((err) => {
													sendError(res,err,'massiveRegister -- Updating OrgUnits --');
												});
										});
										numOU.updated = ouToUpdate.length;
									}
									numOU.failed = failed.length;
									var result = numOU;
									result.details = failed;
									res.status(200).json({
										'status': 200,
										message: result
									});
								})
								.catch((err) => {
									sendError(res,err,'massiveRegister -- Finding OrgUnits --');
								});
						})
						.catch((err) => {
							sendError(res,err,'massiveRegister -- Finding Orgs --');
						});
				})
				.catch((err) => {
					sendError(res,err,'massiveRegister -- Finding Key User --');
				});
		} //else1
	} //massiveRegister
};

function sendError(res, err, section) {
	logger.info('orgUnit controller -- Section: ' + section + '----');
	logger.info(err);
	res.status(500).json({
		'status': 500,
		'message': 'Error',
		'Error': err.message
	});
	return;
}
