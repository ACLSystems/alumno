
const mongoose 					= require('mongoose'				);
const request 					= require('request-promise-native');
const ModSchema 				= require('./modified'			);
const Config 						= require('./config'				);
const FiscalContact 		= require('./fiscalContacts');
const Time 							= require('../shared/time'	);
const Schema 						= mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const ItemsSchema = new Schema ({
	id: {
		type: Number
	},
	price: {
		type: Number
	},
	reference: {
		type: String
	},
	description: {
		type: String
	},
	quantity: {
		type: Number
	},
	discount: {
		type: Number
	}
}, {_id: false});

const InvoiceSchema = new Schema ({
	// Datos requeridos por el API
	requester: {
		type: Schema.Types.ObjectId,
		ref: 'users',
		required: true
	},
	fiscalTag: {
		type: Schema.Types.ObjectId,
		ref: 'fiscalContacts',
		required: true
	},
	request: {
		type: Schema.Types.ObjectId,
		ref: 'requests',
		required: true
	},
	// Datos requeridos por Alegra ------------------------------
	createDate: { 							// Fecha de Creación
		type: Date,
		default: Date.now
	},
	observations: {				// Se puede llenar como propiedad. Si no hay, buscarlo en Config
		type: String
	},
	anotation: {					// Se puede llenar como propiedad. Si no hay, buscarlo en Config. Visible en factura
		type: String
	},
	status: {							// Estatus de la factura. Siempre será 'open'
		type: String,
		enum: ['draft','open','closed','cancelled'],
		default: 'draft'
	},
	invoice: {						// Se requiere factura? True: Factura, False: Ticket de Venta
		type: Boolean,
		default: false
	},
	items: [ItemsSchema],
	paymentMethod: {
		type: String,
		enum: ['cash','debit-card','credit-card','service-card','transfer','check','electronic-wallet','electronic-money','grocery-voucher','other'],
		default: 'other'
	},
	idAPIExternal: {
		type: Number
	},
	syncAPIExternal: {
		type: 'String',
		enum: ['needed', 'complete'],
		default: 'needed'
	},
	mod: [ModSchema]
});

// Definir virtuals

InvoiceSchema.virtual('termsConditions').get(function() {
	Config.findOne({})
		.then((config) => {
			if(config && config.fiscal && config.fiscal.invoice && config.fiscal.invoice.termsConditions) {
				return config.invoice.termsConditions;
			} else {
				return undefined;
			}
		})
		.catch(() => {
			return undefined;
		});
});
InvoiceSchema.virtual('client').get(function() {
	FiscalContact.findById(this.fiscalTag)
		.then((fc) => {
			if(fc && fc.idAPIExternal) {
				return fc.idAPIExternal;
			} else {
				return undefined;
			}
		})
		.catch(() => {
			return undefined;
		});
});
InvoiceSchema.virtual('numberTemplate').get(function() {
	Config.findById({})
		.then((config) => {
			if(config && config.fiscal && config.fiscal.invoice) {
				if(this.invoice) {
					if(config.fiscal.invoice.numberTemplateInvoice) {
						return config.fiscal.invoice.numberTemplateInvoice;
					} else {
						return undefined;
					}
				} else {
					if(config.fiscal.invoice.numberTemplateSaleTicket) {
						return config.fiscal.invoice.numberTemplateSaleTicket;
					} else {
						return undefined;
					}
				}
			} else {
				return undefined;
			}
		})
		.catch(() => {
			return undefined;
		});
});
InvoiceSchema.virtual('seller').get(function() {
	Config.findOne({})
		.then((config) => {
			if(config && config.fiscal && config.fiscal.seller) {
				return config.fiscal.seller;
			} else {
				return undefined;
			}
		})
		.catch(() => {
			return undefined;
		});
});
InvoiceSchema.virtual('priceList').get(function() {
	Config.findOne({})
		.then((config) => {
			if(config && config.fiscal && config.fiscal.pricelist) {
				return config.fiscal.pricelist;
			} else {
				return undefined;
			}
		})
		.catch(() => {
			return undefined;
		});
});
InvoiceSchema.virtual('cfdiUse').get(function() {
	FiscalContact.findById(this.fiscalTag)
		.then((fc) => {
			if(fc && fc.cfdiUse) {
				return fc.cfdiUse;
			} else {
				return undefined;
			}
		})
		.catch(() => {
			return undefined;
		});
});
InvoiceSchema.virtual('stamp').get(function() {
	Config.findOne({})
		.then((config) => {
			if(config &&
				config.fiscal &&
				config.fiscal.invoice &&
				config.fiscal.invoice.stamp &&
				config.fiscal.invoice.stamp.generate) {
				return config.fiscal.invoice.stamp;
			} else {
				return { generate: false };
			}
		})
		.catch(() => {
			return undefined;
		});
});
InvoiceSchema.virtual('paymentType').get(function() {
	Config.findOne({})
		.then((config) => {
			if(config && config.fiscal && config.fiscal.invoice && config.fiscal.invoice.paymentType) {
				return config.fiscal.invoice.paymentType;
			} else {
				return undefined;
			}
		})
		.catch(() => {
			return undefined;
		});
});
InvoiceSchema.virtual('date').get(function() {
	Config.findOne({})
		.then((config) => {
			if(config && config.server && config.server.tz) {
				return Time.displayLocalTime(this.createDate,config.server.tz);
			} else {
				return undefined;
			}
		})
		.catch(() => {
			return undefined;
		});
});
InvoiceSchema.virtual('dueDate').get(function() {
	Config.findOne({})
		.then((config) => {
			if(config && config.server && config.server.tz) {
				return Time.displayLocalTime(this.createDate,config.server.tz);
			} else {
				return undefined;
			}
		})
		.catch(() => {
			return undefined;
		});
});

