// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const SessionSchema = new Schema ({
	user: {
		type: Schema.Types.ObjectId,
		ref: 'users'
	},
	token: {
		type: String
	},
	date: {
		type: Date,
		required: true
	},
	url: {
		type: String
	}
});

// Definir virtuals

// Definir middleware

// Definir índices

SessionSchema.index( { user:  1 } );
SessionSchema.index( { date: -1 } );

// Compilar esquema

const Sessions = mongoose.model('sessions', SessionSchema);
module.exports = Sessions;
