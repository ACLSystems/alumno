const Org = require('../src/orgs');
const winston = require('winston');
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
		if(!key) {
			res.status(406).json({
				'status': 406,
				'message': 'No x-key found'
			});
		} else {
			//console.log('aquí estoy'); // eslint-disable-line
			if(!req.body) return res.sendStatus(400).res.send({id: 417, err: 'Please, give data to process'});
			const orgProps = req.body;
			var temp = orgProps.alias;
			if(temp.constructor !== Array) {
				orgProps.alias = [temp];
			}
			const date = new Date();
			const mod = {by: key, when: date};
			orgProps.mod = new Array();
			orgProps.mod.push(mod);
			var permUsers = new Array();
			var permUser = { name: key, canRead: true, canModify: true, canSec: true };
			permUsers.push(permUser);
			permUser = { name: 'admin', canRead: true, canModify: true, canSec: true };
			permUsers.push(permUser);
			var permRoles = new Array();
			var permRole = { name: 'isAdmin', canRead: true, canModify: true, canSec: true };
			permRoles.push(permRole);
			permRole = { name: 'isOrg', canRead: true, canModify: true, canSec: true };
			permRoles.push(permRole);
			var permOrgs = new Array();
			const permOrg = { name: key, canRead: true, canModify: true, canSec: false };
			permOrgs.push(permOrg);
			orgProps.perm = { users: permUser, roles: permRoles, orgs: permOrgs };
			Org.create(orgProps)
				.then(() => {
					logger.info('Org -' + orgProps.name + '- created');
					const mess = {id: 201, message: 'Org -' + orgProps.name + '- created'};
					res.status(201).send(mess);
				})
				.catch((err) => {
					logger.info('Org Register -----');
					logger.info(err);
					const mess = {id: 422, error: 'Error: Org -' + orgProps.name + '- already exists'};
					res.status(422).send(mess);
				});
		}
	}
};
