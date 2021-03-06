const bcrypt 							= require('bcryptjs');
const generate						= require('nanoid/generate');
const urlencode 					= require('urlencode');
const StatusCodes 				= require('http-status-codes');
const User 								= require('../src/users');
const Org 								= require('../src/orgs');
const OrgUnit 						= require('../src/orgUnits');
const Mailjet							= require('../shared/mailjet');
const Err 								= require('../controllers/err500_controller');
// const Fiscal 							= require('../src/fiscalContacts');
const Instance						= require('../src/instances');
// const Project 						= require('../src/projects');
// const WorkShift						= require('../src/workShift');
//const logger 							= require('../shared/winston-logger');


/**
	* CONFIG
	* Todo se extrae de variables de Ambiente
	*/
/** @const {number}  - plantilla para el usuario que es registrado por el administrador */
// const template_user_admin 		= parseInt(process.env.MJ_TEMPLATE_USER_ADMIN);
// /** @const {number} - plantilla ESPECIAL para notificar al alumno su registro en grupo */
// const template_user_SPECIAL 	= parseInt(process.env.MJ_TEMPLATE_GROUPREG_SPECIAL);
// /** @const {number} - En qué casos aplica el usuario "ESPECIAL" */
// const user_SPECIAL 						= parseInt(process.env.MJ_TEMPLATE_USER_SPECIAL);
// /** @const {string}  - url de libreta */
var url 								= process.env.NODE_LIBRETA_URI;
// --------------------------------------------------------------

