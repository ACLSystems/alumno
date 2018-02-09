const winston = require('winston');
const User = require('../src/users');
const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
const generate = require('nanoid/generate');
//const moment = require('moment');
const permissions = require('../shared/permissions');
const mailjet = require('../shared/mailjet');
require('winston-daily-rotate-file');

const url = 'https://alumno.sloppy.zone/api/user/confirmuser?';


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
		var key = '';
		if(req.headers.key) {
			key = req.headers.key;
		} else {
			key = req.body.name;
		}
		var userProps = req.body;
		if(userProps.name !== userProps.person.email) { // que el nombre de usuario sera igual a su correo
			userProps.name = userProps.person.email;
		}
		Org.findOne({ name: userProps.org }, { name: true } ) // buscar organización
			.then((org) => {
				if (!org) {							// si no existe organización le damos el bastonazo
					res.status(404).json({
						'status': 404,
						'message': 'Error: Org -' + userProps.org + '- does not exist'
					});
				} else {				// buscar unidad org
					OrgUnit.findOne({$or: [{ name: userProps.orgUnit}, {longName: userProps.orgUnit}]})
						.then((ou) => {
							if (!ou) {			// si no hay ou, lo mismo
								res.status(404).json({
									'status': 404,
									'message': 'Error: OU -' + userProps.orgUnit + '- does not exist'
								});
							} else {
								var admin = {
									isActive: true,
									isVerified: false,
									recoverString: '',
									passwordSaved: '',
									adminCreate: false
								};
								if(userProps.name !== key) {
									admin.adminCreate = true;
								}
								userProps.admin = admin;
								var permUsers = new Array();
								var permUser = { name: userProps.name, canRead: true, canModify: true, canSec: false };
								permUsers.push(permUser);
								if (userProps.name !== key) {
									permUser = { name: key, canRead: true, canModify: true, canSec: false };
									permUsers.push(permUser);
								}
								var author = userProps.name;
								author = key;
								var permRoles = new Array();
								var permRole = { name: 'isAdmin', canRead: true, canModify: true, canSec: true };
								permRoles.push(permRole);
								permRole = { name: 'isOrg', canRead: true, canModify: true, canSec: true };
								permRoles.push(permRole);
								var permOrgs = new Array();
								const permOrg = { name: userProps.org, canRead: true, canModify: true, canSec: false };
								permOrgs.push(permOrg);
								userProps.perm = { users: permUsers, roles: permRoles, orgs: permOrgs };
								userProps.org = org._id;
								userProps.orgUnit = ou._id;
								const date = new Date();
								const mod = {
									by: author,
									when: date,
									what: 'User creation'
								};
								userProps.mod = new Array();
								userProps.mod.push(mod);
								// User Create
								User.create(userProps)
									.then((user) => {
										user.admin.validationString = generate('1234567890abcdefghijklmnopqrstwxyz', 35);
										user.admin.adminCreate = false;
										user.save()
											.then((user) => {
												const link = url + 'email=' + user.person.email + '&token=' + user.admin.validationString;
												mailjet.sendMail(user.person.email, user.person.name, 'Confirma tu correo electrónico',310518,link)
													.then(() => {
														res.status(201).json({
															'status': 201,
															'message': 'User - ' + userProps.name + '- created',
															'uri': link
														});
													})
													.catch((err) => {
														sendError(res,err,'register -- Sending Mail --');
													});
											})
											.catch((err) => {
												sendError(res,err,'register -- Saving User validation String --');
											});
									})
									.catch((err) => {
										var errString = err.toString();
										var re = new RegExp('duplicate key error collection');
										var found = errString.match(re);
										if(found) {
											/*
											res.status(406).json({
												'status': 406,
												'message': 'Error: user -' + userProps.name + '- or email: -'+ userProps.person.email + '- already exists'
											});
											*/
											User.findOne({$or:[{name: userProps.name},{'person.email': userProps.person.email}]})
												.then((user) => {
													if(user.admin && user.admin.adminCreate) {
														user.admin.validationString = generate('1234567890abcdefghijklmnopqrstwxyz', 35);
														user.admin.adminCreate = false;
														user.mod.push({
															by: author,
															when: date,
															what: 'User completed registration'
														});
														user.org = userProps.org;
														user.orgUnit = userProps.ou;
														user.password = userProps.password;
														user.person = userProps.person;
														if(userProps.student) {
															user.student = userProps.student;
														}
														user.save()
															.then((user) => {
																const link = url + 'email=' + user.person.email + '&token=' + user.admin.validationString;
																mailjet.sendMail(user.person.email, user.person.name, 'Confirma tu correo electrónico',310518,link)
																	.then(() => {
																		res.status(201).json({
																			'status': 201,
																			'message': 'User - ' + userProps.name + '- created',
																			'uri': link
																		});
																	})
																	.catch((err) => {
																		res.status(201).json({
																			'status': 201,
																			'message': 'Register was sucessfully done, but email was not send'
																		});
																		sendError(res,err,'register -- Sending Mail --',true);
																	});
															})
															.catch((err) => {
																sendError(res,err,'register -- Saving User validation String --');
															});
													} else {
														res.status(406).json({
															'status': 406,
															'message': 'You have already been registered previously'
														});
													}
												})
												.catch((err) => {
													sendError(res,err,'register -- Finding User --');
												});
										} else {
											sendError(res,err,'register -- User create --');
										}
									});
								// User Create
							}
						})
						.catch((err) => {
							sendError(res,err,'register -- Finding orgUnit --');
						});
				}
			})
			.catch((err) => {
				sendError(res,err,'register -- Finding org --');
			});
	},

	confirm(req,res) {
		const email = req.query.email;
		const token = req.query.token;
		User.findOne({'person.email': email})
			.then((user) => {
				if(token === user.admin.validationString){
					user.admin.isVerified = true;
					user.save()
						.then(() => {
							res.status(200).json({
								'status': 200,
								'message': 'User -'+ user.person.email + '- verified'
							});
						})
						.catch((err) => {
							sendError(res,err,'confirmUser -- Saving User Status --');
						});
				} else {
					res.status(406).json({
						'status': 406,
						'message': 'Token is not valid. Please verify'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'confirmUser -- Finding Email --');
			});
	},

	//getDetails(req, res, next) {
	getDetails(req, res) {
		const key = req.headers.key;
		const username = req.query.name;
		User.findOne({ name: key })
			.populate('org','name')
			.populate('orgUnit','name')
			.then((key_user) => {
				User.findOne({ name: username })
					.populate('org','name')
					.populate('orgUnit', 'name')
					.then((user) => {
						if (!user) {
							res.status(404).json({
								'status': 404,
								'message': 'User -' + username + '- does not exist'
							});
						} else {
							const result = permissions.access(key_user,user,'user');
							//console.log(result); // eslint-disable-line
							if(result.canRead) {
								var send_user = {
									name: user.name,
									org: user.org.name,
									orgUnit: user.orgUnit.name,
								};
								if(user.person) {
									send_user.person = {
										name: user.person.name,
										fatherName: user.person.father,
										motherName: user.person.motherName,
										email: user.person.email,
										birthDate: user.person.birthDate
									};
								}
								res.status(200).json(send_user);
							} else {
								res.status(403).json({
									'status': 403,
									'message': 'User ' + key_user.name + ' not authorized on user ' + user.name
								});
							}
						}
					})
					.catch((err) => {
						sendError(res,err,'getDetails -- Finding User --');
					});
			})
			.catch((err) => {
				sendError(res,err,'getDetails -- Finding key User --');
			});
	},

	getRoles(req, res) {
		const key = req.headers.key;
		const username = req.headers['name'] || (req.query && req.query.name);
		User.findOne({ name: key })
			.populate('org','name')
			.populate('orgUnit','name')
			.then((key_user) => {
				if(key_user.roles.isAdmin || (key_user.roles.isOrg)) {
					User.findOne({ name: username })
						.populate('org','name')
						.populate('orgUnit', 'name')
						.then((user) => {
							if (!user) {
								res.status(404).json({
									'status': 404,
									'message': 'User -' + username + '- does not exist'
								});
							} else {
								//console.log(key_user); // eslint-disable-line
								//console.log(user); // eslint-disable-line
								const result = permissions.access(key_user,user,'user');
								if(result.canRead) {
									var send_user = {
										name: user.name,
										org: user.org.name,
										orgUnit: user.orgUnit.name,
									};
									if(user.roles) {
										if(key_user.roles.isAdmin) {
											send_user.roles = {
												isAdmin: user.roles.isAdmin,
												isBusiness: user.roles.isBusiness,
												isOrg: user.roles.isOrg,
												isOrgContent: user.roles.isOrgContent,
												isAuthor: user.roles.isAuthor,
												isInstructor: user.roles.isInstructor,
												isSupervisor: user.roles.isSupervisor
											};
										}	else {
											send_user.roles = {
												isOrgContent: user.roles.isOrgContent,
												isAuthor: user.roles.isAuthor,
												isInstructor: user.roles.isInstructor,
												isSupervisor: user.roles.isSupervisor
											};
										}
										res.status(200).json({
											'status' : 200,
											'message' : send_user
										});
									} else {
										res.status(404).json({
											'status': 404,
											'message': 'Something is wrong: User ' + user.name + ' has no roles (what!!!?). Please check with Administrator'
										});
									}
								} else {
									res.status(403).json({
										'status': 403,
										'message': 'User ' + key + ' not authorized'
									});
								}
							}
						})
						.catch((err) => {
							sendError(res,err,'getDetails -- Finding User --');
						});
				} else {
					res.status(403).json({
						'status': 403,
						'message': 'Only admins can view or change roles'
					});
				}
			}) //key_user
			.catch((err) => {
				sendError(res,err,'getDetails -- Finding key User --');
			});
	},

	setRoles(req, res) {
		const key = req.headers.key;
		const userProps = req.body;
		User.findOne({ name: key })
			.populate('org','name')
			.populate('orgUnit','name')
			.then((key_user) => {
				if(key_user.roles.isAdmin || (key_user.roles.isOrg)) {
					User.findOne({ name: userProps.name })
						.populate('org','name')
						.populate('orgUnit', 'name')
						.then((user) => {
							if (!user) {
								res.status(404).json({
									'status': 404,
									'message': 'User -' + userProps.name + '- does not exist'
								});
							} else {
								if(key_user.org.name === user.org.name && !key_user.roles.isAdmin) {
									res.status(406).json({
										'status': 406,
										'message': 'User ' + key_user.name + ' cannot modify roles for ' + user.name + '. They do not belong the same org.'
									});
								} else {
									if(user.roles) {
										if(key_user.roles.isAdmin) {
											if(userProps.roles.isAdmin !== undefined ) { user.roles.isAdmin = userProps.roles.isAdmin; }
											if(userProps.roles.isOrg !== undefined ) { user.roles.isOrg = userProps.roles.isOrg; }
											if(userProps.roles.isBusiness !== undefined ) { user.roles.isBusiness = userProps.roles.isBusiness; }
										}
										if(userProps.roles.isOrgContent !== undefined ) { user.roles.isOrgContent = userProps.roles.isOrgContent; }
										if(userProps.roles.isAuthor !== undefined ) { user.roles.isAuthor = userProps.roles.isAuthor; }
										if(userProps.roles.isInstructor !== undefined ) { user.roles.isInstructor = userProps.roles.isInstructor; }
										if(userProps.roles.isSupervisor  !== undefined ) { user.roles.isSupervisor = userProps.roles.isSupervisor; }
										user.save().catch((err) => {
											sendError(res,err,'setRoles -- Saving User--');
										});
										res.status(200).json({
											'status': 200,
											'message': 'Roles for ' + user.name + ' have been modified'
										});
									} else {
										res.status(404).json({
											'status': 404,
											'message': 'Something is wrong: User ' + user.name + ' has no roles (what!!!?). Please check with Administrator'
										});
									}
								}
							}
						})
						.catch((err) => {
							sendError(res,err,'setRoles -- Finding User to set--');
						});
				} else {
					res.status(403).json({
						'status': 403,
						'message': 'Only admins can view or change roles'
					});
				}
			}) //key_user
			.catch((err) => {
				sendError(res,err,'setRoles -- Finding key User --');
			});
	},

	//validateEmail(req, res, next) {
	validateEmail(req, res) {
		const email = (req.body && req.body.email);
		User.findOne({ 'person.email': email})
			.then((user) => {
				if(user) {
					var emailID = generate('1234567890abcdefghijklmnopqrstwxyz', 35);
					user.admin.recoverString = emailID;
					const link = url + 'email=' + user.person.email + '&token=' + user.admin.validationString;
					mailjet.sendMail(user.person.email, user.person.name, 'Solicitud de recuperación de contraseña',311647,link);
					user.save();
					res.status(200).json({
						'status': 200,
						'message': 'Email found',
						'id': emailID
					});
				} else {
					res.status(404);
					res.json({
						'status': 404,
						'message': 'Email ' + email + 'does not exist'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'validateEmail -- Finding email --');
			});
	},

	passwordRecovery(req, res) {
		const email = (req.body && req.body.email);
		const emailID = (req.body && req.body.emailID);
		const password = (req.body && req.body.password);
		User.findOne({ 'person.email': email})
			.then((user) => {
				if(user) {
					if(emailID === user.admin.recoverString) {
						user.admin.recoverString = '';
						user.password = password;
						user.save()
							.then(() => {
								res.status(200).json({
									'status': 200,
									'message': 'Password recovery sucessfully'
								});
							})
							.catch((err) => {
								sendError(res,err,'passwordRecovery -- Saving User --');
							});
					} else {
						res.status(404).json({
							'status': 404,
							'message': 'Token ID is not valid and we cannot proceed with password recovery. Please try again.'
						});
					}
				} else {
					res.status(404);
					res.json({
						'status': 404,
						'message': 'Email ' + email + 'does not exist'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'passwordRecovery -- Finding user --');
			});
	},

	//passwordChange(req, res, next) {
	passwordChange(req, res) {
		const key = req.headers.key;
		const userProps = req.body;
		User.findOne({ name: key })
			.populate('org','name')
			.populate('org','name')
			.then((key_user) => {
				User.findOne({ 'name': userProps.name })
					.then((user) => {
						if(user) {
							user.admin.passwordSaved = '';
							const date = new Date();
							var mod = {
								by: user.name,
								when: date,
								what: 'Password modified'
							};
							user.mod.push(mod);
							const result = permissions.access(key_user,user,'user');
							if(result.canModify) {
								user.save().catch((err) => {
									sendError(res,err,'passwordChange -- Saving User--');
								});
								res.status(200);
								res.json({
									'status': 200,
									'message': 'Password modified'
								});
							} else {
								res.status(403).json({
									'status': 403,
									'message': 'User ' + key + ' not authorized'
								});
							}
						} else {
							res.status(404).json({
								'status': 404,
								'message': 'User not found'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'passwordChange -- Finding User --');
					});
			})
			.catch((err) => {
				sendError(res,err,'passwordChange -- Finding key User --');
			});
	},

	//modify(req, res, next) {
	modify(req, res) {
		var key = req.headers.key;
		const userProps = req.body;
		userProps.person.name = properCase(userProps.person.name);
		userProps.person.fatherName = properCase(userProps.person.fatherName);
		userProps.person.motherName = properCase(userProps.person.motherName);
		//var birthDate = moment.utc(userProps.person.birthDate);
		//userProps.person.birthDate = birthDate.toDate();

		User.findOne({ name: key })
			.populate('org','name')
			.populate('org','name')
			.then((key_user) => {
				User.findOne({ 'name': userProps.name })
					.then((user) => {
						const result = permissions.access(key_user,user,'user');
						if(result.canModify) {
							const date = new Date();
							const mod = {
								by: key,
								when: date,
								what: 'User modification'
							};
							user.mod.push(mod);
							user.save().catch((err) => {
								sendError(res,err,'modify -- Saving User--');
							});
							res.status(200);
							res.json({
								'status':200,
								'message': 'User properties modified'
							});
						} else {
							res.status(403);
							res.json({
								'status': 403,
								'message': 'User ' + key + ' not authorized'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'modify -- Finding User to modify --');
					});
			})
			.catch((err) => {
				sendError(res,err,'modify -- Finding Key User --');
			});
	}, // Modify

	list(req,res) {
		const key = (req.query && req.query.x_key) || req.headers.key;
		var sort = { name: 1 };
		var skip = 0;
		var limit = 15;
		var query = {};
		var listing = '';
		if(req.query.sort) { sort = { name: req.query.sort }; }
		if(req.query.skip) { skip = parseInt( req.query.skip ); }
		if(req.query.limit) { limit = parseInt( req.query.limit ); }
		if(req.query.query) { query = JSON.parse(req.query.query); }
		if(req.query.listing) { listing = req.query.listing; }
		User.findOne({ name: key })
			.populate('org')
			.then((key_user) => {
				if(!key_user.roles.isAdmin && key_user.roles.isOrg) {
					query.org = key_user.org._id;
					User.find(query)
						.sort(sort)
						.skip(skip)
						.limit(limit)
						.then((users) => {
							let usersCount = users.length;
							var message = '';
							if(usersCount === 1) {
								message = '1 user found from -' + key_user.org.name + '-';
							} else if (usersCount === 0) {
								message = 'no users found from -' + key_user.org.name + '-';
							} else {
								message = usersCount + ' users found from -' + key_user.org.name + '-';
							}
							var users_send = new Array();
							users.forEach(function(user) {
								users_send.push({
									id: user._id,
									name: user.name,
									person: user.person,
									student: user.student,
									orgUnit: user.orgUnit
								});
							});
							res.status(200).json({
								'status': 200,
								'message': message,
								'usersCount': usersCount,
								'users': users_send
							});
						})
						.catch((err) => {
							sendError(res,err,'list -- Finding Users list (isOrg) --');
						});
				}
				if(key_user.roles.isAdmin) {
					if(req.query && req.query.org) {
						Org.findOne({ name: req.query.org })
							.then((org) => {
								User.find({ org: org._id })
									.sort(sort)
									.skip(skip)
									.limit(limit)
									.then((users) => {
										//var total = 0;
										let usersCount = users.length;
										var message = '';
										if(usersCount === 1) {
											message = '1 user found from -' + org.name + '-';
										} else if (usersCount === 0) {
											message = 'no users found from -' + org.name + '-';
										} else {
											message = usersCount + ' users found from -' + org.name + '-';
										}
										if(listing === 'basic') {
											var send_users = new Array();
											users.forEach(function(u) {
												send_users.push({
													'name': u.name
												});
												res.status(200).json({
													'status': 200,
													'message': message,
													'usersCount': usersCount,
													'users': send_users
												});
											});
										} else {
											res.status(200).json({
												'status': 200,
												'message': message,
												'usersCount': usersCount,
												'users': users
											});
										}
									})
									.catch((err) => {
										sendError(res,err,'list -- Finding Users list (isAdmin) --');
									});
							})
							.catch((err) => {
								sendError(res,err,'list -- Finding Org --');
							});
					} else {
						res.status(406).json({
							'status': 406,
							'message': 'Please provide -org- in params'
						});
					}
				}
			})
			.catch((err) => {
				sendError(res,err,'list -- Finding Key User --');
			});
	}, //list

	count(req,res) {
		const key = (req.query && req.query.x_key) || req.headers.key;
		User.findOne({ name: key })
			.populate('org')
			.then((key_user) => {
				if(key_user.roles.isAdmin) {
					if(req.query && req.query.org) {
						Org.findOne({ name: req.query.org })
							.then((org) => {
								User.count({ org: org._id }, function(err,count) {
									res.status(200).json({
										'status': 200,
										'message': count + ' total users found from ' + org.name,
										'count':count
									});
								});
							})
							.catch((err) => {
								sendError(res,err,'list -- Finding Org isAdmin --');
							});
					} else {
						res.status(406).json({
							'status': 406,
							'message': 'Please provide -org- in params'
						});
					}
				}
				if(key_user.roles.isOrg && !key_user.roles.isAdmin){
					Org.findOne({ org: key_user.org._id})
						.then((org) => {
							User.count({ org: key_user.org._id }, function(err,count) {
								res.status(200).json({
									'status': 200,
									'message': count + ' total users found from ' + org.name,
									'count': count
								});
							});
						})
						.catch((err) => {
							sendError(res,err,'list -- Finding Org isOrg --');
						});
				}
			})
			.catch((err) => {
				sendError(res,err,'total -- Finding Key User --');
			});
	}
};

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

function sendError(res, err, section, send_status) {
	logger.info('User controller -- Section: ' + section + '----');
	logger.info(err);
	if(!send_status) {
		res.status(500).json({
			'status': 500,
			'message': 'Error',
			'Error': err.message
		});
	}
	return;
}
