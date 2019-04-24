// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definir esquema y subesquemas

const ErrorsSchema = new Schema ({
	error: {
		type: Schema.Types.Mixed,
		required: true
	},
	errorObj: {
		type: String
	},
	errorType: {
		type: String
	},
	controller: {
		type: String
	},
	section: {
		type: String
	},
	stack: {
		type: String
	},
	info: {
		type: String
	},
	date: {
		type: Date,
		default: Date.now
	},
	status: {
		type: String,
		enum: ['open','closed'],
		default: 'open'
	}
});

// Definir virtuals

// Definir middleware

// Definir índices

ErrorsSchema.index( { controller		:  1	} );
ErrorsSchema.index( { errorType			:  1	} );
ErrorsSchema.index( { date					:  -1	} );
ErrorsSchema.index( { status				:  1	} );

// Compilar esquema

const Errors = mongoose.model('errors', ErrorsSchema);
module.exports = Errors;