module.exports = {
	massiveRegister(req,res) {
		if(!req.body ) {
			res.status(StatusCodes.NOT_ACCEPTABLE).json({
				'message': 'Please, give data to process'
			});
		} else {
			var usersReq;
			if(req.body.url && req.body.users) {
				url = req.body.url;
				usersReq = req.body.users;
			} else {
				usersReq = req.body;
			}

			var numUsers = {
				requested: usersReq.length
			};
			const key_user 	= res.locals.user;
			var searchO = {};
			var searchOU = {};
			if(key_user.roles.isOrg && !key_user.roles.isAdmin) {
				searchO = { name: key_user.org.name };
			}
			if(key_user.roles.isAdmin || key_user.roles.isOrg || key_user.roles.isRequester) {
				Org.find(searchO, {name: true})
					.then((orgs) => {
						if(key_user.roles.isOrg && !key_user.roles.isAdmin) {
							searchOU = { org: orgs[0]._id };
						}
						OrgUnit.find(searchOU)
							.populate('org')
							.then(orgUnits => {
								if(orgUnits && Array.isArray(orgUnits) && orgUnits.length > 0) {
									for(var i=0; i<orgUnits.length; i++) {
										if(!orgUnits[i].org || !orgUnits[i].org.name) {
											res.status(StatusCodes.NOT_ACCEPTABLE).json({
												'message': `OrgUnit ${orgUnits[i].name} tiene errores, ya que no tiene org o no existe el nombre de la org`
											});
											return;
										}
									}
									var objOrg = '';
									var objOrgUnit = '';
									var failed = [];
									var status = 'ok';
									var permRoles = [];
									var permRole = { name: 'isAdmin', canRead: true, canModify: true, canSec: true };
									permRoles.push(permRole);
									permRole = { name: 'isOrg', canRead: true, canModify: true, canSec: true };
									permRoles.push(permRole);
									var usersToInsert = [];
									var usersToInsertNames = [];
									var usersToUpdate = [];
									var usersToUpdateNames = [];
									usersReq.forEach(function(val) {
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
											var permUsers = [];
											var permUser = { name: key_user.name, canRead: true, canModify: true, canSec: true };
											permUsers.push(permUser);
											permUser = { name: val.name, canRead: true, canModify: true, canSec: false };
											permUsers.push(permUser);
											var permOrgs = [];
											var permOrg = { name: val.org, canRead: true, canModify: true, canSec: false };
											permOrgs.push(permOrg);
											val.perm = { users: permUsers, roles: permRoles, orgs: permOrgs };
											const date = new Date();
											const mod = {
												by: key_user.name,
												when: date,
												what: 'User creation'
											};
											val.mod = [];
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
												if(roles.isRequester ) 	{val.roles.isRequester 	= true; }
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
												val.name = val.person.email;
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
									});

									User.find({name: {$in: usersToInsertNames}})
										.populate('orgUnit', 'name type parent')
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
												User.insertMany(usersToInsert)
													.then(() => {

														usersToInsert.forEach(function(user) {
															var link = url + '/userconfirm/' + user.admin.validationString + '/' + user.person.email;
															// var templateId = template_user_admin;
															let subject = 'Confirma tu correo electrónico';
															// let variables = {
															// 	'Nombre': user.person.name,
															// 	'confirmation_link':link,
															// };
															const instance = (user.orgUnit.type === 'state') ? user.orgUnit.name : user.orgUnit.parent;
															const message = `${user.person.name},<br>Bienvenido al sistema Conalep.<br>El administrador te acaba de registrar en este portal, y requiere que realices una validación de tus datos registrados. Por favor, da clic en la siguiente liga y sigue las instrucciones:<br><a href="${link}">link</a><br>Si la liga anterior no funciona, por favor copia y pega la liga en tu navegador.<br>Lo anterior te pedirá que valides tu información y que generes una contraseña.<br>Selecciona una contraseña nueva, escríbela y guárdala en y lugar seguro.<br>El Conalep se reserva el derecho a restringir el uso de la plataforma si no se le da el uso correcto a la misma.<br>En otro correo te llegará información acerca del curso o cursos en el o los que estarás enrolado.`;
															Mailjet.sendGenericMail(user.person.email, user.person.name,subject,message,instance)
																.catch((err) => {
																	Err.sendError(res,err,'massiveUser_controller','register -- Sending Mail --');
																});
														});
													})
													.catch((err) => {
														Err.sendError(res,err,'massiveUser_controller','register -- Users insertMany --');
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
													delete userToUpdate.password;
													User.updateMany({_id: userToUpdate._id}, {$set: userToUpdate})
														.catch((err) => {
															Err.sendError(res,err,'massiveUser_controller','register -- Users update --');
														});
												});
												numUsers.updated = usersToUpdate.length;
											}
											numUsers.failed = failed.length;
											var result = numUsers;
											result.details = failed;
											res.status(StatusCodes.OK);
											res.json({
											//res.end(JSON.stringify({
												'message': result
											//}));
											});
										})
										.catch((err) => {
											Err.sendError(res,err,'massiveUser_controller','register -- Finding users --');
										});
								} else {
									res.status(StatusCodes.NOT_FOUND).json({
										'message': 'No se encontraron orgUnits -- REVISAR CON EL ADMINISTRADOR'
									});
								}
							})
							.catch((err) => {
								Err.sendError(res,err,'massiveUser_controller','register -- Finding orgUnits --');
							});
					})
					.catch((err) => {
						Err.sendError(res,err,'massiveUser_controller','register -- Finding orgs --');
					});
			} else {
				res.status(StatusCodes.FORBIDDEN);
				res.json({
					'message': 'User not authorized'
				});
			}
		}
	}, // massiveRegister

	async muir(req,res) {
		const key_user 	= res.locals.user;
		var userProps 	= req.body;
		// Ignorar '?'
		const char 			= '?';
		const email 		= userProps.person.email;
		// var templateId  = template_user_admin;
		if(email.includes(char)) {
			const index 		= email.indexOf(email);
			userProps.person.email = (email.slice(index+1));
		}
		// Validar que el correo venga mínimamente bien construido
		const challenge = /\S+@\S+\.\S+/;
		const validate  = userProps.person.email.match(challenge);
		if(!validate) return res.status(StatusCodes.NOT_ACCEPTABLE).json({
			'message': 'Error: email no formateado correctamente'
		});
		userProps.person.email = userProps.person.email.toLowerCase();
		if(userProps.name !== userProps.person.email) { // que el nombre de usuario sera igual a su correo
			userProps.name = userProps.person.email;
		}
		// checamos si el usuario es especial
		// var SPECIAL = false;
		// if(userProps.orgUnit === user_SPECIAL) {
		// 	SPECIAL = true;
		// 	templateId = template_user_SPECIAL;
		// }
		const results = await Promise.all([
			Org.findOne({name: userProps.org })
				.select('name').catch((err) => {
					Err.sendError(res,err,'massiveUser_controller','muir -- Finding Courses --');
					return;
				}),
			OrgUnit.findOne({$or: [{ name: userProps.orgUnit}, {longName: userProps.orgUnit}]})
				.select('name type parent org').catch((err) => {
					Err.sendError(res,err,'massiveUser_controller','muir -- Finding Courses --');
					return;
				}),
			User.findOne({name:userProps.name})
				.catch((err) => {
					Err.sendError(res,err,'massiveUser_controller','muir -- Finding Courses --');
					return;
				}),
			// Project.findOne({name: userProps.project})
			// 	.select('name'),
			// WorkShift.findOne({name: userProps.workShift})
			// 	.select('name')
		]);
		var [
			org,
			ou,
			user,
			// project,
			// workShift
		] = results;
		if(!org) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				'message': 'Organización no existe o no es válida'
			});
		}
		if(!ou) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				'message': 'Plantel (OU) no existe o no es válido'
			});
		}
		// if(!project) {
		// 	res.status(StatusCodes.NOT_ACCEPTABLE).json({
		// 		'message': 'Error: Project not found or not valid. Please check'
		// 	});
		// 	return;
		// }
		// if(!workShift) {
		// 	res.status(StatusCodes.NOT_ACCEPTABLE).json({
		// 		'message': 'Error: workShift not found or not valid. Please check'
		// 	});
		// 	return;
		// }
		if(ou.org + '' !== org._id + '') {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				'message': 'Plantel no válido. La organización del plantel no concuerda con la organización proporcionada',
				'org': org._id,
				'ou': ou.org
			});
		}
		var ouParent;
		if(ou.type !== 'state' && ou.parent) {
			ouParent = await OrgUnit.findOne({name:ou.parent}).catch((err) => {
				Err.sendError(res,err,'massiveUser_controller','muir -- Finding OU Parent --');
				return;
			});
		}
		var instanceOU = (ou.type === 'state') ? ou.name : ou.parent;
		var queryOU = (ou.type === 'state') ? {
			orgUnit: ou._id
		} : {orgUnit: ouParent._id};
		// console.log('queryOU');
		// console.log(queryOU);
		const instance = await Instance.findOne(queryOU).catch((err) => {
			Err.sendError(res,err,'massiveUser_controller','muir -- Finding Instance --');
			return;
		});
		// console.log('Instance');
		// console.log(instance);
		if(user) {
			if(userProps.char1) user.char1 = userProps.char1;
			if(userProps.char2) user.char2 = userProps.char2;
			// if(userProps.workShift) {user.workShift = workShift._id;}
			// if(userProps.project) {
			// 	if(user.project && Array.isArray(user.project) && user.project.length > 0){
			// 		var found = user.project.find(function(pro) {
			// 			return pro + '' === pro._id + '';
			// 		});
			// 		if(!found){
			// 			user.project.push(project._id);
			// 		}
			// 	} else {
			// 		user.project = [project._id];
			// 	}
			// }
			await user.save().catch((error) => {
				console.log(error);
			});
			return res.status(StatusCodes.OK).json({
				'message': 'Usuario previamente registrado',
				'user': {
					'name': user.name,
					'person': user.person
				},
				'userid': user._id
			});
		} else {
			userProps.admin = {
				isActive: true,
				isVerified: false,
				recoverString: '',
				passwordSaved: '',
				adminCreate: true,
				initialPassword: userProps.password
			};
			var permUsers = [];
			permUsers.push({
				name: userProps.name,
				canRead: true,
				canModify: true,
				canSec: false
			});
			if (userProps.name !== key_user.name) {
				permUsers.push({
					name: key_user.name,
					canRead: true,
					canModify: true,
					canSec: false
				});
			}
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
				name: userProps.org,
				canRead: true,
				canModify: true,
				canSec: false
			});
			userProps.perm = { users: permUsers, roles: permRoles, orgs: permOrgs };
			userProps.org = org._id;
			userProps.orgUnit = ou._id;
			userProps.mod = [];
			// userProps.project = [project._id];
			// userProps.workShift = workShift._id;
			userProps.mod.push({
				by: key_user.name,
				when: new Date(),
				what: 'User creation'
			});
			if(userProps.student && userProps.student.type === 'internal') {
				delete userProps.student.external;
				delete userProps.student.origin;
			}
			user = new User(Object.assign({},userProps));
			user.admin.validationString = generate('1234567890abcdefghijklmnopqrstwxyz', 35);
			await user.save().catch((err) => {
				Err.sendError(res,err,'user_controller','muir -- Saving User validation String --');
				return;
			});
			// if(SPECIAL) {
			// 	var fiscal = new Fiscal({
			// 		identification: user.admin.initialPassword,
			// 		name: user.person.name + ' ' + user.person.fatherName + ' ' +user.person.motherName,
			// 		observations: 'Usuario ESPECIAL',
			// 		email: user.person.email,
			// 		type: 'client',
			// 		cfdiUse: 'G03',
			// 		orgUnit: user.orgUnit,
			// 		mod: [{
			// 			what: 'Fiscal creation - new user',
			// 			when: new Date(),
			// 			by: 'System'
			// 		}]
			// 	});
			// 	await fiscal.save().catch((error) =>
			// 	{
			// 		console.log(error);
			// 	});
			// }
			if(instance) {
				url = `${instance.url.libreta}/#`;
			}
			var link = url + '/confirm/' + user.admin.validationString + '/' + user.person.email + '/' + urlencode(user.person.name) + '/' + urlencode(user.person.fatherName) + '/' + urlencode(user.person.motherName);
			let subject = 'Confirma tu correo electrónico';
			// let variables = {
			// 	'Nombre': user.person.name,
			// 	'confirmation_link':link,
			// };
			const message = `<h4>Bienvenido al sistema Conalep</h4>
			<p style="color:red;">Por favor, lee cuidadósamente las siguientes instrucciones:</p>
			<p>El administrador te acaba de registrar en este portal, y requiere que realices una validación de tus datos registrados. Por favor, da clic en el siguiente botón y sigue las instrucciones:</p><a href="${link}"><button style="background-color:green;border:none;color:white;padding:10px 20px;text-align=center;text-decoration:none;display:inline-block;font-size:14px;margin: 4px 2px;cursor:pointer;">Validar correo</button></a><p>Si el botón anterior no funciona, por favor copia y pega la siguiente liga en tu navegador.</p>${link}<p>Cuando realices este procedimiento se te pedirá que valides tu información y que generes una contraseña.</p><p>Selecciona una contraseña nueva, escríbela y guárdala en un lugar seguro.</p><p>El Conalep se reserva el derecho a restringir el uso de la plataforma si no se le da el uso correcto a la misma.</p><p>En otro correo te llegará información acerca del curso o cursos en el o los que estarás enrolado.</p>`;
			await Mailjet.sendGenericMail(user.person.email, user.person.name,subject,message,instanceOU)
				.catch((err) => {
					let mailErr = err.toString();
					if(mailErr === '401: Unauthorized'){
						return res.status(StatusCodes.CREATED).json({
							'message': 'Usuario -' + userProps.name + '- creado. No se envió correo',
							'userid': user._id,
							'uri': link
						});
					} else {
						Err.sendError(res,err,'user_controller','muir -- Sending Mail --');
						return;
					}
				});
			res.status(StatusCodes.CREATED).json({
				'message': 'Usuario -' + userProps.name + '- creado',
				'userid': user._id,
				'uri': link
			});
		}
	}, // muir (Massive User Individual Register)

	get(req,res) {
		var query = JSON.parse(req.query.find);
		User.find(query)
			.populate('org','name')
			.populate('orgUnit','name parent')
			.populate('workShift')
			.select('_id -password')
			.then((users) => {
				if(users && users.length > 0) {
					var send_users = [];
					users.forEach(user => {
						send_users.push(user._id);
					});
					res.status(StatusCodes.OK).json({
						'usersNum': users.length,
						'usersArray': send_users,
						'users'		: users
					});
				} else {
					res.status(StatusCodes.NOT_FOUND).json({
						'message'	: 'No users found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'massiveUser_controller','get -- Finding Users --');
			});
	}, // get

	minimalGet(req,res) {
		var query = JSON.parse(req.query.find);
		User.find(query)
			.select('_id name')
			.then((users) => {
				if(users && users.length > 0) {
					var send_users = [];
					users.forEach(user => {
						send_users.push(user._id);
					});
					res.status(StatusCodes.OK).json({
						'usersNum': users.length,
						'usersArray': send_users,
						'users'		: users
					});
				} else {
					res.status(StatusCodes.NOT_FOUND).json({
						'message'	: 'No users found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'massiveUser_controller','get -- Finding Users --');
			});
	}
};

// Private Functions

function properCase(name) {
	var newName = '';
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
		isSupervisor: false,
		isRequester: false,
		isMoocSupervisor: false
	};
}

function encryptPass(obj) {
	var salt = bcrypt.genSaltSync(10);
	obj = bcrypt.hashSync(obj, salt);
	return obj;
}

// function sendError(res, err, section) {
// 	logger.error('MassiveUsers Controller -- Section: ' + section + '----');
// 	logger.error(err);
// 	res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
// 		'message': 'Error',
// 		'Error': err
// 	});
// 	return;
// }
