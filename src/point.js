// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definir esquema y subesquemas

const PointSchema = new Schema ({
	type: {
		type: String,
		default: 'Point'
	},
	coordinates: {
		type: [Number],
		index: '2dsphere'     // esto le dice a Mongo que son coordenadas de tipo "2DSphere"
	}
});


// Definir virtuals

// Definir middleware

// Definir índices

// Compilar esquema

module.exports = PointSchema;
