//const winston = require('winston');
const User = require('../src/users');
const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
const generate = require('nanoid/generate');
const bcrypt = require('bcrypt-nodejs');
//const moment = require('moment');
const Err = require('../controllers/err500_controller');
const permissions = require('../shared/permissions');
const mailjet = require('../shared/mailjet');
const Roster = require('../src/roster');
//require('winston-daily-rotate-file');

const url 								= process.env.LIBRETA_URI;
const template_user				= 310518; // plantilla para el usuario que se registra por su cuenta
const template_user_admin = 339990; // plantilla para el usuario que es registrado por el administrador

/*
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
*/

module.exports = {
	//register(req, res, next) {
	register(req, res) {
		var key = '';
		const key_user 	= res.locals.user;
		if(res.locals.user && res.locals.user.name) {
			key = key_user.name;
			//console.log('key: '+ key_user.name);
		} else {
			key = req.body.name;
			//console.log('req: '+ req.body.name);
		}


		var userProps = req.body;
		var adminCreate = false;
		if(userProps.name !== key) {
			adminCreate = true;
		}
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
								if(adminCreate) {
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
								if(userProps.student && userProps.student.type === 'internal') {
									delete userProps.student.external;
									delete userProps.student.origin;
								}
								// User Create
								User.create(userProps)
									.then((user) => {
										user.admin.validationString = generate('1234567890abcdefghijklmnopqrstwxyz', 35);
										user.save()
											.then((user) => {
												var link = url + '/confirm/' + user.admin.validationString + '/' + user.person.email + '/' + user.person.name + '/' + user.person.fatherName + '/' + user.person.motherName;
												var templateId = template_user;
												if(adminCreate) {
													link = url + '/userconfirm/' + user.admin.validationString + '/' + user.person.email + '/' + user.person.name + '/' + user.person.fatherName + '/' + user.person.motherName;
													templateId = template_user_admin;
												}
												mailjet.sendMail(user.person.email, user.person.name, 'Confirma tu correo electrónico',templateId,link)
													.then(() => {
														res.status(201).json({
															'status': 201,
															'message': 'User - ' + userProps.name + '- created',
															'userid': user._id,
															'uri': link
														});
													})
													.catch((err) => {
														Err.sendError(res,err,'user_controller','register -- Sending Mail --');
													});
											})
											.catch((err) => {
												Err.sendError(res,err,'user_controller','register -- Saving User validation String --');
											});
									})
									.catch((err) => {
										var errString = err.toString();
										var re = new RegExp('duplicate key error collection');
										var found = errString.match(re);
										if(found) {
											User.findOne({$or:[{name: userProps.name},{'person.email': userProps.person.email}]})
												.then((user) => {
													if(user.admin && user.admin.adminCreate) {
														user.admin.validationString = generate('1234567890abcdefghijklmnopqrstwxyz', 35);
														user.admin.adminCreate = false;
														user.mod.push({
															by: author,
															when: date,
															what: 'User tries to register again'
														});
														/*
														user.org = userProps.org;
														user.orgUnit = userProps.ou;
														user.admin.isVerified = true;
														user.admin.validationString = '';
														user.admin.adminCreate = false;
														user.admin.passwordSaved = 'saved';
														user.password = userProps.password;
														user.person = userProps.person;
														if(userProps.student) {
															user.student = userProps.student;
														}

														user.save()
															.then((user) => {
															*/
														const link = url + 'email=' + user.person.email + '&token=' + user.admin.validationString;
														mailjet.sendMail(user.person.email, user.person.name, 'Confirma tu correo electrónico',template_user,link)
															.then(() => {
																res.status(201).json({
																	'status': 201,
																	'message': 'You have already been registered previously. New email for user - ' + userProps.name + '- send. New validation string created',
																	'uri': link
																});
															})
															.catch((err) => {
																res.status(201).json({
																	'status': 201,
																	'message': 'Re-register done, but email was not send'
																});
																Err.sendError(res,err,'user_controller','register -- Sending Mail --',true);
															});
														/*
															})
															.catch((err) => {
																Err.sendError(res,err,'user_controller','register -- Saving User validation String --');
															});
															*/
													} else {
														res.status(406).json({
															'status': 406,
															'message': 'You have already been registered previously'
														});
													}
												})
												.catch((err) => {
													Err.sendError(res,err,'user_controller','register -- Finding User --');
												});
										} else {
											Err.sendError(res,err,'user_controller','register -- User create --');
										}
									});
								// User Create
							}
						})
						.catch((err) => {
							Err.sendError(res,err,'user_controller','register -- Finding orgUnit --');
						});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'user_controller','register -- Finding org --');
			});
	},

	confirm(req,res) {
		const email 		= req.query.email;
		const token 		= req.query.token;
		const name 			= req.query.name;
		const fatherName = req.query.fathername;
		const motherName = req.query.mothername;
		var password		= 'empty';
		if(req.query.password) {
			password  = req.query.password;
		}
		User.findOne({name: email})
			.then((user) => {
				if(user) {
					if(token === user.admin.validationString){
						user.admin.isVerified = true;
						user.admin.validationString = '';
						user.admin.adminCreate = false;
						user.admin.passwordSaved = 'saved';
						if(password !== 'empty'){ user.password = encryptPass(password); }
						user.people.name = name;
						user.people.fatherName = fatherName;
						user.people.motherName = motherName;
						user.save()
							.then(() => {
								if(password === 'empty'){
									res.status(200).json({
										'status': 200,
										'message': 'User -'+ user.person.email + '- verified'
									});
								} else {
									res.status(200).json({
										'status': 200,
										'message': 'User -'+ user.person.email + '- verified and password changed'
									});
								}
							})
							.catch((err) => {
								Err.sendError(res,err,'user_controller','confirmUser -- Saving User Status --');
							});
					} else {
						res.status(406).json({
							'status': 406,
							'message': 'Token is not valid. Please verify'
						});
					}
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'Email -'+ email + '- not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'user_controller','confirmUser -- Finding Email --');
			});
	},

	confirmHTML(req,res) {
		const email 		= req.query.email;
		const token 		= req.query.token;
		var password		= 'empty';
		if(req.query.password) {
			password  = req.query.password;
		}
		User.findOne({name: email})
			.then((user) => {
				if(user) {
					if(token === user.admin.validationString){
						user.admin.isVerified = true;
						user.admin.validationString = '';
						user.admin.adminCreate = false;
						user.admin.passwordSaved = 'saved';
						if(password !== 'empty'){ user.password = encryptPass(password); }
						user.save()
							.then(() => {
								res.status(200).send(
									'<!DOCTYPE html><html><head><meta http-equiv=Refresh content="3;url=https://conalepvirtual.superatemexico.com"></head><body><p>Gracias por su registro. Espere unos instantes mientras carga la página.</p</body></html>'
								);
							})
							.catch((err) => {
								Err.sendError(res,err,'user_controller','confirmUser -- Saving User Status --');
							});
					} else {
						res.status(406).json({
							'status': 406,
							'message': 'Token is not valid. Please verify'
						});
					}
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'Email -'+ email + '- not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'user_controller','confirmUser -- Finding Email --');
			});
	},

	//getDetails(req, res, next) {
	getDetails(req, res) {
		const key_user = res.locals.user;
		const username = req.query.name;
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
							userid	: user._id,
							name		: user.name,
							org			: user.org.name,
							orgid		: user.org._id,
							orgUnit	: user.orgUnit.name,
							ouid		: user.orgUnit._id
						};
						if(user.person) {
							send_user.person = {
								name			: user.person.name,
								fatherName: user.person.fatherName,
								motherName: user.person.motherName,
								email			: user.person.email,
								birthDate	: user.person.birthDate,
								mainPhone	: user.person.mainPhone,
								celPhone	: user.person.celPhone,
								genre 		: user.person.genre,
								alias			: user.person.alias
							};
						}
						if(user.student){
							send_user.student = {
								studentid	: user.student.id,
								career		: user.student.career,
								term			: user.student.term,
								isActive	: user.student.isActive,
								type			: user.student.type
							};
							if(user.student.external) { send_user.student.external 	= user.student.external;}
							if(user.student.origin	) { send_user.student.origin 		= user.student.origin;  }
						}
						if(user.corporate) {
							send_user.corporate = {
								corporateid	: user.corporate.id,
								isActive		: user.corporate.isActive,
								type				: user.corporate.type
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
				Err.sendError(res,err,'user_controller','getDetails -- Finding User -- user: ' + key_user.name);
			});
	}, // getDetails

	getDetailsSuper(req, res) {
		const key_user = res.locals.user;
		const username = req.query.username;
		User.findOne({ name: username })
			.populate('org','name')
			.populate('orgUnit', 'name longName')
			.then((user) => {
				if (!user) {
					res.status(404).json({
						'status': 404,
						'message': 'User -' + username + '- does not exist'
					});
				} else {
					//const result = permissions.access(key_user,user,'user');
					//console.log(result); // eslint-disable-line
					var send_user = {
						username		: user.name,
						org					: user.org.name,
						orgUnit			: user.orgUnit.name,
						orgUnitLong	: user.orgUnit.longName
					};
					if(user.person) {
						send_user.person = {
							name			: user.person.name,
							fatherName: user.person.fatherName,
							motherName: user.person.motherName,
							email			: user.person.email,
							birthDate	: user.person.birthDate,
							mainPhone	: user.person.mainPhone,
							celPhone	: user.person.celPhone,
							genre 		: user.person.genre,
							alias			: user.person.alias
						};
					}
					if(user.student){
						send_user.student = {
							studentid	: user.student.id,
							career		: user.student.career,
							term			: user.student.term,
							isActive	: user.student.isActive,
							type			: user.student.type
						};
						if(user.student.external) { send_user.student.external 	= user.student.external;}
						if(user.student.origin	) { send_user.student.origin 		= user.student.origin;  }
					}
					if(user.corporate) {
						send_user.corporate = {
							corporateid	: user.corporate.id,
							isActive		: user.corporate.isActive,
							type				: user.corporate.type
						};
					}
					res.status(200).json(send_user);
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'user_controller','getDetails -- Finding User -- user: ' + key_user.name);
			});
	}, // getDetails

	getRoles(req, res) {
		const key_user = res.locals.user;
		const username = req.query.name;
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
								'message': 'User ' + key_user.name + ' not authorized'
							});
						}
					}
				})
				.catch((err) => {
					Err.sendError(res,err,'user_controller','getDetails -- Finding User --');
				});
		} else {
			res.status(403).json({
				'status': 403,
				'message': 'Only admins can view or change roles'
			});
		}
	},

	setRoles(req, res) {
		const key_user = res.locals.user;
		const userProps = req.body;
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
									Err.sendError(res,err,'user_controller','setRoles -- Saving User--');
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
					Err.sendError(res,err,'user_controller','setRoles -- Finding User to set--');
				});
		} else {
			res.status(403).json({
				'status': 403,
				'message': 'Only admins can view or change roles'
			});
		}
	},

	//validateEmail(req, res, next) {
	validateEmail(req, res) {
		const email = req.query.email;
		User.findOne({ 'person.email': email})
			.then((user) => {
				if(user) {
					var emailID = generate('1234567890abcdefghijklmnopqrstwxyz', 35);
					user.admin.recoverString = emailID;
					const link = url + '/recover/' + user.admin.recoverString + '/' + user.person.email;
					mailjet.sendMail(user.person.email, user.person.name, 'Solicitud de recuperación de contraseña',311647,link);
					user.save();
					res.status(200).json({
						'status': 200,
						'message': 'Email found',
						'id': emailID,
						'link': link
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
				Err.sendError(res,err,'user_controller','validateEmail -- Finding email --');
			});
	},

	passwordRecovery(req, res) {
		const email = (req.body && req.body.email);
		const emailID = (req.body && req.body.emailID);
		const password = (req.body && req.body.password);
		User.findOne({ name: email})
			.then((user) => {
				if(user) {
					if(emailID === user.admin.recoverString) {
						user.admin.recoverString = '';
						user.admin.isVerified = true;
						user.admin.passwordSaved = 'saved';
						user.password = encryptPass(password);
						user.save()
							.then(() => {
								res.status(200).json({
									'status': 200,
									'message': 'Password recovery sucessfully'
								});
							})
							.catch((err) => {
								Err.sendError(res,err,'user_controller','passwordRecovery -- Saving User --');
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
				Err.sendError(res,err,'user_controller','passwordRecovery -- Finding user --');
			});
	},

	//passwordChange(req, res, next) {
	passwordChange(req, res) {
		const key_user = res.locals.user;
		const password = req.body.password;
		User.findById(key_user._id)
			.then((user) => {
				if(user) {
					user.admin.passwordSaved = 'saved';
					user.password = encryptPass(password);
					const date = new Date();
					var mod = {
						by: user.name,
						when: date,
						what: 'Password modified'
					};
					user.mod.push(mod);
					//const result = permissions.access(key_user,user,'user');
					//if(result.canModify) {
					user.save()
						.then (() => {
							res.status(200).json({
								'status': 200,
								'message': 'Password for user -' + key_user.name + '- modified'
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'user_controller','passwordChange -- Saving User--');
						});
					/*
					} else {
						res.status(403).json({
							'status': 403,
							'message': 'User ' + key_user.name + ' not authorized'
						});
					}
					*/
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'User not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'user_controller','passwordChange -- Finding User --');
			});
	}, //passwordChange

	adminPasswordReset(req, res) {
		const key_user 	= res.locals.user;
		const username 	= req.query.username;
		var query 			= { name: username };
		if(key_user.roles.isOrg && !key_user.roles.isAdmin) {
			query.orgUnit = key_user.orgUnit;
		}
		User.findOne(query)
			.then((user) => {
				if(user) {
					if(user.fiscal && user.fiscal.id) {
						user.admin.passwordSaved = 'saved';
						user.password = encryptPass(user.fiscal.id);
						const date = new Date();
						var mod = {
							by: key_user.name,
							when: date,
							what: 'Password reset'
						};
						user.mod.push(mod);
						//const result = permissions.access(key_user,user,'user');
						//if(result.canModify) {
						user.save()
							.then (() => {
								//mailjet.sendMail(user.person.email, user.person.name, 'Tu contraseña ha sido modificada por el administrador',393450)
								//.then(() => {
								res.status(200).json({
									'status': 200,
									'message': 'Password for user -' + username + '- reset by -' + key_user.name + '-'
								});
								//})
								//.catch((err) => {

								//	Err.sendError(res,err,'user_controller','adminPasswordReset -- Sending email--');
								//});

							})
							.catch((err) => {
								Err.sendError(res,err,'user_controller','adminPasswordReset -- Saving User--');
							});
						/*
						} else {
							res.status(403).json({
								'status': 403,
								'message': 'User ' + key_user.name + ' not authorized'
							});
						}
						*/
					} else {
						res.status(200).json({
							'status': 200,
							'message': 'User does not have fiscal id'
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
				Err.sendError(res,err,'user_controller','passwordChange -- Finding User --');
			});
	}, //adminPasswordChange

	changeUser(req,res) {
		const key_user 	= res.locals.user;
		const username	= req.body.username;
		const newname		= req.body.newname;
		const now = new Date();
		User.findOne({name: username})
			.then((user) => {
				if(user) {
					user.name = newname;
					user.person.email = newname;
					user.perm.users.push({
						name: newname,
						canSec: false,
						canModify: true,
						canRead: true
					});
					user.mod.push({
						by: key_user.name,
						what: 'User change',
						when: now
					});
					//console.log(JSON.stringify(user,null,2));
					user.save()
						.then((user) => {
							res.status(200).json({
								'status': 200,
								'message': user.name
							});
						})
						.catch((err) => {
							var errString = err.toString();
							var re = new RegExp('duplicate key error collection');
							var found = errString.match(re);
							if(found) {
								res.status(200).json({
									'status': 200,
									'message': 'New user is already exists. This must not proceed'
								});
							}
							//Err.sendError(res,err,'user_controller','passwordChange -- Finding User --');
						});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'User not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'user_controller','modify -- Finding User to modify --');
			});
	}, //changeUser

	//modify(req, res, next) {
	modify(req, res) {
		const key_user = res.locals.user;
		const userProps = req.body;
		userProps.person.name = properCase(userProps.person.name);
		userProps.person.fatherName = properCase(userProps.person.fatherName);
		userProps.person.motherName = properCase(userProps.person.motherName);
		//var birthDate = moment.utc(userProps.person.birthDate);
		//userProps.person.birthDate = birthDate.toDate();
		User.findOne({ 'name': userProps.name })
			.then((user) => {
				const result = permissions.access(key_user,user,'user');
				if(result.canModify) {
					const date = new Date();
					const mod = {
						by: key_user.name,
						when: date,
						what: 'User modification'
					};
					user.mod.push(mod);
					user.save().catch((err) => {
						Err.sendError(res,err,'user_controller','modify -- Saving User--');
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
						'message': 'User ' + key_user.name + ' not authorized'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'user_controller','modify -- Finding User to modify --');
			});
	}, // Modify

	list(req,res) {
		const key_user = res.locals.user;
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
					Err.sendError(res,err,'user_controller','list -- Finding Users list (isOrg) --');
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
								var send_users = new Array();
								if(listing === 'basic') {
									users.forEach(function(u) {
										send_users.push(u.name);
									});
									res.status(200).json({
										'status': 200,
										'message': message,
										'usersCount': usersCount,
										'users': send_users
									});
								} else if(listing === 'id') {
									send_users = new Array();
									users.forEach(function(u) {
										send_users.push({name: u.name, id: u._id});
									});
									res.status(200).json({
										'status': 200,
										'message': message,
										'usersCount': usersCount,
										'users': send_users
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
								Err.sendError(res,err,'user_controller','list -- Finding Users list (isAdmin) --');
							});
					})
					.catch((err) => {
						Err.sendError(res,err,'user_controller','list -- Finding Org --');
					});
			} else {
				res.status(406).json({
					'status': 406,
					'message': 'Please provide -org- in params'
				});
			}
		}
	}, //list

	count(req,res) {
		const key_user = res.locals.user;
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
						Err.sendError(res,err,'user_controller','list -- Finding Org isAdmin --');
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
					Err.sendError(res,err,'user_controller','list -- Finding Org isOrg --');
				});
		}
	}, // count

	myRoles(req,res) {
		const key_user = res.locals.user;
		var myroles = {
			isAdmin				: key_user.roles.isAdmin,
			isBusines			: key_user.roles.isBusiness,
			isOrg					: key_user.roles.isOrg,
			isOrgContent	: key_user.roles.isOrgContent,
			isAuthor			: key_user.roles.isAuthor,
			isSupervisor	: key_user.roles.isSupervisor,
			isInstructor	: key_user.roles.isInstructor,
			isUser				: false
		};
		Roster.findOne({student: key_user._id})
			.then((item) => {
				if(item) {
					myroles.isUser 	= true;
				}
				res.status(200).json({
					'status'			: 200,
					'message'			: myroles
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'user_controller','myRoles -- Finding Roster --');
			});
	}, // myRoles

	encrypt(req, res){
		//const key_user 	= res.locals.user;
		const username			= req.query.username;
		User.findOne({name: username})
			.then((user)  => {
				if(user) {
					user.password = encryptPass(user.password);
					user.save()
						.then(() => {
							res.status(200).json({
								'status': 200,
								'message': 'Password encrypted'
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'encrypt','list -- Saving User --');
						});
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'User -' + user + '- not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'encrypt','list -- Finding User --');
			});
	}, // encrypt

	validateUsers (req,res) {
		User.find().exists('orgUnit', false)
			.select('name')
			.then((users) => {
				if(users && users.length > 0) {
					res.status(200).json({
						'status': 200,
						'usersWithoutOU': users.length,
						'users': users
					});
					return;
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No users without OU found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'validateUsers','list -- Finding Users without OU --');
			});
		User.find({password: /\$2a\$.*/i})
			.select('name')
			.then((users) => {
				if(users && users.length > 0) {
					res.status(200).json({
						'status': 200,
						'usersWithUnencryptedPassword': users.length,
						'users': users
					});
					return;
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'validateUsers','list -- Finding Users with unencrypted password--');
			});
		res.status(404).json({
			'status': 404,
			'message': 'Validation complete'
		});
	}, // validateUsers

	correctUsers(req,res){
		const users = req.body.users;
		if(users.length > 0) {
			users.forEach(function(user) {
				User.findOne({'fiscal.id': user.fiscal})
					.then((userFound) => {
						var oldName = userFound.person.name;
						userFound.person.name 			= userFound.person.motherName;
						userFound.person.motherName = userFound.person.fatherName;
						userFound.person.fatherName = oldName;
						userFound.save()
							.catch((err) => {
								Err.sendError(res,err,'correctUsers','correct -- Saving user--' + user.fiscal);
							});
					})
					.catch((err) => {
						Err.sendError(res,err,'correctUsers','correct -- Finding user--' + user.fiscal);
					});
			});
			res.status(200).json({
				'status': 200,
				'message': 'Users changed'
			});
		} else {
			res.status(200).json({
				'status': 200,
				'message': 'No users given'
			});
		}
	} // correctUsers
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

function encryptPass(obj) {
	var salt = bcrypt.genSaltSync(10);
	obj = bcrypt.hashSync(obj, salt);
	return obj;
}
