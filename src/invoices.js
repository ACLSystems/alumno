
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
	},
	tax: [{
		id: { type: Number}
	}]
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
		ref: 'fiscalContacts'
	},
	request: {
		type: Schema.Types.ObjectId,
		ref: 'requests',
		required: true
	},
	client: {
		id: {type: String}
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
	cfdiUse: {
		type: String,
		default: 'G03'
	},
	items: [ItemsSchema],
	paymentMethod: {
		type: String,
		enum: ['cash','debit-card','credit-card','service-card','transfer','check','electronic-wallet','electronic-money','grocery-voucher','other'],
		default: 'other'
	},
	paymentType: {
		type: String,
		enum: ['PUE','PPD'],
		default: 'PPD'
	},
	idAPIExternal: {
		type: Number
	},
	numberTemplate: {
		id		: {type: String},
		prefix: {type: String},
		number: {type: String},
		text	: {type: String}
	},
	syncAPIExternal: {
		type: 'String',
		enum: ['needed', 'complete'],
		default: 'needed'
	},
	total: { type: Number },
	totalPaid: {type: Number},
	balance: {type: Number},
	decimalPrecision: {type: String},
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
			if(config && config.fiscal && config.fiscal.priceList) {
				return config.fiscal.priceList;
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

InvoiceSchema.pre('save', async function(next) {

	let [config,fc] = await Promise.all([
		Config.findOne({}),
		FiscalContact.findById(this.fiscalTag).select('idAPIExternal cfdiUse')
	]);
	if(config &&
		config.apiExternal &&
		config.apiExternal.enabled &&
		config.apiExternal.uri &&
		config.apiExternal.username &&
		config.apiExternal.token) {
		this.fiscalTag 	= fc._id;
		// Nos aseguramos que cada elemento del arreglo de items lleve TAX
		if(config.fiscal &&
			config.fiscal.invoice &&
			config.fiscal.invoice.tax) { // Si hay configuración de tax...
			this.items = this.items.map(item => {item.tax = config.fiscal.invoice.tax; return item;});
		}
		let send = JSON.parse(JSON.stringify(this));
		// colocamos las propiedades definidas en la configuración
		send.priceList 	= config.fiscal.priceList;
		send.seller			= config.fiscal.seller;
		send.term				= config.fiscal.term;
		// borramos las que no necesitaremos si existen
		if(send.requester	)	{delete send.requester;	}
		if(send.fiscalTag	) {delete send.fiscalTag;	}
		if(send.request		)	{delete send.request;		}
		if(send.mod				) {delete send.mod;				}
		if(send.id 				)	{delete send.id; 				}
		if(send.syncAPIExternal) {delete send.syncAPIExternal;}
		delete send.__v;
		delete send._id;
		// colocamos fechas en el formato solicitado confirme al tz configurado
		if(config && config.server && config.server.tz) {
			const newDate = new Date();
			if(send.createDate){
				send.date = Time.displayLocalTime(send.createDate,config.server.tz);
				send.date = send.date.date;
				send.dueDate = send.date;
			} else {
				send.date = Time.displayLocalTime(newDate,config.server.tz);
				send.date = send.date.date;
				send.dueDate = send.date;
			}
		}
		// al final borramos la propiedad que no usaremos
		if(send.createDate) {delete send.createDate;}
		// agregamos propiedades necesarias
		if(config && config.fiscal && config.fiscal.invoice && config.fiscal.invoice.termsConditions) {
			send.termsConditions =  config.fiscal.invoice.termsConditions;
		}
		// agreamos al cliente (o publico en general) según sea el caso
		if(fc && fc.idAPIExternal) {
			send.client = {id: fc.idAPIExternal};
		}
		// configuramos la factura/ticket de venta
		if(config && config.fiscal && config.fiscal.invoice) {
			if(send.invoice) {
				if(config.fiscal.invoice.numberTemplateInvoice) {
					send.numberTemplate = config.fiscal.invoice.numberTemplateInvoice;
					this.numberTemplate = config.fiscal.invoice.numberTemplateInvoice;
				}
				if(fc && fc.cfdiUse) {
					send.cfdiUse	= fc.cfdiUse;
					this.cfdiUse	= fc.cfdiUse;
				} else if(config && config.invoice && config.invoice.cdfiUse){
					send.cfdiUse	= config.invoice.cfdiUse;
					this.cfdiUse	= config.invoice.cfdiUse;
				}
				if(config && config.fiscal && config.fiscal.invoice && config.fiscal.invoice.paymentType) {
					send.paymentType = config.fiscal.invoice.paymentType;
					this.paymentType = config.fiscal.invoice.paymentType;
				}
			} else {
				if(config.fiscal.invoice.numberTemplateSaleTicket) {
					send.numberTemplate = config.fiscal.invoice.numberTemplateSaleTicket;
					this.numberTemplate = config.fiscal.invoice.numberTemplateSaleTicket;
					send.paymentType 		= 'PUE';
					send.paymentMethod 	= 'cash';
					this.paymentType 		= 'PUE';
					this.paymentMethod 	= 'cash';
					delete send.cfdiUse;
					delete this.cfdiUse;
				}
			}
		}
		if(send.invoice || send.invoice === 'false') {delete send.invoice;}
		const auth = new Buffer.from(config.apiExternal.username + ':' + config.apiExternal.token);
		let options = {};
		if(this.idAPIExternal) {
			options = {
				method	: 'PUT',
				uri			:	config.apiExternal.uri + '/api/v1/invoices' + this.idAPIExternal,
				headers	: {
					authorization: 'Basic ' + auth.toString('base64')
				},
				body		: send,
				json		: true
			};
		} else {
			options = {
				method	: 'POST',
				uri			:	config.apiExternal.uri + '/api/v1/invoices',
				headers	: {
					authorization: 'Basic ' + auth.toString('base64')
				},
				body		: send,
				json		: true
			};
		}
		let response = await request(options);
		if(response){
			this.syncAPIExternal	= 'complete';
			this.idAPIExternal 		= response.id;
			this.numberTemplate		= response.numberTemplate;
			this.status						= response.status;
			this.client						= response.client;
			this.total						= response.total;
			this.totalPaid				= response.totalPaid;
			this.balance					= response.balance;
			next();
		}
	}
	next();
});

// Definir índices

InvoiceSchema.index( { 'requester'		: 1 	} );

InvoiceSchema.set('toObject', {getters: true, virtuals: true});
InvoiceSchema.set('toJSON', {getters: true, virtuals: true});

// Compilar esquema
const Invoices = mongoose.model('invoices', InvoiceSchema);
module.exports = Invoices;


// Private functions
