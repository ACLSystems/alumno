// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const CareerSchema = new Schema ({
	name: {
		type: String,
		required: true
	},
	longName: {
		type: String,
		required: true
	},
	area: {
		type: String,
		required: true
	},
	isVisible: {
		type: Boolean,
		required: true,
		default: true
	},
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	}
});

// Definir middleware

// Definir índices

CareerSchema.index( { org		: 1					} );
CareerSchema.index( { area	: 1					} );
CareerSchema.index( { name	: 1, org: 1	}, { unique: true } );

// Compilar esquema 

const Career = mongoose.model('careers', CareerSchema);
module.exports = Career;
