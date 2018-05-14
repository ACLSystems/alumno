const winston = require('winston');
const User = require('../src/users');
const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
//const generate = require('nanoid/generate');
//const moment = require('moment');
const bcrypt = require('bcrypt-nodejs');
const mailjet = require('../shared/mailjet');
const generate = require('nanoid/generate');
const Err = require('../controllers/err500_controller');
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

const url 								= process.env.LIBRETA_URI;
const template_user				= 310518; // plantilla para el usuario que se registra por su cuenta
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
			//console.log(searchO); // eslint-disable-line
			if(key_user.roles.isAdmin || key_user.roles.isOrg) {
				Org.find(searchO, {name: true})
					.then((orgs) => {
						if(key_user.roles.isOrg && !key_user.roles.isAdmin) {
							searchOU = { org: orgs[0]._id };
						}
						//console.log(searchOU); // eslint-disable-line
						OrgUnit.find(searchOU)
							.populate('org')
							.then((orgUnits) => {
								//console.log(orgs); // eslint-disable-line
								//console.log(orgUnits); // eslint-disable-line
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
								/*
								console.log('ORGS ----------'); // eslint-disable-line
								console.log(orgs); // eslint-disable-line
								console.log('ORG UNITS -----'); // eslint-disable-line
								console.log(orgUnits); // eslint-disable-line
								*/
								usersReq.forEach(function(val) {
									//console.log(val); // eslint-disable-line
									objOrg = orgs.find(function(objOrg) {return objOrg.name === val.org; });
									objOrgUnit = orgUnits.find(function(objOrgUnit) {return  objOrgUnit.name === val.orgUnit && objOrgUnit.org.name === val.org; });
									//console.log(objOrg); // eslint-disable-line
									//console.log(objOrgUnit); // eslint-disable-line
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
										usersToInsert.push(val);
										usersToInsertNames.push(val.name);
									}
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
											usersToInsert.forEach(function(usersToInsert){
												User.create(usersToInsert)
													.then((user) => {
														user.admin.validationString = generate('1234567890abcdefghijklmnopqrstwxyz', 35);
														user.save()
															.then((user) => {
																var link = url + '/userconfirm/' + user.admin.validationString + '/' + user.person.email;
																var templateId = template_user_admin;
																/*
																mailjet.sendMail(user.person.email, user.person.name, 'Confirma tu correo electrónico',templateId,link)
																	.catch((err) => {
																		Err.sendError(res,err,'massiveUser_controller','register -- Sending Mail --');
																	});
																	*/
															})
															.catch((err) => {
																sendError(res,err,'Saving each');
															});
													})
													.catch((err) => {
														sendError(res,err,'Insert Many');
													});
											});
											/*
											User.insertMany(usersToInsert)
												.catch((err) => {
													sendError(res,err,'Insert Many');
												});
												*/
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
												if(userToUpdate.password) {
													userToUpdate.password = encryptPass(userToUpdate.password);
													userToUpdate.admin.passwordSaved = 'saved';
												}
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
											'status': 200,
											'message': result
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
	}, // MassiveUsers

	get(req,res) {
		var query = req.query.find;
		User.find(query)
			.select('_id')
			.then((users) => {
				if(users && users.length > 0) {
					res.status(200).json({
						'users': users
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
	logger.info('MassiveUsers Controller -- Section: ' + section + '----');
	logger.info(err);
	res.status(500).json({
		'status': 500,
		'message': 'Error',
		'Error': err
	});
	return;
}
