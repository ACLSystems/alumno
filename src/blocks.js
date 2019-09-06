// Definir requerimientos
const mongoose 					= require('mongoose');
const ModSchema 				= require('./modified');
const OwnerSchema 			= require('./owner');
const PermissionsSchema = require('./permissions');

const Schema 						= mongoose.Schema;
const ObjectId 					= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const BlocksSchema = new Schema ({
	org: {
		type: ObjectId,
		ref: 'orgs'
	},
	code: {
		type: String,
		required: true
	},
	type: {
		type: String,
		enum: ['text','textVideo','video','task','questionnarie'],
		default: 'text'
	},
	title: {
		type: String,
		required: true
	},
	begin: {
		type: Boolean,
		default: false
	},
	section: Number,
	number: Number,
	order: Number,
	content: String,
	media: [String],
	keywords: [String],
	defaultmin: {
		type: Number,
		required: true,
		default: 5
	},
	rules: String,
	questionnarie: {
		type: ObjectId,
		ref: 'questionnaries'
	},
	task: {
		type: ObjectId,
		ref: 'tasks'
	},
	wq: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	},
	wt: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	},
	w: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	},
	duration: {
		type: Number,
		min: [0, 'Block duration cannot be less than 0'],
		default: 0
	},
	durationUnits: {
		type: String,
		enum: ['s', 'm', 'h', 'd', 'w', 'mo', 'y'],
		default: 'h'
	},
	status: {
		type: String,
		enum: ['draft','published'],
		default: 'draft'
	},
	version: {
		type: Number,
		min: [1, 'Block version cannot be less than 1'],
		default: 1
	},
	isVisible: {
		type: Boolean,
		default: false
	},
	own: OwnerSchema,
	mod: [ModSchema],
	perm: PermissionsSchema
});

// Definir virtuals

// Definir middleware

BlocksSchema.virtual('wTotal').get(function() {
	return this.wq + this.wt;
});

// Definir índices

BlocksSchema.index( { org				: 1, code: 1}, { unique: true } );
BlocksSchema.index( { w					: 1					} );
BlocksSchema.index( { wq				: 1					} );
BlocksSchema.index( { wt				: 1					} );
BlocksSchema.index( { code			: 1					} );
BlocksSchema.index( { type			: 1					} );
BlocksSchema.index( { title			: 1					} );
BlocksSchema.index( { status		: 1					} );
BlocksSchema.index( { keywords	: 1					} );
BlocksSchema.index( { isVisible	: 1					} );

// Compilar esquema

const Blocks = mongoose.model('blocks', BlocksSchema);
module.exports = Blocks;
