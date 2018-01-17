// Esquema para modelar Unidades Organizacionales
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
});

module.exports = PermUnitSchema;

const PermissionsSchema = new Schema ({
	// matriz de permisos
	// permUnit.canRead
	users: [PermUnitSchema],
	roles: [PermUnitSchema],
	orgs: [PermUnitSchema],
	orgUnits: [PermUnitSchema]
});

module.exports = PermissionsSchema;
