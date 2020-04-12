const generate 						= require('nanoid/generate');
const bcrypt 							= require('bcryptjs');
const urlencode 					= require('urlencode');
const StatusCodes 				= require('http-status-codes');
const jsonwebtoken 				= require('jsonwebtoken');
const mongoose 						= require('mongoose');
const User 								= require('../src/users'											);
const Org 								= require('../src/orgs'												);
const OrgUnit 						= require('../src/orgUnits'										);
const Course 							= require('../src/courses'										);
const Group 							= require('../src/groups'											);
const Roster 							= require('../src/roster'											);
const FiscalContact 			= require('../src/fiscalContacts'							);
const Discussion 					= require('../src/discussions'								);
const Follow 							= require('../src/follow'											);
const Notification 				= require('../src/notifications'							);
const Err 								= require('../controllers/err500_controller'	);
const Attempt 						= require('../src/attempts'										);
const Certificate 				= require('../src/certificates'								);
const Dependency 	= require('../src/dependencies'							);
const permissions 				= require('../shared/permissions'							);
const mailjet							= require('../shared/mailjet'									);
const version 						= require('../version/version');

/**
	* CONFIG
	* Todo se extrae de variables de Ambiente
	*/
/** @const {string} - URI de Libreta */
const url 									= process.env.NODE_LIBRETA_URI;
/** @const {number} - plantilla para el usuario que se registra por su cuenta */
const template_user					= parseInt(process.env.MJ_TEMPLATE_USER);
/** @const {number} - plantilla para notificar al alumno su inscripción */
var template_user_inscr 						= parseInt(process.env.MJ_TEMPLATE_GROUPREG);
/** @const {number} - plantilla para el usuario que es registrado por el administrador */
const template_user_admin		= parseInt(process.env.MJ_TEMPLATE_USER_ADMIN);
/** @const {number} - plantilla para notificación al usuario sobre el cambio de password hecho por el administrador */
const template_user_change	= parseInt(process.env.MJ_TEMPLATE_USER_CHANGE);
/** @const {number} - plantilla para recuperación de contraseña */
const template_pass_recovery	= parseInt(process.env.MJ_TEMPLATE_PASSREC);
/** @const {number} - plantilla notificación al usuario sobre el cambio de correo hecho por el administrador */
const template_adm_pass_change	= parseInt(process.env.MJ_TEMPLATE_ADM_PASS_CHANGE);

const template_valemail_wopr = parseInt(process.env.MJ_TEMPLATE_VALEMAIL_WOPR);

