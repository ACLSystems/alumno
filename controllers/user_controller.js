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
		const userProps = req.body;
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
	},

	//getDetails(req, res, next) {
	getDetails(req, res) {
		const key = req.headers['x-key'];
		const username = req.headers['name'] || (req.query && req.query.name);
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
	},

	getRoles(req, res) {
		const key = req.headers['x-key'];
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
		const key = req.headers['x-key'];
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
		const email = req.headers['email'] || (req.body && req.body.email);
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
	},

	//passwordChange(req, res, next) {
	passwordChange(req, res) {
		const key = (req.body && req.body.x_key) || req.headers['x-key'];
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
		const key = (req.query && req.query.x_key) || req.headers['x-key'];
		var sort = { name: 1 };
		var skip = 0;
		var limit = 15;
		if(req.query.sort) { sort = { name: req.query.sort }; }
		if(req.query.skip) { skip = parseInt( req.query.skip ); }
		if(req.query.limit) { limit = parseInt( req.query.limit ); }
		User.findOne({ name: key })
			.populate('org')
			.then((key_user) => {
				if(!key_user.roles.isAdmin && key_user.roles.isOrg) {
					User.find({ org: key_user.org._id })
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
							res.status(200).json({
								'status': 200,
								'message': message,
								'usersCount': usersCount,
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
										res.status(200).json({
											'status': 200,
											'message': message,
											'usersCount': usersCount,
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
	}, //list

	count(req,res) {
		const key = (req.query && req.query.x_key) || req.headers['x-key'];
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
