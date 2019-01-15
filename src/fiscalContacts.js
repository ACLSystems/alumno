// Definir requerimientos
const mongoose 					= require('mongoose');
const request 					= require('request-promise-native');
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
	create: {
		type: Boolean,
		default: false
	},
	orgUnit: {
		type: Schema.Types.ObjectId,
		ref: 'orgUnits'
	},
	corporate: {
		type: Boolean,
		default: false
	},
	//lastResponse: {},
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
					var send = cleanSend(this,config);
					if(this.idAPIExternal) {
						request({
							method	: 'PUT',
							uri			: config.apiExternal.uri + '/api/v1/contacts/' + this.idAPIExternal,
							headers	: {
								authorization: 'Basic ' + auth.toString('base64')
							},
							body 		: send,
							json		: true
						}).then((response) =>  {
							this.lastResponse = response;
							next();
						}).catch((err) => {
							next(err);
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
									}).then((response) =>  {
										this.lastResponse = response;
										next();
									}).catch((err) => {
										next(err);
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
									}).then((response) =>  {
										this.lastResponse = response;
										next();
									}).catch((err) => {
										next(err);
									});
								}
							})
							.catch((err) => {
								next(err);
							});
					}
				} else {
					next();
				}
			} else {
				next();
			}
		})
		.catch((err) => {
			next(err);
		});
});

// Definir índices

FiscalContactSchema.index( { 'tag'						: 1 } );
FiscalContactSchema.index( { 'identification'	: 1 } );
FiscalContactSchema.index( { 'name'						: 1 } );
FiscalContactSchema.index( { 'idAPIExternal'	: 1 } );
FiscalContactSchema.index( { 'corporate'			: 1 }, {sparse: true});
FiscalContactSchema.index( { 'orgUnit'				: 1 }, {sparse: true});

// Compilar esquema

const FiscalContacts = mongoose.model('fiscalContacts', FiscalContactSchema);
module.exports = FiscalContacts;


function cleanSend(temp, config) {
	var s = JSON.parse(JSON.stringify(temp));
	if(s.tag					) {delete s.tag;					}
	if(s.mod					) {delete s.mod;					}
	if(s.perm					) {delete s.perm;					}
	if(s.dateSync			) {delete s.dateSync;			}
	if(s.create				) {delete s.create;				}
	if(s.corporate		) {delete s.corporate;		}
	//if(s.lastResponse	) {delete s.lastResponse;	}
	s.priceList 			= config.fiscal.priceList;
	s.seller					= config.fiscal.seller;
	s.term						= config.fiscal.term;
	delete s.__v;
	delete s._id;
	return s;
}
