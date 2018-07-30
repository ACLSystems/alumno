const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
const User = require('../src/users');
const winston = require('winston');
const bcrypt = require('bcrypt-nodejs');
const newpass = require('../config/newpass');

const logger = require('../shared/winston-logger');

module.exports = {
	//register(req, res, next) {
	register(req, res) {
		const key_user 	= res.locals.user;
		//console.log('aquí estoy'); // eslint-disable-line
		if(!req.body) return res.sendStatus(400).res.send({id: 417, err: 'Please, give data to process'});
		const orgProps = req.body;
		if(orgProps.alias) { orgProps.alias = parseArray(orgProps.alias); }
		orgProps.mod = new Array();
		orgProps.mod.push(generateMod(key_user.name,'Org Creation'));
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
		const permOrg = { name: orgProps.name, canRead: true, canModify: true, canSec: false };
		permOrgs.push(permOrg);
		orgProps.perm = { users: permUser, roles: permRoles, orgs: permOrgs };
		Org.create(orgProps)
			.then(() => {
				logger.info('Org -' + orgProps.name + '- created');
				// Creación de orgUnit padre
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
				const permOrg = { name: orgProps.name, canRead: true, canModify: true, canSec: true };
				permOrgs.push(permOrg);
				var ouProps = {
					name: orgProps.name,
					longName: orgProps.name + ' OU',
					org: orgProps._id,
					type: 'org',
					perm: { users: permUser, roles: permRoles, orgs: permOrgs },
				};
				ouProps.mod = new Array();
				ouProps.mod.push(generateMod(key_user.name,'OU creation'));
				OrgUnit.create(ouProps)
					.then(() => {
						logger.info('OU -' + ouProps.name + '- created under -' + orgProps.name + '- org');
						// Creación usuario "publico"
						const mod = generateMod(key_user.name,'User Creation');
						const salt = bcrypt.genSaltSync(10);
						const password = bcrypt.hashSync(orgProps.name +'_'+ newpass.public(), salt);
						const userProps = new User({
							name: orgProps.name + '-public',
							password: password,
							org: orgProps._id,
							orgUnit: ouProps._id,
							roles: {
								isOrg: true,
								isOrgContent: true,
								isSupervisor: true
							},
							mod: [mod],
							perm: {
								users: [{
									name: 'admin',
									canRead: true,
									canModify: true,
									canSec: true
								},{
									name: orgProps.name + '-public',
									canRead: true,
									canModify: true,
									canSec: true
								}],
								roles: [{
									name: 'isAdmin',
									canRead: true,
									canModify: true,
									canSec: true
								}]
							},
							admin: {
								isActive: true,
								isVerified: true,
								recoverString: '',
								passwordSaved: 'saved'
							}
						});
						userProps.save().catch((err) => {
							logger.error('Trying to save public user');
							logger.error(err);
						});
						// fin creación usuario "publico"
					})
					.catch((err) => {
						logger.error(err);
						const mess = {id: 409, error: 'Error: OU -' + ouProps.name + '- already exists'};
						logger.error(mess);
						res.status(409).json({
							'status': 409,
							'message': 'OU -' + ouProps.name + '- already exists'
						});
					});
				// fin de creación de orgunit padre
				const mess = {id: 201, message: 'Org -' + orgProps.name + '- created'};
				res.status(201).send(mess);
			})
			.catch((err) => {
				logger.error('Org Register -----');
				logger.error(err);
				const mess = {id: 422, error: 'Error: Org -' + orgProps.name + '- already exists'};
				res.status(422).send(mess);
			});
	},

	list(req,res) {
		//const key_user 	= res.locals.user;
		var sort = { name: 1 };
		var skip = 0;
		var limit = 15;
		if(req.query.sort) { sort = { name: req.query.sort }; }
		if(req.query.skip) { skip = parseInt( req.query.skip ); }
		if(req.query.limit) { limit = parseInt( req.query.limit ); }
		Org.find({})
			.sort(sort)
			.skip(skip)
			.limit(limit)
			.then((orgs) => {
				var send_orgs = new Array();
				orgs.forEach(function(org) {
					send_orgs.push(org.name);
				});
				res.status(200).json({
					'status': 200,
					'message': send_orgs
				});
			})
			.catch((err) => {
				logger.error('Org list -----');
				logger.error(err);
				const mess = {id: 422, error: 'Error: '+ err.message};
				res.status(422).send(mess);
			});
	}, // list

	getDetailsAdmin(req,res) {
		//var key = req.headers.key;
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Please, give data to process'
			});
		} else {
			Org.findOne({ name: req.query.name })
				.then((org) => {
					res.status(200).json({
						'status': 200,
						'message': org
					});
				})
				.catch((err) => {
					logger.error('Org list -----');
					logger.error(err);
					const mess = {id: 422, error: 'Error: '+ err.message};
					res.status(422).send(mess);
				});
		}
	}, // getDetailsAdmin

	getDetails(req,res) {
		//var key = req.headers.key;
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Please, give data to process'
			});
		} else {
			Org.findOne({ name: req.query.name })
				.then((org) => {
					var send_org = {
						name: org.name,
						longName: org.longName,
						alias: org.alias,
					};
					res.status(200).json({
						'status': 200,
						'message': send_org
					});
				})
				.catch((err) => {
					logger.error('Org list -----');
					logger.error(err);
					const mess = {id: 422, error: 'Error: '+ err.message};
					res.status(422).send(mess);
				});
		}
	}, // getDetailsAdmin

	modify(req, res) {
		const key_user 	= res.locals.user;
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Please, give data to process'
			});
		} else {
			var orgProps = req.body;
			if(!key_user.roles.isAdmin && key_user.roles.isOrg && key_user.org.name !== orgProps.name) {
				res.status(406).json({
					'status': 406,
					'message': 'User -'+ key_user.name + '- cannot modify Org -' + orgProps.name + '-'
				});
			} else {
				Org.findOne({ name: req.body.name})
					.then((org) => {
						if(!org) {
							res.status(400).json({
								'status': 300,
								'message': 'Org -' + req.body.name + '- not found'
							});
						} else {
							orgProps.mod = org.mod;
							orgProps.mod.push(generateMod(key_user.name,'Org modification'));
							Org.findByIdAndUpdate({ _id: org._id }, {$set: orgProps })
								.then(() => {
									res.status(200).json({
										'status': 200,
										'message': 'Org -' + org.name + '- modified'
									});
								})
								.catch((err) => {
									sendError(res,err,'Org modify -- Org find --');
								});
						}
					})
					.catch((err) => {
						sendError(res,err,'Org modify -- Org find --');
					});
			}
		}
	} // modify

};

function sendError(res, err, section) {
	logger.error('orgUnit controller -- Section: ' + section + '----');
	logger.error(err);
	res.status(500).json({
		'status': 500,
		'message': 'Error',
		'Error': err.message
	});
	return;
}

function parseArray(myarr) {
	const myarr_temp = myarr;
	if(myarr_temp.constructor !== Array) {
		myarr = [myarr_temp];
	}
	return myarr;
}

function generateMod(by, desc) {
	const date = new Date();
	return {by: by, when: date, what: desc};
}

/*
function generatePerm(user,org, orgUnit) {
	return {
		users: [{name: user, canRead: true, canModify: true, canSec: true}],
		roles: [{name: 'isOrgContent', canRead: true, canModify: true, canSec: true}],
		orgs: [{name: org, canRead: true, canModify: false, canSec: false}],
		orgUnits: [{name: orgUnit, canRead: true, canModify: false, canSec: false }]
	};
}
*/
