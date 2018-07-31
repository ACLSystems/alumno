// Definir requerimientos
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const OrgsSchema = new Schema ({
	name: {
		type: String,
		validate: {
			validator: (name) => name.length > 2,
			message: '"name" must have more than 2 characters'
		},
		required: [ true, '"name" es requerido'],
		lowercase: true,
		unique: true
	},
	longName: {
		type: String,
		validate: {
			validator: (longName) => longName.length > 2,
			message: '"longName" must have more than 2 characters'
		},
		required: [ true, '"longName" es required']
	},
	alias:{
		type: [String]
	},
	isActive: {
		type: Boolean,
		default: true
	},
	mod: [ModSchema],
	perm: PermissionsSchema,
});

// Definir virtuals

// Definir middleware

OrgsSchema.pre('save', function(next) {
	this.name = this.name.toLowerCase();
	next();
});

// Definir índices

OrgsSchema.index({ isActive: 1});

// Compilar esquema

const Orgs = mongoose.model('orgs', OrgsSchema);
module.exports = Orgs;
