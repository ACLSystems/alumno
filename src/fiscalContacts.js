// Definir requerimientos
const mongoose 					= require('mongoose');
const request 					= require('request-promise-native');
const logger 						= require('../shared/winston-logger');
const ModSchema 				= require('./modified'		);
const PermissionsSchema = require('./permissions'	);
const Config 						= require('./config'			);

const Schema 						= mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const FiscalContactSchema = new Schema({
	tag: {
		type: String,
		required: true
	},
	identification: { // RFC del usuario
		type: String,
		alias: 'RFC',
		required: true,
		match: /^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/ //CALA72100734A
	},
	name: {
		type: String,
		required: true
	},
	idAPIExternal: { // Id que se utiliza en el sistema externo de facturación
		type: Number
	},
	phonePrimary: {
		type: String
	},
	phoneSecondary: {
		type: String
	},
	mobile: {
		type: String
	},
	fax: {
		type: String
	},
	observations: {
		type: String
	},
	email: {
		type: String
	},
	address: {
		street: { type: String},
		extNum: { type: String},
		intNum: { type: String},
		colony: { type: String},
		locality: { type: String},
		municipality: {type: String},
		city: {
			type: String,
			alias: 'town'
		},
		zipCode: {
			type: String,
			alias: 'cp'
		},
		state: { type: String},
		country: {
			type: String,
			default: 'MEX'
		},
	},
	type: [{
		type: String,
		enum:['client', 'provider'],
		default: 'client'
	}],
	cfdiUse: {
		type: String,
		default: 'G03'
	},
	dateSync: {
		type: Date
	},
	createNew: {
		type: Boolean,
		default: false
	},
	mod: [ModSchema],
	perm: PermissionsSchema
});

// Definir virtuals

// Definir middleware


FiscalContactSchema.pre('validate', function(next) {
	if(!this.tag) {
		this.tag = this.identification + '-000';
	}
	next();
});


FiscalContactSchema.pre('save', function(next) {
	Config.findOne({})
		.then((config) => {
			if(config && config.apiExternal && config.apiExternal.enabled && config.apiExternal.uri){
				if(config.apiExternal.username && config.apiExternal.token) {
					const auth = new Buffer.from(config.apiExternal.username + ':' + config.apiExternal.token);
					var send = JSON.parse(JSON.stringify(this));
					if(send.tag				) {delete send.tag;				}
					if(send.mod				) {delete send.mod;				}
					if(send.perm			) {delete send.perm;			}
					if(send.dateSync	) {delete send.dateSync;	}
					if(send.createNew	) {delete send.createNew;	}
					send.pricelist 	= config.fiscal.pricelist;
					send.seller			= config.fiscal.seller;
					send.term				= config.fiscal.term;
					if(this.idAPIExternal) {
						request({
							method	: 'PUT',
							uri			: config.apiExternal.uri + '/api/v1/contacts/' + this.idAPIExternal,
							headers	: {
								authorization: 'Basic ' + auth.toString('base64')
							},
							body 		: send,
							json		: true
						})
							.then((response) =>  {
								if(response && response.id) {
									next();
								} else {
									logger.error(response);
									console.log(response); //eslint-disable-line
									next();
								}
							})
							.catch((err) => {
								logger.error(err);
								console.log(err); //eslint-disable-line
							});
					} else { // Vamos a crear un registro nuevo en apiExternal si no existe en apiExternal
						request({
							method	: 'GET',
							uri			: config.apiExternal.uri + '/api/v1/contacts/',
							headers	: {
								authorization: 'Basic ' + auth.toString('base64')
							},
							qs: {
								identification: send.identification
							},
							json		: true
						})
							.then((responses) =>  {
								if(responses && responses.length > 0) {
									this.idAPIExternal = responses[0].id;
									request({
										method	: 'PUT',
										uri			: config.apiExternal.uri + '/api/v1/contacts/' + this.idAPIExternal,
										headers	: {
											authorization: 'Basic ' + auth.toString('base64')
										},
										body 		: send,
										json		: true
									})
										.then((response) =>  {
											if(response && response.id) {
												next();
											}
										})
										.catch((err) => {
											logger.error(err);
											console.log(err); //eslint-disable-line
										});
								} else {
									request({
										method	: 'POST',
										uri			: config.apiExternal.uri + '/api/v1/contacts',
										headers	: {
											authorization: 'Basic ' + auth.toString('base64')
										},
										body 		: send,
										json		: true
									})
										.then((response) =>  {
											if(response && response.id) {
												this.idAPIExternal = response.id;
												next();
											} else {
												logger.error(response);
												console.log(response); //eslint-disable-line
												next();
											}
										})
										.catch((err) => {
											logger.error(err);
											console.log(err); //eslint-disable-line
											next();
										});
								}
							})
							.catch((err) => {
								logger.error(err);
								console.log(err); //eslint-disable-line
							});
					}
				}
			}
		})
		.catch((err) => {
			logger.error(err);
			console.log(err); //eslint-disable-line
			next();
		});
});

// Definir índices

FiscalContactSchema.index( { 'tag'						: 1 } );
FiscalContactSchema.index( { 'identification'	: 1 } );
FiscalContactSchema.index( { 'name'						: 1 } );
FiscalContactSchema.index( { 'idAPIExternal'	: 1 } );

// Compilar esquema

const FiscalContacts = mongoose.model('fiscalContacts', FiscalContactSchema);
module.exports = FiscalContacts;
