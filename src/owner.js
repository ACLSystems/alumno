// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definir esquema y subesquemas

const OwnerSchema = new Schema ({
	user: {
		type: String,
		required: true
	},
	org: {
		type: String,
		required: true
	},
	orgUnit: {
		type: String,
		required: true
	}
},{ _id: false });

// Definir virtuals

// Definir middleware

// Definir índices

// Compilar esquema

module.exports = OwnerSchema;
