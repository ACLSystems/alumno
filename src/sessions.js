// Definir requerimientos
const mongoose 	= require('mongoose');

const Schema 		= mongoose.Schema;
const ObjectId 	= Schema.Types.ObjectId;

const {numVersion} = require('../version/version');

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const SessionSchema = new Schema ({
	user: {
		type: ObjectId,
		ref: 'users'
	},
	token: {
		type: String
	},
	version: {
		type: String,
		default: numVersion
	},
	onlyDate: {
		type: String
	},
	date: {
		type: Date,
		required: true,
		default: Date.now
	},
	url: {
		type: String
	},
	group: {
		type: ObjectId,
		ref: 'groups'
	},
	course: {
		type: ObjectId,
		ref: 'courses'
	}
});

// Definir virtuals

// Definir middleware

// Definir índices

SessionSchema.index( { user			:  1 } );
SessionSchema.index( { onlyDate	:  1 } );
SessionSchema.index( { date			: -1 } );

// Compilar esquema

const Sessions = mongoose.model('sessions', SessionSchema);
module.exports = Sessions;
