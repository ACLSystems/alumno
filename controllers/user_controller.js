const winston = require('winston');
const User = require('../src/users');
const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
const generate = require('nanoid/generate');
//const moment = require('moment');
const permissions = require('../shared/permissions');
const obj_type = 'user';
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
		var key = (req.body && req.body.x_key) || req.headers['x-key'];
		if(!req.body ) { // Body vacio
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give data to process'
			});
		} else {

			// FALTA AGREGAR PERMISOS.
			// quienes pueden crear usuarios?
			// el mismo usuario que se registra solo (checar que el usuario no exista)
			// un usuario con rol de isAdmin
			// un usuario con rol de isOrg y que lo registre en su propia organizacion

			const userProps = req.body;
			if(!userProps.org) { // No trae organizacion
				res.status(406).json({
					'status': 406,
					'message': 'Error: Please give org'
				});
			} else {
				Org.findOne({ name: userProps.org }, { name: true } )
					.then((org) => {
						if (!org) {
							res.status(404).json({
								'status': 404,
								'message': 'Error: Org -' + userProps.org + '- does not exist'
							});
						} else {
							OrgUnit.findOne({ name: userProps.orgunit}, { name: true })
								.then((ou) => {
									if (!ou) {
										res.status(404).json({
											'status': 404,
											'message': 'Error: OU -' + userProps.orgUnit + '- does not exist'
										});
									} else {
										var admin = {
											isActive: true,
											isVerified: false,
											recoverString: '',
											passwordSaved: ''
										};
										userProps.admin = admin;
										var permUsers = new Array();
										var author = userProps.name;
										if (key) {
											author = key;
										}
										const permUser = { name: author, canRead: true, canModify: true, canSec: false };
										permUsers.push(permUser);
										var permRoles = new Array();
										var permRole = { name: 'Admin', canRead: true, canModify: true, canSec: true };
										permRoles.push(permRole);
										permRole = { name: 'Org', canRead: true, canModify: true, canSec: true };
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
										User.create(userProps)
											.then(() => {
												res.status(201).json({
													'status': 201,
													'message': 'User - ' + userProps.name + '- created'
												});
											})
											.catch((err) => {
												var mess = {};
												var errString = err.toString();
												var re = new RegExp('duplicate key error collection');
												var found = errString.match(re);
												if(found) {
													res.status(406).json({
														'status': 406,
														'message': 'Error: user -' + userProps.name + '- already exists'
													});
												} else {
													mess = {id: 500, message: 'Error: ' + err};
													logger.info(mess);
													res.status(500).json({
														'status': 500,
														'message': 'Error:',
														'Error': err
													});
												}

											});
									}
								})
								.catch((err) => {
									const mess = {id: 500, error: 'Error: ' + err};
									logger.info(mess);
									res.status(500).json({
										'status': 500,
										'message': 'Error:',
										'Error': err
									});
								});
						}
					})
					.catch((err) => {
						logger.info(err);
						res.status(500).json({
							'status': 500,
							'message': 'Error:',
							'Error': err
						});
					});
			}
		}
	},

	//getDetails(req, res, next) {
	getDetails(req, res) {
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Please, give data to process'
			});
		} else { // else1
			const userProps = req.body;
			const key = (req.body && req.body.x_key) || req.headers['x-key'];
			if(!userProps.name) {
				res.status(406).json({
					'status': 406,
					'message': 'Please, give username'
				});
			} else { // else2
				User.findOne({ name: key })
					.populate('org','name')
					.populate('orgUnit','name')
					.then((key_user) => {
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
									const result = permissions.access(key_user,user,obj_type);
									if(result.canRead) {
										res.status(200).json(user);
									} else {
										res.status(403).json({
											'status': 403,
											'message': 'User ' + key + ' not authorized'
										});
									}
								}
							})
							.catch((err) => {
								logger.info(err);
								res.status(500).json({
									'status': 500,
									'message': 'Error:',
									'Error': err
								});
							});
					})
					.catch((err) => {
						logger.info(err);
						res.status(500).json({
							'status': 500,
							'message': 'Error:',
							'Error': err
						});
					});
			} // else2
		} // else1
	},

	//validateEmail(req, res, next) {
	validateEmail(req, res) {
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Please, give data to process'
			});
		} else {
			const userProps = req.body;
			if(!userProps.email) {
				res.status(406).json({
					'status': 406,
					'message': 'Please, give email'
				});
			} else {
				User.findOne({ 'person.email': userProps.email})
					.then((email) => {
						if(email) {
							var emailID = generate('1234567890abcdefghijklmnopqrstwxyz', 35);
							//console.log(email);
							email.admin.recoverString = emailID;
							email.save();
							res.status(200);
							res.json({
								'status': 200,
								'message': 'Email found',
								'id': emailID
							});
						} else {
							res.status(404);
							res.json({
								'status': 404,
								'message': 'Email does not exist '
							});
						}
					})
					.catch((err) => {
						res.status(500);
						res.json({
							'status': 500,
							'message': 'Error: ' + err
						});
					});
			}
		}
	},

	//passwordChange(req, res, next) {
	passwordChange(req, res) {
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Please, give data to process'
			});
		} else { //else1
			const key = (req.body && req.body.x_key) || req.headers['x-key'];
			const userProps = req.body;
			if(!userProps.name || !userProps.password) {
				res.status(406).json({
					'status': 406,
					'message': 'Please, give username and/or password'
				});
			} else { // else2
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
									const result = permissions.access(key_user,user,obj_type);
									if(result.canModify) {
										user.save();
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
								res.status(500);
								res.json({
									'status': 500,
									'message': 'Error: ',
									'Error': err
								});
							});
					})
					.catch((err) => {
						res.status(500);
						res.json({
							'status': 500,
							'message': 'Error: ',
							'Error': err
						});
					});
			} // else2
		} // else1
	},

	//modify(req, res, next) {
	modify(req, res) {
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Please, give data to process'
			});
		} else { // else1
			var key = (req.body && req.body.x_key) || req.headers['x-key'];
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
							const result = permissions.access(key_user,user,obj_type);
							if(result.canModify) {
								const date = new Date();
								const mod = {
									by: key,
									when: date,
									what: 'User modification'
								};
								user.mod.push(mod);
								user.save();
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
							res.status(500);
							res.json({
								'status': 500,
								'message': 'Error:',
								'Error': err
							});
						});
				})
			/*
			User.findOneAndUpdate({ 'name': userProps.name }, {$set: userProps})
				.then((user) => {
					var author = user.name;
					if (key) {
						author = key;
					};
					const date = new Date();
					const mod = {
						by: author,
						when: date,
						what: 'User modification'
					};
					user.mod.push(mod);
					user.save();
					res.status(200);
					res.json({
						'status':200,
						'message': 'User properties modified'
					});
				})
				*/
				.catch((err) => {
					res.status(500);
					res.json({
						'status': 500,
						'message': 'Error:',
						'Error': err
					});
				});
		} // else1
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
