// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const ItemsSchema = new Schema ({
	itemCode: {
		type: String,
		required: true
	},
	itemDescription: {
		type: String,
		required: true
	},
	groupRelated: {
		type: Schema.Types.ObjectId,
		ref: 'groups'
	},
	file: {
		type: String
	},
	number: {
		type: Number,
		required: true
	},
	unitPrice: {
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
	subTotal: {
		type: Number,
		min: [0,'Minimum value is 0'],
		default: 0
	},
	released: {
		type: Boolean,
		default: false
	}
});

// Definir virtuals

// Definir middleware

// Definir índices

// Compilar esquema

module.exports = ItemsSchema;

const RequestSchema = new Schema ({
	requester: {						//Solicitante
		type: Schema.Types.ObjectId,
		ref: 'users'
	},
	assigned: {							// Asignado o quien atiende la solicitud
		type: Schema.Types.ObjectId,
		ref: 'users'
	},
	type: {									// tipo de solicitud: creación de grupo o abordaje de alumnos a grupo
		type: String,
		enum: ['groupCreation', 'rosterOnboarding']
	},
	description: {					// descripción o detalle de la solicitud
		type: String
	},
	details: [ItemsSchema],	// elementos de la solicitud
	processStatus: {				// Estatus del proceso general: 'Solicitud', 'Cotización', 'Pago'
		type: String,
		enum: ['request','quote','payment','done','canceled']
	// 												 Estado 'request': el proceso está todavía en la primera etapa: solicitud.
	//																						En esta etapa se recibe, analiza y valida la solicitud
	// 												 Estado 'quote': el proceso avanza a la segunda etapa: cotización.
	//																						Una vez validada la solicitud, se genera la cotización
	//																						de los elementos solicitados
	// 												 Estado 'payment': el proceso avanza a la tercera etapa: pago.
	//																						La cotización se entrega al cliente, junto con instrucciones
	//																						de pago.
	// 												 Estado 'done': el proceso termina con: finalizado (done).
	//																						El pago se ha recibido y se liberan los cursos/grupos
	// 												 Estado 'canceled': el proceso se interrumpe y finaliza.
	//																						en este estado, la razón de la cancelación se debe documentar
	//																						en el campo 'processStatusReason'
	},
	processStatusReason: {	// Documentación del estado 'cancelado' en processStatus
		type: String
	},
	requestStatus: {				// Estatus de la solicitud: recibida, respondida
		type: String,					// cuando es respondida el proceso avanza a la siguente etapa: cotización (usar el esquema ItemsSchema)
		enum: ['received','responded']		// También cambia el Estatus del proceso a 'quote'
	},
	quoteStatus: {					// Estatus de la cotización: 'En progreso', 'Respondido', 'Aceptado', 'Rechazado'
		type: String,
		enum: ['inProgress','answered','acepted','rejected']
	},
	// 												 Estado 'inProgress': Incia el proceso de la generación de cotización
	// 												 Estado 'answered': Se termina la cotización y esta se envia al Solicitante
	// 												 Estado 'acepted': El solicitante responde con la aceptación de la cotización.
	//																						Se procede a la entrega de datos de pago. Termina esta etapa
	// 												 Estado 'rejected': El solicitante responde con una negativa de la cotización.
	//																						Se documenta el campo "quoteStatusReason" para saber porqué
	//																						el cliente no aceptó la cotización.: Pueden suceder dos cosas:
	//																						a) se genera una nueva cotización, o b) se termina el proceso
	quoteFile: {						// Archivo generado de la cotización (PDF) que es entregado al cliente
		type: String
	},
	quoteStatusReason: {		// Documentación del estado "rejected" en quoteStatus
		type: String
	},
	quotePaymentFile: {			// Archivo que se entrega al cliente con instrucciones de pago una vez que la cotización
	//																						es aceptada
		type: String
	},
	paymentStatus: {				// Estatus del pago: 'Pendiente', 'Pago Parcial', 'Completado', 'Otorgado'
		type: String,
		enum: ['pending','incomplete','complete','granted']
	},
	paymentNotes: {
		type: String
	},
	// 												 Estado 'pending': El pago sigue pendiente y no se pueden liberar los elementos solicitados
	// 												 Estado 'incomplete': Se ha hecho un pago parcial. Si esto está documentado en 'paymentNotes'
	//																						y así acordado, se pueden liberar los elementos individuales
	//																						mediante el campo 'released' del esquema 'ItemsSchema'
	// 												 Estado 'complete': El pago se ha completado y se deben liberar todos los elementos de la
	//																						solicitud mediante el campo 'released' del esquema 'ItemsSchema'
	// 												 Estado 'granted': "Supérate México" decide liberar los elementos solicitados sin esperar
	//																						el pago. Se debe documentar en el campo 'paymentStatusReason'
	//																						indicando quién autoriza esta liberación
	paymentDate: {
		type: Date
	},
	paymentStatusReason: {
		type: String
	}
});

// Definir virtuals

// Definir middleware

// Definir índices

// Compilar esquema

const Requests = mongoose.model('requests', RequestSchema);
module.exports = Requests;
