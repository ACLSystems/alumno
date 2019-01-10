
const mongoose 					= require('mongoose'				);
const ModSchema 				= require('./modified'			);
const Config 						= require('./config'				);
const FiscalContact 		= require('./fiscalContacts');
const Time 							= require('../shared/time'	);
const Schema 						= mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

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
		default: 'open'
	},
	invoice: {						// Se requiere factura? True: Factura, False: Ticket de Venta
		type: Boolean,
		default: false
	},
	items: [{							// Validar con el Excel
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
		tax: [{
			id: { type: String},
			name: { type: String},
			percentage: { type: String},
			description: { type: String},
			status: { type: String, enum: ['active', 'inactive']},
			type: { type: String, enum: ['IEPS', 'IVA']}
		}],
		quantity: {
			type: Number
		},
		discount: {
			type: Number
		}
	}],
	paymentMethod: {
		type: String,
		enum: ['cash','debit-card','credit-card','service-card','transfer','check','electronic-wallet','electronic-money','grocery-voucher','other'],
		default: 'other'
	},
	id: {
		type: Number
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

// Definir índices

InvoiceSchema.index( { 'requester'		: 1 	} );

InvoiceSchema.set('toObject', {getters: true});

// Compilar esquema
const Invoices = mongoose.model('invoices', InvoiceSchema);
module.exports = Invoices;
