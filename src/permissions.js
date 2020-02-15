// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definir esquema y subesquemas

const PermUnitSchema = new Schema ({
	// unidad de permiso
	// permUnit.canRead
	name: {
		type: String,
		required: [true, 'User name is required to create a permission']
	},
	canRead: {
		type: Boolean,
		default: false
	},
	// permUnit.canModify
	canModify: {
		type: Boolean,
		default: false
	},
	// permUnit.canSec
	canSec: {
		type: Boolean,
		default: false
	}
}, { _id: false });

// Definir virtuals

// Definir middleware

// Definir índices

// Compilar esquema

module.exports = PermUnitSchema;

const PermissionsSchema = new Schema ({
	// matriz de permisos
	// permUnit.canRead
	users: [PermUnitSchema],
	roles: [PermUnitSchema],
	orgs: [PermUnitSchema],
	orgUnits: [PermUnitSchema]
});

// Definir virtuals

// Definir middleware

// Definir índices

// Compilar esquema

module.exports = PermissionsSchema;
