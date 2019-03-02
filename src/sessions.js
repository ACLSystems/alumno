// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const {numVersion} = require('../shared/version');

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const DetailsSchema = new Schema({
	date: {
		type: Date,
		required: true,
		default: Date.now
	},
	url: {
		type: String
	},
	group: {
		type: Schema.Types.ObjectId,
		ref: 'groups'
	},
	course: {
		type: Schema.Types.ObjectId,
		ref: 'courses'
	}
},{ _id: false });

module.exports = DetailsSchema;

const SessionSchema = new Schema ({
	user: {
		type: Schema.Types.ObjectId,
		ref: 'users'
	},
	token: {
		type: String
	},
	details: [DetailsSchema],
	version: {
		type: String,
		default: numVersion
	},
	onlyDate: {
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
