
const mongoose 	= require( 'mongoose' );
const bcrypt 		= require('bcrypt-nodejs'			);
const logger 		= require('../shared/winston-logger');
const newpass 	= require('../config/newpass'	);
const Control 	= require('./control'					);
const Config 		= require('./config'					);
const Users 		= require('./users'						);
const Orgs 			= require('./orgs'						);
const OrgUnits 	= require('./orgUnits'				);

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
					const orgPublic = new Orgs({
						name: 'public',
						longName: 'Público en General',
						alias: ['Público', 'Pública', 'General'],
						isActive: true,
						mod: [{
							by: 'init',
							when: new Date(),
							what: 'Org creation'
						}],
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

					const orgACL = new Orgs({
						name: 'acl',
						longName: 'ACL Systems S.A. de C.V.',
						alias: ['acl systems', 'ACL', 'ACL Systems'],
						isActive: true,
						mod: [{
							by: 'init',
							when: new Date(),
							what: 'Org creation'
						}],
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

					const ouPublic = new OrgUnits({
						name: 'public',
						longName: 'Público en General',
						alias: ['Público', 'Pública', 'General'],
						org: orgPublic._id,
						parent: 'public',
						type: 'org',
						isActive: true,
						mod: [{
							by: 'init',
							when: new Date(),
							what: 'Org Unit creation'
						}],
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

					const ouACL = new OrgUnits({
						name: 'acl',
						longName: 'ACL Systems S.A. de C.V.',
						alias: ['acl systems', 'ACL', 'ACL Systems'],
						org: orgACL._id,
						parent: 'acl',
						type: 'org',
						isActive: true,
						mod: [{
							by: 'init',
							when: new Date(),
							what: 'Org Unit creation'
						}],
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

					const salt = bcrypt.genSaltSync(10);
					const password = bcrypt.hashSync(newpass.admin(), salt);
					const admin = new Users({
						name: 'admin@aclsystems.mx',
						password: password,
						org: orgPublic._id,
						orgUnit: ouPublic._id,
						roles: {
							isAdmin: true,
							isOrg: true
						},
						mod: [{
							by: 'init',
							when: new Date(),
							what: 'User creation'
						}],
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
							}).catch((err) => {
								logger.error(err);
								console.log(err); //eslint-disable-line
							});
						}).catch((err) => {
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
						}).catch((err) => {
							logger.error(err);
							console.log(err); //eslint-disable-line
						});
				}
			}).catch((err) => {
				logger.error(err);
				console.log(err); //eslint-disable-line
			});
	},
	initConfig(){
		Config.findOne({})
			.then((config) => {
				if(!config){
					Config.create({
						fiscal: {
							priceList: {
								id: '',name: ''
							},
							seller: {
								id: '', name: '', identification: ''
							},
							term: {
								id: '', name: '', days: ''
							}
						},
						apiExternal: {
							uri: '', username: '', token: '', enabled: false
						}
					}).catch((err) => {
						logger.error(err);
						console.log(err); //eslint-disable-line
					});
				}
			}).catch((err) => {
				logger.error(err);
				console.log(err); //eslint-disable-line
			});
	}
};
