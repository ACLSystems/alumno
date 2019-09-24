// Definir requerimientos
const mongoose 					= require('mongoose');
const hat 							= require('hat');
const ModSchema 				= require('./modified');

const Schema 						= mongoose.Schema;
const ObjectId 					= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const FolioSchema = new Schema ({
	folio: {
		type: String,
		required: [true, '"folio" es requerido']
	},
	status: {
		type: String,
		enum: [
			'pending',
			'payed',
			'canceled'
		],
		default: 'pending'
	},
	user: {
		type: ObjectId,
		ref: 'users',
		required: [true, '"student" es requerido']
	},
	roster: {
		type: ObjectId,
		ref: 'rosters',
		required: [true, '"roster" es requerido']
	},
	mod: [ModSchema],
});

// Definir virtuals, métodos o statics

FolioSchema.methods.assignFolio =
function() {
	var rack = hat.rack(72,17);
	this.folio = rack();
};

// Definir middleware

FolioSchema.pre('save', function(next) {
	if(!this.folio) {
		this.assignFolio();
	}
	next();
});

// Definir índices

FolioSchema.index({ folio: 1});

// Compilar esquema

const Folios = mongoose.model('folios', FolioSchema);
module.exports = Folios;
