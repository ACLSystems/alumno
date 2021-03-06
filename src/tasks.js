// Definir requerimientos
const mongoose 					= require('mongoose');
const ModSchema 				= require('./modified');
const PermissionsSchema = require('./permissions');
const OwnerSchema 			= require('./owner');
const Schema 						= mongoose.Schema;
const ObjectId 					= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const ArrangeSchema = new Schema({
	left: {
		type: String,
		default: ''
	},
	middle1: {
		type: String,
		default: ''
	},
	middle2: {
		type: String,
		default: ''
	},
	right: {
		type: String,
		default: ''
	}
},{_id:false});

const StyleSchema = new Schema({
	bgLg: ArrangeSchema,
	bgMd: ArrangeSchema,
	bgSm: ArrangeSchema,
	colorLg: ArrangeSchema,
	colorMd: ArrangeSchema,
	colorSm: ArrangeSchema
},{_id:false});

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
		enum: ['file','text','textarea','ddlmmr','ddlmr','ddlm'],
		required: true
	},
	files: {
		type: [String]
	},
	dd:{
		type: String,
		enum: ['one','many','none'],
		default: 'many'
	},
	array1: [String],
	array2: [String],
	style: StyleSchema,
	w: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 1
	},
	notifications: {
		type: [ObjectId],
		ref: 'notifications'
	}
});

// Definir virtuals

// Definir middleware

module.exports = ItemSchema;

const TaskSchema = new Schema ({
	org: {
		type: ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: ObjectId,
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

// Definir virtuals

// Definir middleware

// Definir índices

const Tasks = mongoose.model('tasks', TaskSchema);
module.exports = Tasks;
