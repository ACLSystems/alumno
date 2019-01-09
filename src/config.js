// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const ConfigSchema = new Schema({
	server: {
		tz: {
			type: String
		}
	},
	fiscal: {
		pricelist: { //Colocar el default de la lista de precios
			id: {
				type: String
			},
			name: {
				type: String
			}
		},
		seller: { //Colocar el vendedor por default
			id: {
				type: String
			},
			name: {
				type: String
			},
			identification: {
				type: String
			}
		},
		term: { //Colocar el término de pago por default
			id: {
				type: String
			},
			name: {
				type: String
			},
			days: {
				type: String
			}
		},
		invoice: {
			paymentSystem : {
				type: String
			},
			observations: {
				type: String
			},
			anotation: {
				type: String
			},
			termsConditions: {
				type: String
			},
			status: {
				type: String,
				default: 'open'
			},
			numberTemplateInvoice: {
				type: String
			},
			numberTemplateSaleTicket: {
				type: String
			},
			paymentMethod: {
				type: String,
				enum: ['cash','debit-card','credit-card','service-card','transfer','check','electronic-wallet','electronic-money','grocery-voucher','other'],
				default: 'other'
			},
			cfdiUse: {
				type: String
			},
			stamp: {
				generate: {
					type: Boolean
				}
			},
			paymentType: {
				type: String,
				enum: ['PUE','PPD'],
				default: 'PPD'
			},
			tax: {
				id: { type: String},
				name: { type: String},
				percentage: { type: String},
				description: { type: String},
				status: { type: String, enum: ['active', 'inactive'], default: 'active'},
				type: { type: String, enum: ['IEPS', 'IVA'], default: 'IVA'}
			}
		}
	},
	apiExternal: {
		uri: {
			type: String
		},
		username: {
			type: String
		},
		token: {
			type: String
		},
		enabled: {
			type: Boolean,
			default: false
		}
	},
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	}
});

// Definir middleware

// Definir índices

// Compilar esquema

const Config = mongoose.model('config', ConfigSchema, 'config');
module.exports = Config;
