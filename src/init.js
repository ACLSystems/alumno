const Control 	= require('./control'					);
const Users 		= require('./users'						);
const Orgs 			= require('./orgs'						);
const OrgUnits 	= require('./orgUnits'				);
const bcrypt 		= require('bcrypt-nodejs'			);
const newpass 	= require('../config/newpass'	);
const mongoose 	= require( 'mongoose' );


const logger = require('../shared/winston-logger');



module.exports = {
	initDB(version){
		// revisamos si tenemos inicializada la base
		var message = 'Database uninitialized detected. Begining initialization...';
		Control.findOne({})
			.then((control) => {
				if(!control)  {  // No... no está inicializada.
					logger.info(message);
					console.log(message); //eslint-disable-line
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
						logger.error(message);
						console.log(message); //eslint-disable-line
						logger.error(err);
						console.log(err); //eslint-disable-line
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
						logger.error(message);
						console.log(message); //eslint-disable-line
						logger.error(err);
						console.log(err); //eslint-disable-line
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
						logger.error(message);
						console.log(message); //eslint-disable-line
						logger.error(err);
						console.log(err); //eslint-disable-line
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
						logger.error(message);
						console.log(message); //eslint-disable-line
						logger.error(err);
						console.log(err); //eslint-disable-line
					});

					// Creacion del usuario admin

					date = new Date();
					mod = {
						by: 'init',
						when: date,
						what: 'User creation'
					};

					const salt = bcrypt.genSaltSync(10);
					const password = bcrypt.hashSync(newpass.admin(), salt);
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
						logger.error(message);
						console.log(message); //eslint-disable-line
						logger.error(err);
						console.log(err); //eslint-disable-line
					});

					// terminamos la inicializacion con el registro de control
					const control = new Control({
						version: version.version,
						name: version.app,
						schemas: mongoose.modelNames()
					});
					var mongooseAdmin = new mongoose.mongo.Admin(mongoose.connection.db);
					mongooseAdmin.buildInfo()
						.then((info) => {
							control.mongo = info.version;
							control.save().catch((err) => {
								message = 'Trying to save control document';
								logger.error(message);
								console.log(message); //eslint-disable-line
								logger.error(err);
								console.log(err); //eslint-disable-line
							})
								.catch((err) => {
									logger.error(err);
									console.log(err); //eslint-disable-line
								});
						})
						.catch((err) => {
							logger.error(err);
							console.log(err); //eslint-disable-line
						});
					// Listo, terminamos de inicializar
					message = 'Database initialized...';
					logger.info(message);
					console.log(message); //eslint-disable-line
				} else { // Ya existe el registro de control
					control.version = version.version;
					control.name = version.app;
					control.schemas = mongoose.modelNames();
					var admin = new mongoose.mongo.Admin(mongoose.connection.db);
					admin.buildInfo()
						.then((info) => {
							control.mongo = info.version;
							control.host	= mongoose.connection.host;
							control.mongoose = mongoose.version;
							control.save().catch((err) => {
								message = 'Trying to save control document';
								logger.error(message);
								console.log(message); //eslint-disable-line
								logger.error(err);
								console.log(err); //eslint-disable-line
							});
						})
						.catch((err) => {
							logger.error(err);
							console.log(err); //eslint-disable-line
						});
				}
			})
			.catch((err) => {
				logger.error(err);
				console.log(err); //eslint-disable-line
			});
	},
	initConsumer(){

	}
};
