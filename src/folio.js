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
	student: {
		type: ObjectId,
		ref: 'users',
		required: [true, '"student" es requerido']
	},
	roster: {
		type: ObjectId,
		ref: 'rosters',
		required: [true, '"roster" es requerido']
	},
	group: {
		type: ObjectId,
		ref: 'groups'
	},
	mod: [ModSchema],
});

// Definir virtuals, métodos o statics

FolioSchema.methods.assignFolio =
function() {
	var rack = hat.rack(53,10);
	this.folio = rack();
};

// Definir middleware

FolioSchema.pre('save', function(next) {
	if(!this.folio) {
		this.assignFolio();
	}
	if(this.isDirectModified('folio')){
		this.folio = this.folio.toUpperCase();
	}
	next();
});

// Definir índices

FolioSchema.index({ folio: 		1 });
FolioSchema.index({ roster: 	1 },{ unique: true });
FolioSchema.index({ groupId: 	1 });
FolioSchema.index({ student:	1 });


// Compilar esquema

const Folios = mongoose.model('folios', FolioSchema);
module.exports = Folios;
