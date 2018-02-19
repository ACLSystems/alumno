// Esquema para modelar Tareas
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const PermissionsSchema = require('./permissions');
const OwnerSchema = require('./owner');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const TaskSchema = new Schema ({
	title: {
		type: String,
		required: true
	},
	description: {
		type: String
	},
	content: {
		type: String
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
	status: {
		type: String,
		enum: ['draft','published'],
		default: 'draft'
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
	own: {OwnerSchema},
	mod: [{ModSchema}],
	perm: {PermissionsSchema}
});

//const Task = mongoose.model('tasks', TaskSchema);
//module.exports = Task;
module.exports = TaskSchema;
