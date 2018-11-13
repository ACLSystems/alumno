//
const User = require('../src/users');
const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
//const generate = require('nanoid/generate');
//const moment = require('moment');
const bcrypt = require('bcrypt-nodejs');
const mailjet = require('../shared/mailjet');
const generate = require('nanoid/generate');
const Err = require('../controllers/err500_controller');

const logger = require('../shared/winston-logger');

const url 								= process.env.LIBRETA_URI;
//const template_user				= 310518; // plantilla para el usuario que se registra por su cuenta
const template_user_admin = 339990; // plantilla para el usuario que es registrado por el administrador


module.exports = {
	//massiveRegister(req,res,next) {
	massiveRegister(req,res) {
		if(!req.body ) {
			res.status(406).json({
				'status': 406,
				'message': 'Please, give data to process'
			});
		} else {
			var usersReq = req.body;
			var numUsers = {
				requested: usersReq.length
			};
			const key_user 	= res.locals.user;
			var searchO = {};
			var searchOU = {};
			if(key_user.roles.isOrg && !key_user.roles.isAdmin) {
				searchO = { name: key_user.org.name };
			}
			if(key_user.roles.isAdmin || key_user.roles.isOrg || key_user.roles.isSupervisor) {
				Org.find(searchO, {name: true})
					.then((orgs) => {
						if(key_user.roles.isOrg && !key_user.roles.isAdmin) {
							searchOU = { org: orgs[0]._id };
						}
						OrgUnit.find(searchOU)
							.populate('org')
							.then((orgUnits) => {
								var objOrg = '';
								var objOrgUnit = '';
								var failed = new Array();
								var status = 'ok';
								var permRoles = new Array();
								var permRole = { name: 'isAdmin', canRead: true, canModify: true, canSec: true };
								permRoles.push(permRole);
								permRole = { name: 'isOrg', canRead: true, canModify: true, canSec: true };
								permRoles.push(permRole);
								var usersToInsert = new Array();
								var usersToInsertNames = new Array();
								var usersToUpdate = new Array();
								var usersToUpdateNames = new Array();
								//var start						= new Date().getTime();
								//var end 						= new Date().getTime();
								//var timelimit				= 10000;
								//var counter					= 0;
								//res.writeHead(200, JSON.stringify({
								//	'Content-Type': 'application/json'
								//}));
								usersReq.forEach(function(val) {
									//console.time("concatenation");
									objOrg = orgs.find(function(objOrg) {return objOrg.name === val.org; });
									objOrgUnit = orgUnits.find(function(objOrgUnit) {return  objOrgUnit.name === val.orgUnit && objOrgUnit.org.name === val.org; });
									var orgStatus = 'ok';
									var orgUnitStatus = 'ok';
									var rolesStatus = 'ok';
									if(!objOrg) { // si la organización es válida
										orgStatus = 'Not found or not available';
										status = 'Some errors found';
									}
									if(!objOrgUnit) { // si la orgUnit es válida
										orgUnitStatus = 'Not found';
										status = 'Some errors found';
									}
									if(val.roles && (val.roles.isAdmin || val.roles.isOrg || val.roles.isBusiness)) {
										rolesStatus = 'Assigning this role is not allowed';
										status = 'Some errors found';
									}
									if(status === 'Some errors found') {
										if(val.roles) {
											failed.push({ name: val.name, nStat: 'ok', org: val.org, oStat: orgStatus, orgUnit: val.orgUnit, ouStat: orgUnitStatus, roles: val.roles, rolesStatus: rolesStatus });
										} else {
											failed.push({ name: val.name, nStat: 'ok', org: val.org, oStat: orgStatus, orgUnit: val.orgUnit, ouStat: orgUnitStatus });
										}
										status = 'ok';
									} else {
										var permUsers = new Array();
										var permUser = { name: key_user.name, canRead: true, canModify: true, canSec: true };
										permUsers.push(permUser);
										permUser = { name: val.name, canRead: true, canModify: true, canSec: false };
										permUsers.push(permUser);
										var permOrgs = new Array();
										var permOrg = { name: val.org, canRead: true, canModify: true, canSec: false };
										permOrgs.push(permOrg);
										val.perm = { users: permUsers, roles: permRoles, orgs: permOrgs };
										const date = new Date();
										const mod = {
											by: key_user.name,
											when: date,
											what: 'User creation'
										};
										val.mod = new Array();
										val.mod.push(mod);
										val.org = objOrg._id;
										val.orgUnit = objOrgUnit._id;
										var roles = {};
										if(val.roles) { roles = val.roles; }
										val.roles = addRoles();
										if(val.roles) {
											if(roles.isOrgContent) 	{val.roles.isOrgContent = true; }
											if(roles.isAuthor		 ) 	{val.roles.isAuthor = true;			}
											if(roles.isInstructor) 	{val.roles.isInstructor = true; }
											if(roles.isSupervisor) 	{val.roles.isSupervisor = true; }
										}
										var admin = {
											isActive: true,
											isVerified: false,
											recoverString: '',
											passwordSaved: '',
											adminCreate: true
										};
										val.admin = admin;

										if(val.name !== val.person.email) {
											val.name === val.person.email;
										}
										if(val.person.name) { val.person.name = properCase(val.person.name); }
										if(val.person.fatherName) { val.person.fatherName = properCase(val.person.fatherName); }
										if(val.person.motherName) { val.person.motherName = properCase(val.person.motherName); }
										if(val.password) {
											val.admin.initialPassword = val.password;
											val.password = encryptPass(val.password);
										}
										val.admin.validationString = generate('1234567890abcdefghijklmnopqrstwxyz', 35);
										val.admin.passwordSaved = 'saved';
										usersToInsert.push(val);
										usersToInsertNames.push(val.name);
									}
									//console.timeEnd("concatenation");
									//counter++;
									//end = new Date().getTime();
									//if(end - start > timelimit) {
									//	start = new Date().getTime();
									//	res.write(JSON.stringify({'counter': counter}));
									//}
								});

								User.find({name: {$in: usersToInsertNames}})
									.then((usersFound) => {
										usersFound.forEach(function(val1) {
											usersToInsert.forEach(function(val2,index2) {
												if(val2.name === val1.name) {
													var user = usersToInsert.splice(index2,1);
													user[0]._id = val1._id;
													user[0].mod = val1.mod;
													user[0].admin = val1.admin;
													usersToUpdate.push(user[0]);
													usersToUpdateNames.push(user[0].name);
												}
											});
										});
										if(usersToInsert) {
											/*
											usersToInsert.forEach(function(userToInsert){
												User.create(usersToInsert)
													.then((user) => {
														user.admin.validationString = generate('1234567890abcdefghijklmnopqrstwxyz', 35);
														user.save()
															.then((user) => {
																var link = url + '/userconfirm/' + user.admin.validationString + '/' + user.person.email;
																var templateId = template_user_admin;

																mailjet.sendMail(user.person.email, user.person.name, 'Confirma tu correo electrónico',templateId,link)
																	.catch((err) => {
																		Err.sendError(res,err,'massiveUser_controller','register -- Sending Mail --');
																	});

															})
															.catch((err) => {
																sendError(res,err,'Saving each');
															});
													})
													.catch((err) => {
														sendError(res,err,'Insert Many');
													});

											});
											*/

											User.insertMany(usersToInsert)
												.then(() => {
													usersToInsert.forEach(function(user) {
														var link = url + '/userconfirm/' + user.admin.validationString + '/' + user.person.email;
														var templateId = template_user_admin;

														mailjet.sendMail(user.person.email, user.person.name, 'Confirma tu correo electrónico',templateId,link)
															.catch((err) => {
																Err.sendError(res,err,'massiveUser_controller','register -- Sending Mail --');
															});

													});
												})
												.catch((err) => {
													sendError(res,err,'Insert Many');
												});

											numUsers.inserted = usersToInsert.length;
										}
										if(usersToUpdate) {
											usersToUpdate.forEach(function(userToUpdate) {
												delete userToUpdate.perm;
												const date = new Date();
												const mod = {
													by: key_user.name,
													when: date,
													what: 'Massive User Modification'
												};
												userToUpdate.mod.push(mod);
												/*
												if(userToUpdate.password) {
													userToUpdate.password = encryptPass(userToUpdate.password);
													userToUpdate.admin.passwordSaved = 'saved';
												}
												*/
												delete userToUpdate.password;
												User.update({_id: userToUpdate._id}, {$set: userToUpdate})
													.catch((err) => {
														sendError(res,err,'User update');
													});
											});
											numUsers.updated = usersToUpdate.length;
										}
										numUsers.failed = failed.length;
										var result = numUsers;
										result.details = failed;
										res.status(200);
										res.json({
										//res.end(JSON.stringify({
											'status': 200,
											'message': result
										//}));
										});
									})
									.catch((err) => {
										sendError(res,err,'Users found');
									});
							})
							.catch((err) => {
								sendError(res,err,'orgUnits');
							});
					})
					.catch((err) => {
						sendError(res,err,'orgs');
					});
			} else {
				res.status(403);
				res.json({
					'status': 403,
					'message': 'User not authorized'
				});
			}
		}
	}, // massiveRegister

	mur(req,res) {
		// Se genera este nuevo API que tiene la misma funcionalidad del massiveRegister
		// pero armado desde otra perspectiva y considerando varios puntos de vista
		const key_user 	= res.locals.user;
		var usersReq 		= req.body.users;
		var orgReq 			= key_user.org.name;
		var orgUnitReq	= key_user.orgUnit.name;
		if (req.body.org) 		{ orgReq 			= req.body.org; 		}
		if (req.body.orgUnit) { orgUnitReq 	= req.body.orgUnit; }
		var users = {
			requested: usersReq.length
		};
		Promise.all([
			Org.findOne({name: orgReq}).lean(),
			OrgUnit.findOne({name: orgUnitReq}).lean()
		])
			.then((results) => {
				if(results && results.length > 0){
					var [org,orgUnit] = results;
					if(org) {
						if(orgUnit){
							var usersProcessed = [];
							var usersIds = [];
							var errors = 0;
							var permRoles = [];
							var permRole = { name: 'isAdmin', canRead: true, canModify: true, canSec: true };
							permRoles.push(permRole);
							permRole = { name: 'isOrg', canRead: true, canModify: true, canSec: true };
							permRoles.push(permRole);
							permRole = { name: 'isSupervisor', canRead: true, canModify: true, canSec: true };
							permRoles.push(permRole);
							usersReq.forEach(user => {
								var permUsers = [];
								var permUser = { name: key_user.name, canRead: true, canModify: true, canSec: true };
								permUsers.push(permUser);
								permUser = { name: user.name, canRead: true, canModify: true, canSec: false };
								permUsers.push(permUser);
								var permOrgs = new Array();
								var permOrg = { name: org.name, canRead: true, canModify: true, canSec: false };
								permOrgs.push(permOrg);
								user.perm = { users: permUsers, roles: permRoles, orgs: permOrgs };
								const date = new Date();
								user.mod = [{
									by: key_user.name,
									when: date,
									what: 'User creation'
								}];
								user.org = org._id;
								user.orgUnit = orgUnit._id;
								user.admin = {
									isActive: true,
									isVerified: false,
									recoverString: '',
									passwordSaved: '',
									adminCreate: true
								};

								if(user.name !== user.person.email) {
									user.name === user.person.email;
								}
								if(user.person.name) { user.person.name = properCase(user.person.name); }
								if(user.person.fatherName) { user.person.fatherName = properCase(user.person.fatherName); }
								if(user.person.motherName) { user.person.motherName = properCase(user.person.motherName); }
								if(user.password) {
									user.admin.initialPassword = user.password;
									user.password = encryptPass(user.password);
								}
								user.admin.validationString = generate('1234567890abcdefghijklmnopqrstwxyz', 35);
								user.admin.passwordSaved = 'saved';
								User.findOne({name: user.name})
									.then((userFound) => {
										if(userFound) {
											delete user.password;
											if(userFound.admin && userFound.admin.initialPassword) {
												delete user.admin.initialPassword;
											}
											delete user.mod;
											user.mod.push({
												by: key_user.name,
												when: date,
												what: 'Massive User Modification'
											});
											User.update({_id: userFound._id}, {$set: user})
												.then(() => {
													usersProcessed.push({
														user	: userFound.name,
														userId: userFound._id,
														status: 'User updated'
													});
													usersIds.push(userFound._id);
												})
												.catch((err) => {
													usersProcessed.push({
														user	: userFound.name,
														userId: userFound._id,
														status: 'Error: ' + err
													});
													errors ++;
												});
										} else {
											User.create(user)
												.then((u) => {
													usersProcessed.push({
														user	: u.name,
														userId: u._id,
														status: 'User created'
													});
													usersIds.push(userFound._id);
												})
												.catch((err) => {
													usersProcessed.push({
														user	: user.name,
														status: 'Error: ' + err
													});
													errors ++;
												});
										}
									})
									.catch((err) => {
										Err.sendError(res,err,'massiveRegister_controller','mur -- finding user --',false,false,user.name);
									});
							});
							res.status(200).json({
								'status': 400,
								'usersProcessed': usersProcessed,
								'usersIds': usersIds
							});
						} else {
							res.status(200).json({
								'status': 400,
								'message': 'Given orgUnit -'+ orgUnitReq +'- not found. Please check'
							});
						}
					} else {
						res.status(200).json({
							'status': 400,
							'message': 'Given Org -'+ orgReq +'- not found. Please check'
						});
					}
				} else {
					res.status(200).json({
						'status': 400,
						'message': 'Given Org or Orgunit not found. Please check'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'massiveRegister_controller','mur -- Promises ORG & ORGUNIT --');
			});
	}, // mur (Massive User Register)


	get(req,res) {
		var query = JSON.parse(req.query.find);
		User.find(query)
			.select('_id')
			.then((users) => {
				if(users && users.length > 0) {
					var send_users = [];
					users.forEach(user => {
						send_users.push(user._id);
					});
					res.status(200).json({
						'status'	: 200,
						'usersNum': users.length,
						'usersArray': send_users,
						'users'		: users
					});
				} else {
					res.status(200).json({
						'status'	: 200,
						'message'	: 'No users found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'orgs');
			});
	}
};

// Private Functions

function properCase(obj) {
	var name = new String(obj);
	var newName = new String();
	var nameArray = name.split(' ');
	var arrayLength = nameArray.length - 1;
	nameArray.forEach(function(word,i) {
		word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		if(i === arrayLength) { newName += word; } else { newName += word + ' '; }
	});
	return newName;
}

function addRoles() {
	return {
		isAdmin: false,
		isBusiness: false,
		isOrg: false,
		isOrgContent: false,
		isAuthor: false,
		isInstructor: false,
		isSupervisor: false
	};
}

function encryptPass(obj) {
	var salt = bcrypt.genSaltSync(10);
	obj = bcrypt.hashSync(obj, salt);
	return obj;
}

function sendError(res, err, section) {
	logger.error('MassiveUsers Controller -- Section: ' + section + '----');
	logger.error(err);
	res.status(500).json({
		'status': 500,
		'message': 'Error',
		'Error': err
	});
	return;
}
