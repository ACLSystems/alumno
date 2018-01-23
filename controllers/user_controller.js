const winston = require('winston');
const User = require('../src/users');
const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
const generate = require('nanoid/generate');
//const moment = require('moment');
const permissions = require('../shared/permissions');
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
							OrgUnit.findOne({ name: userProps.orgUnit}, { name: true })
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
										User.create(userProps)
											.then(() => {
												res.status(201).json({
													'status': 201,
													'message': 'User - ' + userProps.name + '- created'
												});
											})
											.catch((err) => {
												var errString = err.toString();
												var re = new RegExp('duplicate key error collection');
												var found = errString.match(re);
												if(found) {
													res.status(406).json({
														'status': 406,
														'message': 'Error: user -' + userProps.name + '- or email: -'+ userProps.person.email + '- already exists'
													});
												} else {
													sendError(res,err,'register -- User create --');
												}

											});
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
			const key = req.headers['x-key'];
			const username = req.headers['name'] || (req.query && req.query.name);
			if(!username) {
				res.status(406).json({
					'status': 406,
					'message': 'Please, give username'
				});
			} else { // else2
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
									//console.log(key_user); // eslint-disable-line
									//console.log(user); // eslint-disable-line
									const result = permissions.access(key_user,user,'user');
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
											'message': 'User ' + key + ' not authorized'
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
			} // else2
		} // else1
	},

	//validateEmail(req, res, next) {
	validateEmail(req, res) {
		const email = req.headers['email'] || (req.body && req.body.email);
		if(!email) {
			res.status(406).json({
				'status': 406,
				'message': 'Please, give email'
			});
		} else {
			User.findOne({ 'person.email': email})
				.then((user) => {
					if(user) {
						var emailID = generate('1234567890abcdefghijklmnopqrstwxyz', 35);
						user.admin.recoverString = emailID;
						user.save();
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
							'message': 'Email ' + email + 'does not exist'
						});
					}
				})
				.catch((err) => {
					sendError(res,err,'validateEmail -- Finding email --');
				});
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
									const result = permissions.access(key_user,user,'user');
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
								sendError(res,err,'passwordChange -- Finding User --');
							});
					})
					.catch((err) => {
						sendError(res,err,'passwordChange -- Finding key User --');
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
							const result = permissions.access(key_user,user,'user');
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
							sendError(res,err,'modify -- Finding User to modify --');
						});
				})
				.catch((err) => {
					sendError(res,err,'modify -- Finding Key User --');
				});
		} // else1
	}, // Modify

	list(req,res) {
		const key = (req.query && req.query.x_key) || req.headers['x-key'];
		User.findOne({ name: key })
			.populate('org')
			.then((key_user) => {
				if(!key_user.roles.isAdmin && key_user.roles.isOrg) {
					User.find({ org: key_user.org._id })
						.then((users) => {
							res.status(200).json({
								'status': 200,
								'message': 'Users from -' + key_user.org.name +'-',
								'users': users
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
									.then((users) => {
										res.status(200).json({
											'status': 200,
											'message': 'Users from -' + org.name +'-',
											'users': users
										});
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

function sendError(res, err, section) {
	logger.info('User controller -- Section: ' + section + '----');
	logger.info(err);
	res.status(500).json({
		'status': 500,
		'message': 'Error',
		'Error': err.message
	});
	return;
}
