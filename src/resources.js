const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permissions');
//const BlocksSchema = require('./blocks');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const ResourceSchema = new Schema({
	title: {
		type: String,
		required: true
	},
	content: {
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
	perm: PermissionsSchema
});

const Resources = mongoose.model('resources', ResourceSchema);
module.exports = Resources;
