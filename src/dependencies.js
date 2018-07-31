// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definir esquema y subesquemas

const DependencySchema = new Schema ({
	block: {
		type: Schema.Types.ObjectId,
		ref: 'blocks'
	},
	onBlock: {
		type: Schema.Types.ObjectId,
		ref: 'blocks'
	},
	createAttempt: {
		type: Boolean,
		default: false
	},
	track: {
		type: Boolean,
		default: false
	},
	saveTask: {
		type: Boolean,
		default: false
	}
});

// Definir virtuals

// Definir middleware

// Definir índices

DependencySchema.index( { block		: 1, onBlock: 1 }, { unique: true } );
DependencySchema.index( { onBlock	: 1							} );

// Compilar esquema

const Dependencies = mongoose.model('dependencies', DependencySchema);
module.exports = Dependencies;
