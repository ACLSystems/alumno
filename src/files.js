// Definir requerimientos
const mongoose 	= require('mongoose');

const Schema 		= mongoose.Schema;
const ObjectId 	= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const FileSchema = new Schema ({
	name: {
		type: String,
		required: true
	},
	mimetype: {
		type: String,
		required: true
	},
	filename: {
		type: String,
		required: true
	},
	path: {
		type: String,
		required: true
	},
	size: {
		type: Number,
		required: true,
		default: 0
	},
	user: {
		type: ObjectId,
		ref: 'users'
	},
	createDate: {
		type: Date,
		default: Date.now
	}
});

// Definir virtuals

// Definir middleware

// Definir índices

FileSchema.index( { name: 1 } );

// Compilar esquema

const File = mongoose.model('files', FileSchema);
module.exports = File;
