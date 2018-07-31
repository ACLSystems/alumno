// Definir requerimientos
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const ResourceSchema = new Schema({
	title: {
		type: String,
		required: true
	},
	content: {
		type: String
	},
	embedded: {
		type: String
	},
	status: {
		type: String,
		enum: ['draft','published'],
		default: 'published'
	},
	isVisible: {
		type: Boolean,
		default: true
	},
	own: OwnerSchema,
	mod: [ModSchema],
	perm: PermissionsSchema,
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	},
	course: {
		type: Schema.Types.ObjectId,
		ref: 'courses'
	}
});

// Definir virtuals

// Definir middleware

// Definir índices

ResourceSchema.index( { title: 1, org: 1, course: 1}, { unique: true } );

// Compilar esquema

const Resources = mongoose.model('resources', ResourceSchema);
module.exports = Resources;
