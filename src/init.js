const Control = require('./control');
const Users = require('./users');
const Orgs = require('./orgs');
const OrgUnits = require('./orgUnits');
const winston = require('winston');
const bcrypt = require('bcrypt-nodejs');

/* eslint-disable no-console */

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
	init(version){
		// revisamos si tenemos inicializada la base
		var message = 'Database uninitialized detected. Begining initialization...';
		Control.findOne({})
			.then((control) => {
				if(!control)  {  // No... no está inicializada.
					logger.info(message);
					console.log(message);
					// Comenzamos inicializacion de la base si la base no tiene datos

					// Inicializacion de la organizacion "publica"
					var date = new Date();
					var mod = {
						by: 'init',
						when: date,
						what: 'Org creation'
					};
					const orgPublic = new Orgs({
						name: 'public',
						longName: 'Público en General',
						alias: ['Público', 'Pública', 'General'],
						isActive: true,
						mod: [mod],
						perm: {
							users: [{
								name: 'admin',
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
						}
					});
					orgPublic.save().catch((err) => {
						message = 'Trying to save public org';
						logger.info(message);
						console.log(message);
						logger.info(err);
						console.log(err);
					});

					// Inicializacion de la organizacion "ACL Systems"

					date = new Date();
					mod = {
						by: 'init',
						when: date,
						what: 'Org creation'
					};

					const orgACL = new Orgs({
						name: 'acl',
						longName: 'ACL Systems S.A. de C.V.',
						alias: ['acl systems', 'ACL', 'ACL Systems'],
						isActive: true,
						mod: [mod],
						perm: {
							users: [{
								name: 'admin',
								canRead: true,
								canModify: true,
								canSec: true
							}],
							roles: [{
								name: 'isAdmin',
								canRead: true,
								canModify: true,
								canSec: true
							},{
								name: 'isOrg',
								canRead: true,
								canModify: true,
								canSec: false
							}],
							orgs: [{
								name: 'acl',
								canRead: true,
								canModify: true,
								canSec: true
							}]
						}
					});

					orgACL.save().catch((err) => {
						message = 'Trying to save ACL org';
						logger.info(message);
						console.log(message);
						logger.info(err);
						console.log(err);
					});

					// Unidad Organizacional "Pública"

					date = new Date();
					mod = {
						by: 'init',
						when: date,
						what: 'Org Unit creation'
					};
					const ouPublic = new OrgUnits({
						name: 'public',
						longName: 'Público en General',
						alias: ['Público', 'Pública', 'General'],
						org: orgPublic._id,
						parent: 'public',
						type: 'org',
						isActive: true,
						mod: [mod],
						perm: {
							users: [{
								name: 'admin',
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
						}
					});
					ouPublic.save().catch((err) => {
						message = 'Trying to save public org unit';
						logger.info(message);
						console.log(message);
						logger.info(err);
						console.log(err);
					});

					// Unidad Organizacional "ACL Systems"

					date = new Date();
					mod = {
						by: 'init',
						when: date,
						what: 'Org Unit creation'
					};
					const ouACL = new OrgUnits({
						name: 'acl',
						longName: 'ACL Systems S.A. de C.V.',
						alias: ['acl systems', 'ACL', 'ACL Systems'],
						org: orgACL._id,
						parent: 'acl',
						type: 'org',
						isActive: true,
						mod: [mod],
						perm: {
							users: [{
								name: 'admin',
								canRead: true,
								canModify: true,
								canSec: true
							}],
							roles: [{
								name: 'isAdmin',
								canRead: true,
								canModify: true,
								canSec: true
							},
							{
								name: 'isOrg',
								canRead: true,
								canModify: true,
								canSec: true
							}
							],
							orgs: [{
								name: 'acl',
								canRead: true,
								canModify: true,
								canSec: true
							}]
						}
					});
					ouACL.save().catch((err) => {
						message = 'Trying to save ACL org unit';
						logger.info(message);
						console.log(message);
						logger.info(err);
						console.log(err);
					});

					// Creacion del usuario admin

					date = new Date();
					mod = {
						by: 'init',
						when: date,
						what: 'User creation'
					};

					const salt = bcrypt.genSaltSync(10);
					const password = bcrypt.hashSync('alumno_admin', salt);
					const admin = new Users({
						name: 'admin',
						password: password,
						org: orgPublic._id,
						orgUnit: ouPublic._id,
						roles: {
							isAdmin: true,
							isOrg: true
						},
						mod: [mod],
						perm: {
							users: [{
								name: 'admin',
								canRead: true,
								canModify: true,
								canSec: true
							}],
							roles: [{
								name: 'isAdmin',
								canRead: true,
								canModify: true,
								canSec: true
							}],
							orgs: [{
								name: 'acl',
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
					admin.save().catch((err) => {
						message = 'Trying to save admin user';
						logger.info(message);
						console.log(message);
						logger.info(err);
						console.log(err);
					});

					// terminamos la inicializacion con el registro de control
					const control = new Control({
						version: version,
						schemas: [
							'control',
							'orgs',
							'orgunits',
							'users'
						]
					});
					control.save().catch((err) => {
						message = 'Trying to save control document';
						logger.info(message);
						console.log(message);
						logger.info(err);
						console.log(err);
					});

					// Listo, terminamos de inicializar
					message = 'Database initialized...';
					logger.info(message);
					console.log(message);
				} //Aqui
			})
			.catch((err) => {
				logger.info(err);
				console.log(err);
			});
	}
};