// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const ControlSchema = new Schema({
	name: {
		type: String,
		default: 'Alumno',
		unique: [true, 'Control name already exists. Please verify']
	},
	version: {
		type: String
	},
	schemas: [String],
	mongo: {
		type: String
	},
	mongoose: {
		type: String
	},
	host: {
		type: String
	}
});

// Definir middleware

// Definir índices

// Compilar esquema

const Control = mongoose.model('control', ControlSchema, 'control');
module.exports = Control;
