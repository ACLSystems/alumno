// Definir requerimientos
const mongoose 	= require('mongoose');

const Schema 		= mongoose.Schema;
const ObjectId 	= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const TermSchema = new Schema ({
	name: {
		type: String,
		required: true
	},
	type: {
		type: String,
		enum: ['semester', 'quarter', 'trimester', 'quadmester'],
		default: 'semester'
	},
	isVisible: {
		type: Boolean,
		required: true,
		default: true
	},
	org: {
		type: ObjectId,
		ref: 'orgs'
	}
});

// Definir virtuals

// Definir middleware

// Definir índices

TermSchema.index( { org				: 1,	name: 1 }, { unique: true } );
TermSchema.index( { type			: 1 } );
TermSchema.index( { isVisible	: 1 } );

// Compilar esquema

const Term = mongoose.model('terms', TermSchema);
module.exports = Term;