module.exports = {
	register(req, res) {

		/*
			* Continua la validación
			*/
		if(!req.body.person.name) {
			res.status(StatusCodes.NOT_ACCEPTABLE).json({
				'message': `Falta name {string} en la propiedad {person} para ${req.body.name}`
			});
			return;
		} else if(!req.body.person.fatherName) {
			res.status(StatusCodes.NOT_ACCEPTABLE).json({
				'message': `Falta fatherName {string} en la propiedad {person} para ${req.body.name}`
			});
			return;
		} else if(!req.body.person.motherName) {
			res.status(StatusCodes.NOT_ACCEPTABLE).json({
				'message': `Falta motherName {string} en la propiedad {person} para ${req.body.name}`
			});
			return;
		}
		/*
			* Termina la validación
			*/

		var key = '';
		const key_user 	= res.locals.user;
		if(res.locals.user && res.locals.user.name) {
			key = key_user.name;
		} else {
			key = req.body.name;
		}
		var userProps = req.body;
		var adminCreate = false;
		if(userProps.name !== key) {
			adminCreate = true;
		}
		if(userProps.name !== userProps.person.email) { // que el nombre de usuario sera igual a su correo
			userProps.person.email = userProps.name;
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
								res.status(StatusCodes.NOT_FOUND).json({
									'message': 'Error: OU -' + userProps.orgUnit + '- does not exist'
								});
							} else {
								var admin = {
									isActive: true,
									isVerified: false,
									isDataVerified: false,
									recoverString: '',
									passwordSaved: '',
									adminCreate: false
								};
								if(adminCreate) {
									admin.adminCreate = true;
								} else {
									admin.isDataVerified = true;
								}
								userProps.admin = admin;
								var permUsers = [];
								var permUser = { name: userProps.name, canRead: true, canModify: true, canSec: false };
								permUsers.push(permUser);
								if (userProps.name !== key) {
									permUser = { name: key, canRead: true, canModify: true, canSec: false };
									permUsers.push(permUser);
								}
								var author = userProps.name;
								author = key;
								var permRoles = [];
								var permRole = { name: 'isAdmin', canRead: true, canModify: true, canSec: true };
								permRoles.push(permRole);
								permRole = { name: 'isOrg', canRead: true, canModify: true, canSec: true };
								permRoles.push(permRole);
								var permOrgs = [];
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
								userProps.mod = [];
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
												var link = url + '/userconfirm/' + user.admin.validationString + '/' + user.person.email;
												let templateId = template_user;
												if(adminCreate) {
													link = url + '/confirm/' + user.admin.validationString + '/' + user.person.email + '/' + urlencode(user.person.name) + '/' + urlencode(user.person.fatherName) + '/' + urlencode(user.person.motherName);
													templateId = template_user_admin;
												}
												let subject = 'Confirma tu correo electrónico';
												let variables = {
													Nombre: user.person.name,
													confirmation_link:link
												};
												mailjet.sendMail(user.person.email,user.person.name,subject,templateId,variables)
													.then(() => {
														res.status(StatusCodes.CREATED).json({
															'message': 'Usuario - ' + userProps.name + '- creado',
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
														let subject = 'Confirma tu correo electrónico';
														let variables = {
															Nombre: user.person.name,
															confirmation_link:link
														};
														mailjet.sendMail(user.person.email,user.person.name,subject,template_user,variables)
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

	async resendConfirmation(req,res) {
		const username = req.query.name.toLowerCase();
		try {
			var user = await User.findOne({name: username}).lean();
			if(!user) {
				res.status(200).json({
					'message': 'No user ' + username + ' found'
				});
				return;
			} else {
				if(user.admin.isVerified) {
					res.status(200).json({
						'message': 'User ' + username + ' is already verified'
					});
					return;
				} else {
					const link = url + '/confirm/' + user.admin.validationString + '/' + user.person.email + '/' + urlencode(user.person.name) + '/' + urlencode(user.person.fatherName) + '/' + urlencode(user.person.motherName);
					const subject = 'Confirma tu correo electrónico - RE-ENVIADO';
					const variables = {
						Nombre: user.person.name,
						confirmation_link:link
					};
					const templateId = template_user_admin;
					mailjet.sendMail(user.person.email,user.person.name,subject,templateId,variables);
					res.status(200).json({
						'message': 'Verification email for user ' + username + ' sent'
					});
				}
			}

		} catch (err) {
			Err.sendError(res,err,'user_controller','resendConfirmation -- Finding User --');
		}
	}, //resendConfirmation

	async delete(req,res) {
		try {
			var user = await User.findOne({name:req.params.name});
			if(!user) {
				res.status(200).json({
					'status': 404,
					'message': 'No user ' + req.params.name + ' found'
				});
			} else {
				const redisClient = require('../src/cache');
				const hashKey = 'user:details:' + req.params.name;
				await redisClient.del(hashKey);
				const rosters = await Roster.find({student:user._id});
				const rostersIDs = rosters.map(({_id}) => _id);
				if(rosters && Array.isArray(rosters) && rosters.length > 0) {
					let rostersObjIDs = rosters.map(roster => mongoose.Types.ObjectId(roster._id));
					await Certificate.deleteMany({rosters: {$in: rostersObjIDs}});
					var groups = Group.find({rosters: {$in: rostersObjIDs}});
					if(groups && Array.isArray(groups) && groups.length > 0) {
						for(var i=0; i < groups.length; i++) {
							// Quitar el userID del grupo
							groups[i].students = groups[i].students.filter(student => student !== user._id);
							// Del arreglo de rosters buscar en los Grupos
							// Y al encontrar el grupo, quitar el roster del arreglo
							rostersIDs.forEach(roster => {
								let rosterFound = groups[i].roster.find(ros => ros + '' === roster +'');
								if(rosterFound) {
									groups[i].roster = groups[i].roster.filter(roster => roster + '' !== rosterFound + '');
								}
							});
							// Guardamos el grupo
							await groups[i].save();
						}
					}
				}
				if(user.fiscal && Array.isArray(user.fiscal) && user.fiscal.length > 0) {
					let fiscals = user.fiscal.map(fiscal => mongoose.Types.ObjectId(fiscal));
					await FiscalContact.deleteMany({_id: {$in: fiscals}});
				}
				Promise.all([
					Roster.deleteMany({student:user._id}),
					Notification.deleteMany({
						$or: [
							{'destination.item': user._id},
							{'source.item': user._id}
						]}),
					Follow.deleteMany({'who.item': user._id}),
					Attempt.deleteMany({user: user._id}),
					Discussion.deleteMany({user: user._id}),
					// Poner requests
					// POner Sessions
				])
					.then(() => {
						User.findByIdAndDelete(user._id)
							.then(() => {
								res.status(200).json({
									'status': 200,
									'message': 'User -' + req.params.name + '- deleted'
								});
							})
							.catch((err) => {
								Err.sendError(res,err,'user_controller','delete -- Deleting main document --');
							});
					})
					.catch((err) => {
						Err.sendError(res,err,'user_controller','delete -- Deleting secondary documents --');
					});
			}
		} catch (e) {
			Err.sendError(res,e,'user_controller','delete -- Finding user --');
		}


	}, // delete

	confirm(req,res) {
		const email 		= req.body.email;
		const token 		= req.body.token;
		const name 			= req.body.name;
		const fatherName = req.body.fathername;
		const motherName = req.body.mothername;
		var password		= 'empty';
		if(req.body.password) {
			password  = req.body.password;
		}
		User.findOne({name: email})
			.then((user) => {
				if(user) {
					if(token === user.admin.validationString){
						user.admin.isVerified = true;
						user.admin.isDataVerified = true;
						user.admin.validationString = '';
						user.admin.adminCreate = false;
						user.admin.passwordSaved = 'saved';
						if(password !== 'empty'){
							user.password = password;
						}
						if(name && fatherName && motherName) {
							user.person.name = name;
							user.person.fatherName = fatherName;
							user.person.motherName = motherName;
						}
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

	getDetailsPublic(req,res) {
		const username = req.params.name;
		User.findOne({ name: username })
			// .cache({key: 'user:details:' + username})
			.select('name person orgUnit admin.isVerified')
			.populate('orgUnit', 'name')
			.then((user) => {
				// console.log(user);
				if (!user) {
					res.status(200).json({
						'status': 404,
						'message': 'User -' + username + '- does not exist'
					});
				} else {
					res.status(200).json({
						//'status': 200,
						'validated' : user.admin.isVerified,
						'user': {
							email			: user.name,
							person		: user.person
						},
						'ou': {
							id				: user.orgUnit._id,
							name			: user.orgUnit.name,
							longName	: user.orgUnit.longName
						}
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'user_controller','getDetailsPublic -- Finding Email --');
			});
	},

	//getDetails(req, res, next) {
	getDetails(req, res) {
		const key_user = res.locals.user;
		const username = req.query.name || key_user.name;
		User.findOne({ name: username })
			// .cache({key: 'user:details:' + username})
			.populate('org','name')
			.populate('orgUnit', 'name')
			.populate({
				path: 'fiscal',
				select: 'tag identification name phonePrimary phoneSecondary mobile fax observations email address type cfdiUse corporate orgUnit -_id idAPIExternal',
				populate: {
					path: 'orgUnit',
					select: 'name parent longName type'
				}
			})
			.lean()
			.then((user) => {
				if (!user) {
					res.status(404).json({
						'status': 404,
						'message': 'User -' + username + '- does not exist'
					});
				} else {
					const result = permissions.access(key_user,user,'user');
					if(result.canRead) {
						var send_user = {
							userid	: user._id,
							name		: user.name,
							org			: user.org.name,
							orgid		: user.org._id,
							orgUnit	: user.orgUnit.name,
							ouid		: user.orgUnit._id,
							workShift					: user.workShift,
							attachedToWShift	: user.attachedToWShift
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
								id				: user.student.id,
								career		: user.student.career,
								term			: user.student.term,
								isActive	: user.student.isActive,
								type			: user.student.type,
								external	: user.student.external,
								origin		: user.student.origin
							};
							if(user.student.external) { send_user.student.external 	= user.student.external;}
							if(user.student.origin	) { send_user.student.origin 		= user.student.origin;  }
						}
						if(user.corporate) {
							send_user.corporate = {
								id					: user.corporate.id,
								isActive		: user.corporate.isActive,
								type				: user.corporate.type
							};
						}
						if(user.admin) {
							send_user.admin = {
								isActive		: user.admin.isActive,
								isVerified	: user.admin.isVerified,
								isDataVerified : user.admin.isDataVerified,
								recoverString: user.admin.recoverString
							};
						}
						if(user.address) {
							send_user.address = {
								line1				: user.address.line1,
								line2				: user.address.line2,
								postalCode	: user.address.postalCode,
								locality		: user.address.locality,
								city				: user.address.city,
								state				: user.address.state,
								country			: user.address.country
							};
						}
						if(user.fiscal) {
							send_user.fiscal = mergeDeep(user.fiscal);
							if(Array.isArray(user.fiscal) &&
							user.fiscal.length > 0 &&
							typeof user.fiscalcurrent === 'number') {
								if(user.fiscal.length >= user.fiscalcurrent){
									var temp = JSON.parse(JSON.stringify(send_user.fiscal[user.fiscalcurrent]));
									temp.fiscalcurrent = true;
									send_user.fiscal[user.fiscalcurrent] = JSON.parse(JSON.stringify(temp));
								}
							}
						}
						if(user.geometry) {
							send_user.geometry = {
								type				: user.geometry.type,
								coordinates	: user.geometry.coordinates
							};
						}
						if(user.preferences) {
							send_user.preferences = {
								alwaysSendEmail : user.preferences.alwaysSendEmail
							};
						} else {
							send_user.preferences = {
								alwaysSendEmail : false
							};
						}
						send_user.char1 = user.char1;
						send_user.char2 = user.char2;
						send_user.fiscalcurrent = user.fiscalcurrent;
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
			// .cache({key: 'user:details:' + username})
			.populate('org','name')
			.populate('orgUnit', 'name longName')
			.populate('project')
			.populate('workShift')
			.populate('fiscal')
			.select('-perm -__v -password')
			.then((user) => {
				if (!user) {
					res.status(200).json({
						'message': 'Error: User -' + username + '- does not exist'
					});
				} else {
					//const result = permissions.access(key_user,user,'user');
					if(user.admin && user.admin.initialPassword) {
						user.initialPassword = user.admin.initialPassword;
					} else {
						user.initialPassword = 'No initial Password set for user';
					}
					res.status(200).json(user);
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
				.populate('orgUnit', 'name longName parent type')
				.select('name roles')
				.then((user) => {
					if (!user) {
						res.status(404).json({
							'status': 404,
							'message': 'User -' + username + '- does not exist'
						});
					} else {
						const result = permissions.access(key_user,user,'user');
						if(result.canRead) {
							if(user.orgUnit && user.orgUnit.parent && user.orgUnit.type) {
								if(user.orgUnit.type === 'campus') {
									user.orgUnit.state = user.orgUnit.parent;
								}
								if(user.orgUnit.type === 'state') {
									user.orgUnit.state = user.orgUnit.name;
								}
								if(user.orgUnit.type === 'org') {
									user.orgUnit.state = user.orgUnit.name;
								}
							}
							var send_user = {
								name: user.name,
								org: user.org.name,
								orgUnit: {
									name: user.orgUnit.name,
									longName: user.orgUnit.longName,
									_id: user.orgUnit._id,
									type: user.orgUnit.type,
									parent: user.orgUnit.parent,
									state: user.orgUnit.state
								},
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
										isSupervisor: user.roles.isSupervisor,
										isRequester: user.roles.isRequester
									};
								}	else {
									send_user.roles = {
										isOrgContent: user.roles.isOrgContent,
										isAuthor: user.roles.isAuthor,
										isInstructor: user.roles.isInstructor,
										isSupervisor: user.roles.isSupervisor,
										isRequester: user.roles.isRequester
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
				.then(user => {
					if (!user) {
						res.status(404).json({
							'message': 'User -' + userProps.name + '- does not exist'
						});
					} else {
						if(key_user.org.name === user.org.name && !key_user.roles.isAdmin) {
							res.status(406).json({
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
								if(userProps.roles.isRequester  !== undefined ) { user.roles.isRequester = userProps.roles.isRequester; }
								user.save().catch(err => {
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
		const email = req.body.email;
		User.findOne({ 'person.email': email})
			.then((user) => {
				if(user) {
					var emailID = generate('1234567890abcdefghijklmnopqrstwxyz', 35);
					user.admin.recoverString = emailID;
					const link = url + '/recover/' + user.admin.recoverString + '/' + user.person.email;
					let subject = 'Solicitud de recuperación de contraseña';
					let variables = {
						Nombre: user.person.name,
						confirmation_link:link
					};
					mailjet.sendMail(user.person.email,user.person.name,subject,template_pass_recovery,variables);
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

	async validateEmailWithoutPasswordReset(req, res) {
		const key_user = res.locals.user;
		const redisClient = require('../src/cache');
		const timeToLive = parseInt(process.env.CACHE_TTL);
		try {
			var user = await User.findOne({name: key_user.name});
			if(user) {
				var emailID = generate('1234567890abcdefghijklmnopqrstwxyz', 16);
				user.admin.recoverString = emailID;
				let subject = 'Confirmar correo electrónico';
				let variables = {
					Nombre: user.person.name,
					clave: emailID
				};
				const hashKey = 'user:details:' + key_user.name;
				const key = JSON.stringify(
					Object.assign({}, {
						name: key_user.name,
						collection: 'users'
					})
				);
				mailjet.sendMail(user.person.email,user.person.name,subject,template_valemail_wopr,variables);
				await user.save();
				await redisClient.hset(hashKey,key,JSON.stringify(user));
				await redisClient.expire(hashKey, timeToLive);
				res.status(200).json({
					'message': 'Email found',
					'id': emailID,
				});
			} else {
				res.status(404);
				res.json({
					'status': 404,
					'message': 'Usuario no existe'
				});
			}
		} catch (err) {
			Err.sendError(res,err,'user_controller','validateEmailWOPR -- Finding email --');
		}
	},

	async confirmEmail(req, res) {
		const key_user = res.locals.user;
		const emailID = (req.body && req.body.emailID);
		const redisClient = require('../src/cache');
		const timeToLive = parseInt(process.env.CACHE_TTL);
		try {
			var user = await User.findOne({name: key_user.name});
			if(user) {
				if(emailID === user.admin.recoverString) {
					user.admin.recoverString = '';
					user.admin.isVerified = true;
					const hashKey = 'user:details:' + key_user.name;
					const key = JSON.stringify(
						Object.assign({}, {
							name: key_user.name,
							collection: 'users'
						})
					);
					await user.save();
					await redisClient.hset(hashKey,key,JSON.stringify(user));
					await redisClient.expire(hashKey, timeToLive);
					res.status(200).json({
						'message': 'Validación de correo exitoso'
					});
				} else {
					res.status(400).json({
						'message': 'Código incorrecto. No podemos confirmar el correo electrónico'
					});
				}
			} else {
				res.status(404).json({
					'message': 'Usuario inexistente'
				});
			}
		} catch (err) {
			Err.sendError(res,err,'user_controller','confirmEmail -- Finding user --');
		}
	},

	async validateUserMaindata(req,res) {
		const key_user = res.locals.user;
		const name = req.body.name;
		const fatherName = req.body.fatherName;
		const motherName = req.body.motherName;
		try {
			var user = await User.findOne({name: key_user.name});
			if(user) {
				if(user.admin && user.admin.isDataVerified === false) {
					user.person.name = name;
					user.person.fatherName = fatherName;
					user.person.motherName = motherName;
					user.admin.isDataVerified = true;
					await user.save();
					const redisClient = require('../src/cache');
					const timeToLive = parseInt(process.env.CACHE_TTL);
					const hashKey = 'user:details:' + key_user.name;
					const key = JSON.stringify(
						Object.assign({}, {
							name: key_user.name,
							collection: 'users'
						})
					);
					await redisClient.hset(hashKey,key,JSON.stringify(user));
					await redisClient.expire(hashKey, timeToLive);
					res.status(200).json({
						'message': `Usuario ${key_user.name} actualizado`
					});
				} else {
					res.status(406).json({
						'message': `Usuario ${key_user.name} ya ha sido actualizado previamente`
					});
				}
			} else {
				res.status(404).json({
					'message': 'Usuario no encontrado'
				});
			}
		} catch (err) {
			Err.sendError(res,err,'user_controller','validateUserMaindata -- Finding user --');
		}

	}, //validateUserMaindata

	passwordRecovery(req, res) {
		const email = req.body.email;
		const emailID = req.body.emailID;
		const password = req.body.password;
		User.findOne({ name: email})
			.then((user) => {
				if(user) {
					if(emailID === user.admin.recoverString) {
						user.admin.recoverString = '';
						user.admin.isVerified = true;
						user.admin.passwordSaved = 'saved';
						//user.password = encryptPass(password);
						user.password = password;
						user.save()
							.then(() => {
								res.status(200).json({
									'status': 200,
									'message': 'Password recovery sucessfully'
								});
								let template_pass_change = parseInt(process.env.MJ_TEMPLATE_PASSCH);
								let subject = 'Tu contraseña ha sido modificada';
								let variables = {
									Nombre: user.person.name
								};
								mailjet.sendMail(user.person.email,user.person.name,subject,template_pass_change, variables);
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

	passwordChange(req, res) {
		// Para el cambio de password necesitamos borrar TODOS los tokens
		var privateKEY  = process.env.PRIV_KEY;
		var buff 				= Buffer.from(privateKEY,'base64');
		privateKEY 			= buff.toString('utf-8');
		const audience 	= process.env.NODE_LIBRETA_URI;
		const issuer  	= version.vendor;
		const expiresD 	= process.env.NODE_EXPIRES || '7d';
		const payload = {
			id: res.locals.user._id,
			person: res.locals.user.person,
			orgUnit: res.locals.user.orgUnit
		};
		const signOptions = {
			issuer,
			subject: res.locals.user.name,
			audience,
			expiresIn: expiresD,
			algorithm: 'RS256'
		};
		const token = jsonwebtoken.sign(payload, privateKEY, signOptions);
		const tokenDecoded = jsonwebtoken.decode(token);
		res.locals.user.admin.passwordSaved = 'saved';
		res.locals.user.password = req.body.password;
		res.locals.user.admin.tokens = [];
		res.locals.user.admin.tokens.push(token);
		var mod = {
			by: res.locals.user.name,
			when: new Date(),
			what: 'Password modificado'
		};
		res.locals.user.mod.push(mod);
		res.locals.user.save()
			.then (() => {
				res.status(StatusCodes.OK).json({
					'message': 'Password modificado',
					token,
					iat: tokenDecoded.iat,
					exp: tokenDecoded.exp
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'user_controller','passwordChange -- Saving User--');
			});
	}, //passwordChange

	adminPasswordReset(req, res) {
		const key_user 	= res.locals.user;
		User.findOne({ name: req.body.username })
			.then((user) => {
				if(user) {
					user.admin.passwordSaved = 'saved';
					if(user.admin.initialPassword){
						user.password = encryptPass(user.admin.initialPassword);
					} else {
						if(req.body.password){
							user.password = encryptPass(req.body.password);
							user.admin.initialPassword = req.body.password;
						} else {
							res.status(200).json({
								'status': 200,
								'message': 'Error: User -' + req.body.username + '- does not have initial Password. Password must be present in body'
							});
							return;
						}
					}
					const date = new Date();
					var mod = {
						by: key_user.name,
						when: date,
						what: 'Password reset'
					};
					user.mod.push(mod);
					user.save()
						.then (() => {
							let subject = 'Tu contraseña ha sido modificada por el administrador';
							let variables = {
								Nombre: user.person.name
							};
							res.status(200).json({
								'status': 200,
								'message': 'Password for user -' + req.body.username + '- reset by -' + key_user.name + '-'
							});
							mailjet.sendMail(user.person.email,user.person.name,subject,template_adm_pass_change,variables);
						})
						.catch((err) => {
							Err.sendError(res,err,'user_controller','adminPasswordReset -- Saving User--');
						});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'Error: User -'+ req.body.username +'- not found'
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
					user.save()
						.then((user) => {
							res.status(200).json({
								'message': user.name
							});
							let link = url + '/userconfirm/' + user.admin.validationString + '/' + user.person.email;
							let templateId = template_user_change;
							let subject = 'Se ha modificado tu correo electrónico';
							let variables = {
								Nombre: user.person.name,
								confirmation_link: link
							};
							mailjet.sendMail(user.person.email,user.person.name,subject,templateId,variables)
								.catch((err) => {
									Err.sendError(res,err,'user_controller','changeUser -- Sending Mail --');
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
				Err.sendError(res,err,'user_controller','changeUser -- Finding User to change --');
			});
	}, //changeUser

	modify(req, res) {
		const key_user = res.locals.user;
		const userProps = req.body;
		var username = key_user.name;
		if(userProps.name) {
			username = userProps.name;
		}
		//console.log(userProps);
		User.findOne({ 'name': username })
			.then((user) => {
				if(user) {
					if(!user.admin) {
						res.status(200).json({
							'message': 'Object inconsistent. Please contact admin: user.admin not found'
						});
						return;
					}
					const result = permissions.access(key_user,user,'user');
					if(result.canModify || key_user.roles.isAdmin) {
						if(userProps.person && (userProps.person.name || userProps.person.fatherName || userProps.person.motherName)) {
							if(user.admin.isDataVerified && !key_user.roles.isAdmin) {
								res.status(200).json({
									'message'	: 'You cannot modify name. Data already verified'
								});
								return;
							} else {
								/*
								if(userProps.person.hasOwnProperty('name')			) {user.person.name 			= properCase(userProps.person.name);}
								if(userProps.person.hasOwnProperty('fatherName')) {user.person.fatherName	= properCase(userProps.person.fatherName);}
								if(userProps.person.hasOwnProperty('motherName')) {user.person.motherName	= properCase(userProps.person.motherName);}
								*/
								user.person = mergeDeep(user.person,userProps.person);
								user.admin.isDataVerified = true;
							}
						}
						if(userProps.person) {
							/*
							if(userProps.person.hasOwnProperty('birthDate')	) {user.person.birthDate 	= userProps.person.birthDate;	}
							if(userProps.person.hasOwnProperty('mainPhone')	) {user.person.mainPhone 	= userProps.person.mainPhone;	}
							if(userProps.person.hasOwnProperty('cellPhone')	) {user.person.cellPhone 	= userProps.person.cellPhone;	}
							if(userProps.person.hasOwnProperty('genre')			) {user.person.genre 			= userProps.person.genre;			}
							if(userProps.person.hasOwnProperty('alias')			) {user.person.alias 			= userProps.person.alias;			}
							*/
							user.person = mergeDeep(user.person,userProps.person);
						}
						if(userProps.student) {
							user.student = mergeDeep(user.student,userProps.student);
							/*
							if(!user.student) {
								user.student = {};
							}
							if(userProps.student.hasOwnProperty('id')				) {user.student.id 				= userProps.student.id;				}
							if(userProps.student.hasOwnProperty('career')		) {user.student.career		= userProps.student.career;		}
							if(userProps.student.hasOwnProperty('term')			) {user.student.term			= userProps.student.term;			}
							if(userProps.student.hasOwnProperty('isActive')	) {user.student.isActive	= userProps.student.isActive;	}
							if(userProps.student.hasOwnProperty('type')			) {user.student.type			= userProps.student.type;			}
							if(userProps.student.hasOwnProperty('external')	) {user.student.external	= userProps.student.external;	}
							if(userProps.student.hasOwnProperty('origin')		) {user.student.origin		= userProps.student.origin;		}
							*/
						}
						if(userProps.address) {
							user.address = mergeDeep(user.address,userProps.address);
							/*
							if(!user.address) {
								user.address = {};
							}
							if(userProps.address.hasOwnProperty('line1')			) {user.address.line1					= userProps.address.line1;			}
							if(userProps.address.hasOwnProperty('line2')			) {user.address.line2					= userProps.address.line2;			}
							if(userProps.address.hasOwnProperty('postalCode')	) {user.address.postalCode		= userProps.address.postalCode;	}
							if(userProps.address.hasOwnProperty('locality')		) {user.address.locality			= userProps.address.locality;		}
							if(userProps.address.hasOwnProperty('city')				) {user.address.city					= userProps.address.city;				}
							if(userProps.address.hasOwnProperty('state')			) {user.address.state					= userProps.address.state;			}
							if(userProps.address.hasOwnProperty('country')		) {user.address.country				= userProps.address.country;		}
							*/
						}
						if(userProps.geometry) {
							user.geometry = mergeDeep(user.geometry,userProps.geometry);
						}
						if(key_user.roles.isAdmin) {
							user.report = userProps.report || undefined;
							user.char1 	= userProps.char1 || undefined;
							user.char2 	= userProps.char2 || undefined;
							user.orgUnit 	= userProps.orgUnit || undefined;
							if(userProps.admin){
								user.admin = mergeDeep(user.admin,userProps.admin);
							}
							if(userProps.corporate) {
								user.corporate = mergeDeep(user.corporate,userProps.corporate);
							}
						}
						if(userProps.fiscal) {
							if(!userProps.fiscal.tag) {
								res.status(200).json({
									'message': 'Tag for fiscal is required. Please provide in fiscal property'
								});
								return;
							}
							FiscalContact.findOne({tag: userProps.fiscal.tag})
								.then((fc) => {
									if(fc) {
										fc = mergeDeep(fc,userProps.fiscal);
										fc.mod.push({
											by: key_user.name,
											when: new Date(),
											what: 'Fiscal modification. Data: ' + JSON.stringify(userProps.fiscal,null,2)
										});
										fc.save().then((fiscal) => {
											var fiscalcurrent = 0;
											if(!Array.isArray(user.fiscal)) {
												user.fiscal = [fiscal._id];
												user.fiscalcurrent = 0;
											} else {
												var found = false;
												found = user.fiscal.find(function(u) {
													if(u + '' === fiscal._id + ''){
														return true;
													}
												});
												if(!found) {user.fiscal.push(fiscal._id);}
												fiscalcurrent = user.fiscal.findIndex(idx => {
													return idx + '' === fiscal._id + '';
												});
												user.fiscalcurrent = fiscalcurrent;
											}
											if(userProps.fiscal.fiscalcurrent) {
												if(user.fiscal.length > 0){
													fiscalcurrent = user.fiscal.findIndex(idx => {
														return idx + '' === fiscal._id + '';
													});
													user.fiscalcurrent = fiscalcurrent;
												} else {
													user.fiscalcurrent = 0;
												}
											}
											user.mod.push({
												by: key_user.name,
												when: new Date(),
												what: 'User modification. Data: ' + JSON.stringify(userProps,null,2)
											});
											user.save().then(() => {
												res.status(200).json({
													'message': 'User ' + user.name + ' properties modified and Fiscal Contact: ' + fiscal.tag + ' modified'
												});
											}).catch((err) => {
												Err.sendError(res,err,'user_controller','modify -- Saving User--');
											});
										}).catch((err) => { // Manejo de errores
											processError(err,res,'modify -- Fiscal contact modify --');
										});
									} else {
										if(!userProps.fiscal.identification) {
											res.status(200).json({
												'message': 'Identification (RFC) is required. Please provide in fiscal property'
											});
											return;
										}
										if(!userProps.fiscal.name) {
											res.status(200).json({
												'message': 'Fiscal name is required. Please provide in fiscal property'
											});
											return;
										}
										var fiscal = mergeDeep({},userProps.fiscal);
										fiscal.mod = [];
										fiscal.mod.push({
											by: key_user.name,
											when: new Date(),
											what: 'New fiscal: ' + JSON.stringify(fiscal,null,2)
										});
										FiscalContact.create(fiscal)
											.then((fiscal) => {
												if(user.fiscal && Array.isArray(user.fiscal)) {
													if(user.fiscal.length > 0){
														var found = false;
														found = user.fiscal.find(function(u) {
															if(u + '' === fiscal._id + ''){
																return true;
															}
														});
														if(!found) {user.fiscal.push(fiscal._id);}
														var fiscalcurrent = user.fiscal.findIndex(idx => {
															return idx + '' === fiscal._id + '';
														});
														user.fiscalcurrent = fiscalcurrent;
													} else {
														user.fiscal.push(fiscal._id);
														user.fiscalcurrent = 0;
													}
												} else {
													user.fiscal = [fiscal._id];
													user.fiscalcurrent = 0;
												}
												user.mod.push({
													by: key_user.name,
													when: new Date(),
													what: 'User modification. Data: ' + JSON.stringify(userProps,null,2)
												});
												user.save().then(() => {
													res.status(200).json({
														'message': 'User ' + user.name + ' properties modified. Fiscal contact '+ fiscal.tag + ' created/modified'
													});
												}).catch((err) => {
													Err.sendError(res,err,'user_controller','modify -- Saving User--');
												});
											})
											.catch((err) => {
												processError(err,res,'modify -- Creating fiscal contact--');
											});
									}
								})
								.catch((err) => {
									Err.sendError(res,err,'user_controller','modify -- Finding fiscal to modify --');
								});
						} else {
							user.mod.push({
								by: key_user.name,
								when: new Date(),
								what: 'User modification. Data: ' + JSON.stringify(userProps,null,2)
							});
							user.save().then(() => {
								res.status(200).json({
									'message': 'User ' + user.name + ' properties modified'
								});
							}).catch((err) => {
								Err.sendError(res,err,'user_controller','modify -- Saving User--');
							});
						}
					} else {
						res.status(403);
						res.json({
							'message': 'User ' + key_user.name + ' not authorized to modify ' + userProps.name + ' register',
							'debug': result
						});
					}
				} else {
					res.status(200).json({
						'message': 'User ' + userProps.name + ' not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'user_controller','modify -- Finding User to modify --');
			});
	}, // Modify

	listFiscals(req,res) { // Solo lista contactos fiscales de tipo corporate = true y de la orgUnit indicada
		const key_user = res.locals.user;
		function orgUnitsFind(){ // Esta función nos permite leer el valor de una consulta esperando a que se resuelva
			if(key_user.orgUnit.type === 'state') { // Aquí mandamos llamar la consulta si el criterio aplica
				return OrgUnit.find({parent: key_user.orgUnit.name})
					.select('_id')
					.then((ous) => { // No ponemos catch porque la vamos a resolver después
						let temp = [key_user.orgUnit._id];
						if(ous && ous.length > 0){
							ous.forEach(ou => {
								temp.push(ou._id);
							});
						}
						return temp;
					});
			} else { // Si no aplica el criterio, se manda una promesa resolvible
				return new Promise((resolve) => {
					resolve([key_user.orgUnit._id]);
				});
			}
		}
		orgUnitsFind()
			.then((ous) => {
				var query = {
					corporate: true
				};
				if(key_user.orgUnit.type !== 'org'){
					query = {
						orgUnit: {$in: ous},
						corporate: true
					};
				}
				FiscalContact.find(query)
					.select('-mod -__v -_id -createNew -create -corporate')
					.then((fiscals) => {
						res.status(200).json({
							'message': fiscals
						});
					})
					.catch((err) => {
						Err.sendError(res,err,'user_controller','listFiscals -- Finding fiscal contacts --');
					});
			})
			.catch((err) => { // Este catch es de la función orgUnitsFind, solo que acá la estamos resolviendo
				Err.sendError(res,err,'user_controller','listFiscals -- Finding orgUnits --');
			});
		//console.log(orgUnits);

	}, //listFiscals

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
					var users_send = [];
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
								var send_users = [];
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
									send_users = [];
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
						User.countDocuments({ org: org._id }, function(err,count) {
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
					User.countDocuments({ org: key_user.org._id }, function(err,count) {
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
			isRequester		: key_user.roles.isRequester,
			isUser				: false
		};
		Roster.findOne({student: key_user._id})
			.select('_id')
			// .cache({key: 'user:rosterExists:'+ key_user._id})
			.lean()
			.then((item) => {
				if(item) {
					myroles.isUser 	= true;
				}
				const ou = key_user.orgUnit || null;
				if(ou)	{
					myroles.ou = {
						id: ou._id,
						name: ou.name,
						longName: ou.longName,
						parent: ou.parent,
						type: ou.type,
						level: ou.level
					};
					var query = {};
					var send_ous = [];
					if(ou.parent && ou.type) {
						if(ou.type === 'campus') {
							myroles.ou.state = ou.parent;
						}
						if(ou.type === 'state') {
							query = {parent:ou.name};
							myroles.ou.state = ou.name;
						}
						if(ou.type === 'org') {
							query = {type:'campus'};
							myroles.ou.state = ou.name;
						}
						if(ou.type === 'state' || ou.type === 'org'){
							OrgUnit.find(query)
								.select('name longName parent')
								.lean()
								.then((ous) => {
									if(ous && ous.length > 0) {
										ous.forEach(oun => {
											if(!send_ous[oun.parent]) {
												send_ous[oun.parent] = [];
											}
											send_ous[oun.parent].push({
												name: oun.name,
												longName: oun.longName
											});
										});
										res.status(200).json({
											'status'			: 200,
											'message'			: myroles,
											'ous'					: send_ous
										});
									}
								})
								.catch((err) => {
									Err.sendError(res,err,'user_controller','myRoles -- Finding Ous --');
								});
						} else {
							res.status(200).json({
								'status'			: 200,
								'message'			: myroles
							});
						}
					} else {
						res.status(200).json({
							'status'			: 200,
							'message'			: myroles
						});
					}
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'user_controller','myRoles -- Finding Roster --');
			});
	}, // myRoles

	async createRosterSelf(req,res){
		const key_user = res.locals.user;
		const defaultDaysDuration = 60;
		const date = new Date();
		const finishDate = addDays(date,defaultDaysDuration);
		const link = url;
		const rosterVersion = 2;
		const minGrade = 75;
		const minTrack = 80;
		const type = 'public';
		try {
			// busca roster que ya tenga este curso de tipo público
			const findRoster = await Roster.findOne({
				type: 'public',
				student: key_user._id,
				course: req.body.courseid
			});
			if(findRoster) {
				res.status(200).json({
					message: 'Ya te habías inscrito en este curso previamente'
				});
				return;
			}
			const course = await Course.findById(req.body.courseid)
				.populate({
					path: 'blocks',
					select: 'section number w wq wt',
					options: { sort: {order: 1} }
				})
				.lean();
			if(course) {
				if(course.status === 'published') {
					var mod = {
						by: key_user.name,
						when: date,
						what: 'Roster created'
					};
					const blocks = course.blocks;
					const deps = await Dependency.find({block: {$in: blocks}});
					if(deps && deps.length > 0) {
						deps.forEach(dep => {
							var foundB = false;
							var foundOnB = false;
							var cursor = 0;
							while(!(foundB && foundOnB) && cursor < blocks.length) {
								if(dep.block + '' === blocks[cursor]._id + '') {
									if(!blocks[cursor].dependencies) {
										blocks[cursor].dependencies = [];
									}
									blocks[cursor].dependencies.push({
										dep: dep._id,
										createAttempt: false,
										track: false,
										saveTask: false
									});
									foundB = true;
								}
								if(dep.onBlock + '' === blocks[cursor]._id + '') {
									if(!blocks[cursor].dependencies) {
										blocks[cursor].dependencies = [];
									}
									blocks[cursor].dependencies.push({
										dep: dep._id
									});
									foundOnB = true;
								}
								cursor++;
							}
						});
					}
					var grades = [];
					var sec = 0;
					blocks.forEach(block => {
						grades.push({
							block: block._id,
							blockSection: block.section,
							blockNumber: (block.number === 0) ? 0 : block.number,
							track: 0,
							maxGradeQ: 0,
							gradeT: 0,
							w: block.w,
							wq: block.wq,
							wt: block.wt,
							dependencies: block.dependencies
						});
						if(block.section !== sec) {
							sec++;
						}
					});
					if(blocks[0].section === 0) {
						sec++;
					}
					var sections = [];
					var j=0;
					while(j < sec) {
						sections.push({});
						j++;
					}
					var new_roster = new Roster({
						student: key_user._id,
						grades,type,
						course: course._id,
						minGrade,minTrack,
						org: key_user.org._id,
						orgUnit: key_user.orgUnit._id,
						sections,
						version: rosterVersion,
						admin: [],
						mod: [mod],
						createDate: date,
						endDate: finishDate
					});
					await new_roster.save();
					let subject = `Te has inscrito al curso ${course.title}`;
					let variables = {
						'Nombre': key_user.person.name,
						'confirmation_link': link,
						'curso': course.title
					};
					await mailjet.sendMail(
						key_user.person.email,
						key_user.person.name,
						subject,
						template_user_inscr,
						variables
					);
					var notification = new Notification({
						destination: {
							kind: 'users',
							item: key_user._id,
							role: 'user'
						},
						objects: [
							{
								kind: 'courses',
								item: course._id
							},
							{
								kind: 'blocks',
								item: course.blocks[0]._id
							}
						],
						type: 'system',
						message: `Te has inscrito al curso ${course.title}`
					});
					await notification.save();
					return res.status(200).json({
						message: `Te has inscrito al curso ${course.title}`
					});
				} else {
					return res.status(200).json({
						'message': 'Curso seleccionado no está disponible'
					});
				}
			} else {
				return res.status(200).json({
					'message': 'Curso seleccionado no existe'
				});
			}
		} catch (err) {
			Err.sendError(res,err,'user_controller','createRoster -- Finding Course --');
		}
	}, //createRosterSelf

	encrypt(req, res){
		//const key_user 	= res.locals.user;
		const username			= req.query.username;
		User.findOne({name: username})
			.then((user)  => {
				if(user) {
					var re = /^\$2a\$10\$.*/;
					var found = re.test(user.password);
					if(!found) { user.password = encryptPass(user.password); }
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
	}, // correctUsers

	validatePassword(req,res){
		User.findOne({$or: [{name: req.body.username},{'person.email': req.body.username}]})
			.then((user) => {
				user.validatePassword(req.body.password,function(err,isOk){
					if(isOk) {
						res.status(200).json({
							'status': 200,
							'message': 'Password valid for user ' + req.body.username,
							'pass': 'VALID'
						});
					} else {
						res.status(406).json({
							'status': 406,
							'message': 'Error: Password NOT valid for user ' + req.body.username,
							'pass': 'ERROR'
						});
					}
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'user_controller','validatePassword -- Finding user--' + req.body.username);
			});
	}, // validatePassword

	async captcha(req,res) {
		const HTTPRequest = require('request-promise-native');
		const secretKey = process.env.CAPTCHA_SECRET_KEY || null ;
		const captchaServer = process.env.CAPTCHA_URL || null ;
		if(!secretKey) {
			res.status(StatusCodes.NOT_IMPLEMENTED).json({
				message: 'Esta función está desactivada'
			});
		}
		if(!captchaServer) {
			res.status(StatusCodes.NOT_IMPLEMENTED).json({
				message: 'Esta función está desactivada'
			});
		}
		try {
			let options = {
				method	: 'POST',
				uri			:	captchaServer,
				headers	: {
					'Content-type': 'application/x-www-form-urlencoded'
				},
				body		: `secret=${secretKey}&response=${req.body.response}`
			};
			let response = JSON.parse(await HTTPRequest(options));
			if(response && response.success) {
				res.status(StatusCodes.OK).json(response);
			} else {
				res.status(StatusCodes.BAD_REQUEST).json(response);
			}
		} catch (err) {
			res.status(StatusCodes.BAD_REQUEST).json(err);
		}
	}, //captcha

	actAs(req,res) {
		User.findOne({name: req.query.username})
			.then(user => {
				if(user) {
					const objToken = genToken(user);
					res.status(200).json({
						'token': objToken.token,
						'expires': objToken.expires
					});
				} else {
					res.status(404).json({
						'message': 'No user found'
					});
				}
			}).catch((err) => {
				Err.sendError(res,err,'user_controller','actAs -- Finding user--' + req.query.username);
			});
	} // actAs

};

// private functions

function genToken(user) {
	var expires = new Date();
	const jwt = require('jwt-simple');
	const addHours = 4; // otorguemos solo unas horas
	expires.setHours( expires.getHours + addHours);
	var token = jwt.encode({
		user: user.name,
		exp: expires
	}, require('../config/secret')());

	return {
		token: token,
		expires: expires,
		user: user
	};
}

/*
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
*/

function encryptPass(obj) {
	var salt = bcrypt.genSaltSync(10);
	obj = bcrypt.hashSync(obj, salt);
	return obj;
}

function isObject(item) {
	return (item && typeof item === 'object' && !Array.isArray(item) && item !== null);
}

function mergeDeep(target, source) {
	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) Object.assign(target, { [key]: {} });
				mergeDeep(target[key], source[key]);
			} else {
				Object.assign(target, { [key]: source[key] });
			}
		}
	}
	return target;
}

function processError(err,res,controllerMessage) {
	if(err.statusCode && err.error) {
		const messageHeader = 'Hubo un error al intentar comunicarse con el sistema de facturación. Favor de contactar al administrador e indicar este mensaje: ';
		var message = {};
		if(typeof err.error === 'string') {
			message = err.error;
		} else if(typeof err.error === 'object') {
			message = err.error.message;
		}
		res.status(err.statusCode).json({
			'message': messageHeader + message
		});
	} else {
		Err.sendError(res,err,'user_controller',controllerMessage);
	}
}

function addDays(date, days) {
	const copy = new Date(Number(date));
	copy.setDate(date.getDate() + days);
	return copy;
}
