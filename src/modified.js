// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var date = new Date();

// Definir esquema y subesquemas

const ModSchema = new Schema ({
	by: {
		type: String,
		required: true,
		default: 'anon'
	},
	when: {
		type: Date,
		required: true,
		default: date
	},
	what: {
		type: String,
		required: true,
		default: 'Modified'
	}
},{ _id: false });

// Definir virtuals

// Definir middleware

// Definir índices

// Compilar esquema

module.exports = ModSchema;