// Definir middleware

InvoiceSchema.pre('save', function(next) {
	Promise.all([
		Config.findOne({}),
		FiscalContact.findById(this.fiscalTag)
	])
		.then((results) => {
			//.then((config) => {
			var [config,fc] = results;
			if(config && config.apiExternal && config.apiExternal.enabled && config.apiExternal.uri) {
				if(config.apiExternal.username && config.apiExternal.token) {
					var send = cleanSend(this,config,fc);
					console.log(send);
					/*
					const auth = new Buffer.from(config.apiExternal.username + ':' + config.apiExternal.token);
					if(this.idAPIExternal) {
						request({
							method	: 'PUT',
							uri			:	config.apiExternal.uri + '/api/v1/invoices' + this.idAPIExternal,
							headers	: {
								authorization: 'Basic ' + auth.toString('base64')
							},
							body		: send,
							json		: true
						}).then(() => {
							this.syncAPIExternal = 'complete';
							next();
						}).catch((err) => {
							next(err);
						});
					} else { // Generar factura nueva
						request({
							method	: 'POST',
							uri			:	config.apiExternal.uri + '/api/v1/invoices',
							headers	: {
								authorization: 'Basic ' + auth.toString('base64')
							},
							body		: send,
							json		: true
						}).then((response) => {
							this.idAPIExternal = response.id;
						}).catch((err) => {
							next(err);
						});
					}
					*/
				}
			}
			next();
		})
		.catch((err) => {
			next(err);
		});
});

// Definir índices

InvoiceSchema.index( { 'requester'		: 1 	} );

InvoiceSchema.set('toObject', {getters: true, virtuals: true});
InvoiceSchema.set('toJSON', {getters: true, virtuals: true});

// Compilar esquema
const Invoices = mongoose.model('invoices', InvoiceSchema);
module.exports = Invoices;


// Private functions

function cleanSend(temp,config,fc) {
	var s = JSON.parse(JSON.stringify(temp));
	s.pricelist 			= config.fiscal.pricelist;
	s.seller					= config.fiscal.seller;
	s.term						= config.fiscal.term;
	if(s.invoice		) {delete s.invoice;		}
	if(s.requester	)	{delete s.requester;	}
	if(s.fiscalTag	) {delete s.fiscalTag;	}
	if(s.request		)	{delete s.request;		}
	if(s.mod				) {delete s.mod;				}
	if(s.createDate	) {delete s.createDate;	}
	if(s.id 				)	{delete s.id; 				}
	if(s.syncAPIExternal) {delete s.syncAPIExternal;}
	delete s.__v;
	delete s._id;
	if(config && config.server && config.server.tz) {
		s.date = Time.displayLocalTime(this.createDate,config.server.tz);
		s.dueDate = s.date;
	}
	if(config && config.fiscal && config.fiscal.invoice && config.fiscal.invoice.termsConditions) {
		s.termsConditions =  config.fiscal.invoice.termsConditions;
	}
	if(fc && fc.idAPIExternal) {
		s.client = {id: fc.idAPIExternal};
	}
	if(config && config.fiscal && config.fiscal.invoice) {
		if(this.invoice) {
			if(config.fiscal.invoice.numberTemplateInvoice) {
				s.numberTemplate = config.fiscal.invoice.numberTemplateInvoice;
			}
		} else {
			if(config.fiscal.invoice.numberTemplateSaleTicket) {
				s.numberTemplate = config.fiscal.invoice.numberTemplateSaleTicket;
			}
		}
	}
	if(fc && fc.cfdiUse) {
		s.cfdiUse = fc.cfdiUse;
	} else if(config && config.invoice && config.invoice.cdfiUse){
		s.cfdiUse = config.invoice.cfdiUse;
	}
	if(config &&
		config.fiscal &&
		config.fiscal.invoice &&
		config.fiscal.invoice.stamp &&
		config.fiscal.invoice.stamp.generate) {
		s.stamp = config.fiscal.invoice.stamp;
	} else {
		s.stamp = { generate: false };
	}
	if(config && config.fiscal && config.fiscal.invoice && config.fiscal.invoice.paymentType) {
		s.paymentType = config.fiscal.invoice.paymentType;
	}
	return s;
}
