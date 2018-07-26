// Esquema para modelar Tareas
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const PermissionsSchema = require('./permissions');
const OwnerSchema = require('./owner');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const ItemSchema = new Schema ({
	header: {
		type: String
	},
	footer: {
		type: String
	},
	text: {
		type: String,
		required: true
	},
	label: {
		type: String
	},
	type: {
		type: String,
		enum: ['file','text','textarea'],
		required: true
	},
	files: {
		type: [String]
	},
	w: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 1
	},
	notifications: {
		type: [Schema.Types.ObjectId],
		ref: 'notifications'
	}
});

module.exports = ItemSchema;

const TaskSchema = new Schema ({
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: Schema.Types.ObjectId,
		ref: 'orgUnits'
	},
	items: [ItemSchema],
	status: {
		type: String,
		enum: ['draft','published'],
		default: 'published'
	},
	version: {
		type: Number,
		min: [1, 'Task version cannot be less than 1']
	},
	keywords: {
		type: [String]
	},
	isVisible: {
		type: Boolean,
		default: true
	},
	justDelivery: {
		type: Boolean,
		default: false
	},
	own: {OwnerSchema},
	mod: [{ModSchema}],
	perm: {PermissionsSchema}
});

const Tasks = mongoose.model('tasks', TaskSchema);
module.exports = Tasks;
