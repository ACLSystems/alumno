// Definir requerimientos
const mongoose 	= require('mongoose');
const auto 			= require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const RequestSchema = new Schema ({
	requester: {						//Solicitante
		type: Schema.Types.ObjectId,
		ref: 'users'
	},
	reqNumber: {
		type: Number,
		unique: true
	},
	date: {
		type: Date,
		default: Date.now
	},
	details: [],	// aquí se agregan los ids de grupos generados
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
		type: Schema.Types.ObjectId,
		ref: 'coupons'
	},
	couponHold: {
		type: Schema.Types.ObjectId,
		ref: 'couponHolders'
	},
	total: {
		type: Number,
		min: [0,'Minimum value is 0'],
		default: 0
	},
	status: {				// Estatus del proceso general: 'Solicitud', 'Cotización', 'Pago'
		type: String,
		enum: ['init','payment','done','canceled']
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
	dateCancelled: {
		type: Date
	},
	paymentSystem: {
		type: String,
		enum: ['paypal','payU','mercadoLibre']
	},
	paymentType: {
		type: String,
		enum: ['cash','creditCard','store','bank','other']
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
	paymentDates: [],
	files:[],
	fiscalFiles:[]
});

// Definir virtuals

// Definir middleware

// Definir índices

// Compilar esquema

RequestSchema.plugin(auto,{inc_field: 'reqNumber'});

const Requests = mongoose.model('requests', RequestSchema);
module.exports = Requests;
