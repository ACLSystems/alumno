// Esquema para modelar bloques
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const BlocksSchema = new Schema ({
	org: {
		type: Schema.Types.ObjectId,
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
		type: Schema.Types.ObjectId,
		ref: 'questionnaries'
	},
	tasks: [{
		type: Schema.Types.ObjectId,
		ref: 'tasks'
	}],
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

BlocksSchema.index( { org: 1, code: 1}, { unique: true } );

const Blocks = mongoose.model('blocks', BlocksSchema);
module.exports = Blocks;
