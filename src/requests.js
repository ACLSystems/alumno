// Definir requerimientos
const mongoose 					= require('mongoose');
const ModSchema 				= require('./modified');
const OwnerSchema 			= require('./owner');
const PermissionsSchema = require('./permissions');
const auto 							= require('mongoose-sequence')(mongoose);

const Schema 						= mongoose.Schema;
const ObjectId 					= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const RequestSchema = new Schema ({
	requester: {						//Solicitante
		type: ObjectId,
		ref: 'users'
	},
	label: {
		type: String
	},
	tags: [{
		type: String
	}],
	fiscalTag: {
		type: ObjectId,
		ref: 'fiscalContacts'
	},
	reqNumber: {
		type: Number,
		unique: true
	},
	date: {
		type: Date,
		default: Date.now
	},
	details: [{
		kind: {
			type: String,
			enum: ['users', 'discussions', 'blocks', 'groups', 'certificates','courses', 'files','notifications','orgs', 'orgUnits', 'requests', 'rosters', 'tasks', 'questionnaries'],
			default: 'groups'
		},
		item: {
			type: ObjectId,
			refPath: 'details.kind'
		}
	}],	// aquí se agregan los ids de grupos generados
	temp1: [],
	temp2: [],
	temp3: [],
	items: [],
	subtotal: {
		type: Number,
		min: [0,'Minimum value is 0'],
		default: 0
	},
	discount: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	},
	coupon: {
		type: ObjectId,
		ref: 'coupons'
	},
	couponHold: {
		type: ObjectId,
		ref: 'couponHolders'
	},
	tax: {
		type: Number,
		min: [0,'Minimum value is 0'],
		default: 0
	},
	total: {
		type: Number,
		min: [0,'Minimum value is 0'],
		default: 0
	},
	status: {				// Estatus del proceso general: 'Solicitud', 'Cotización', 'Pago'
		type: String,
		enum: ['init','payment','done','cancelled'],
		default: 'init'
	// 												 Estado 'init': el usuario está generando la solicitud.
	// 												 Estado 'payment': el usuario ha terminado y el proceso avanza a la etapa de pago.
	// 												 Estado 'done': Se recibe el pago de la solicitud.
	// 												 Estado 'canceled': el proceso se interrumpe y finaliza.
	//																						en este estado, la razón de la cancelación se debe documentar
	//																						en el campo 'statusReason'
	},
	statusReason: {	// Documentación del estado 'cancelado' en status
		type: String
	},
	dateFinished: {
		type: Date
	},
	dateCancelled: {
		type: Date
	},
	paymentSystem: {
		type: String,
		enum: ['direct','paypal','payU','mercadoLibre']
	},
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
	paymentStatus: {				// Estatus del pago: 'Pendiente', 'Pago Parcial', 'Completado', 'Otorgado'
		type: String,
		enum: ['pending','partial','complete','granted']
	},
	// 												 Estado 'pending'		: El pago está pendiente
	// 												 Estado 'incomplete': Se ha hecho un pago parcial. Si esto está documentado en 'paymentNotes'
	//																						y así acordado, se pueden liberar los elementos individuales
	//																						mediante el campo 'released' del esquema 'ItemsSchema'
	// 												 Estado 'complete'	: El pago se ha completado y se deben liberar todos los elementos de la
	//																						solicitud mediante el campo 'released' del esquema 'ItemsSchema'
	// 												 Estado 'granted'		: "Supérate México" decide liberar los elementos solicitados sin esperar
	//																						el pago. Se debe documentar en el campo 'paymentStatusReason'
	//																						indicando quién autoriza esta liberación
	paymentNotes: [],
	filesNotes: [],
	files:[{
		type: ObjectId,
		ref: 'files'
	}],
	fiscalFiles:[],
	invoiceFlag: {
		type: Boolean
	},
	invoice: {
		type: ObjectId,
		ref: 'invoices'
	},
	mod: [ModSchema],
	own: OwnerSchema,
	perm: PermissionsSchema
});

// Definir virtuals

// Definir middleware

// Definir índices

RequestSchema.index( { 'requester'		: 1 	} );
RequestSchema.index( { 'label'				: 1 	} );
RequestSchema.index( { 'tags'					: 1 	} );
RequestSchema.index( { 'date'					: 1 	} );
RequestSchema.index( { 'status'				: 1 	} );
RequestSchema.index( { 'reqNumber'		: -1 	} );

// Compilar esquema

RequestSchema.plugin(auto,{inc_field: 'reqNumber'});

const Requests = mongoose.model('requests', RequestSchema);
module.exports = Requests;
