// Definir requerimientos
const mongoose 					= require('mongoose');
const ModSchema 				= require('./modified');
const OwnerSchema 			= require('./owner');
const PermissionsSchema = require('./permissions');
//const BlocksSchema = require('./blocks');

const Schema 						= mongoose.Schema;
const ObjectId 					= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

// Esquema para datos de API external de facturacion
const APIExternalSchema = new Schema ({
	id: {
		type: Number
	},
	name: {
		type: String,
		maxlength: 150
	},
	description: {
		type: String,
		maxlength: 500
	},
	reference: {
		type: String,
		maxlength: 45
	}
},{ _id: false });

module.exports = APIExternalSchema;

const CoursesSchema = new Schema ({
	code: {
		type: String,
		required: true
	},
	imageSponsor: {
		type: String
	},
	title: {
		type: String,
		required: true
	},
	org: {
		type: ObjectId,
		ref: 'orgs'
	},
	type: {
		type: String,
		enum: ['self-paced','tutor', 'assisted']
	},
	level: {
		type: String,
		enum: ['basic','intermediate','advanced','expert'],
		default: 'basic'
	},
	author: {
		type: String,
		required: true
	},
	categories: {
		type: [String],
		required: true
	},
	isVisible: {
		type: Boolean,
		default: true
	},
	keywords: {
		type: [String]
	},
	description: {
		type: String
	},
	image: {
		type: String
	},
	details: {
		type: String
	},
	syllabus: {
		type: String
	},
	version: {
		type: Number,
		default: 1,
		min: [0,'Version cannot be less than 0']
	},
	price: {
		type: Number,
		default: 0,
		min: [0,'Course price cannot be less than 0']
	},
	cost: {
		type: Number,
		default: 0,
		min: [0,'Course cost cannot be less than 0']
	},
	moocPrice: {
		type: Number,
		default: 0,
		min: [0,'Course cost cannot be less than 0']
	},
	noCertificate: {
		type: Boolean,
		default: false
	},
	hideEnroll: {
		type: Boolean,
		default: false
	},
	request: {
		type: String,
		default: ''
	},
	own: OwnerSchema,
	mod: [ModSchema],
	perm: PermissionsSchema,
	blocks: [{
		type: ObjectId,
		ref: 'blocks'
	}],
	resources: [{
		type: ObjectId,
		ref: 'resources'
	}],
	currentSection	: {
		type: Number,
		default: 0
	},
	nextNumber	: {
		type: Number,
		default: 0
	},
	status: {
		type: String,
		enum: ['draft','published'],
		default: 'draft'
	},
	duration: {
		type: Number,
		min: [0, 'Course duration cannot be less than 0'],
		default: 0
	},
	durationUnits: {
		type: String,
		enum: ['s', 'm', 'h', 'd', 'w', 'mo', 'y'],
		default: 'h'
	},
	defaultDaysDuration: {
		type: Number,
		min: [0, 'Course duration cannot be less than 0'],
		default: 60
	},
	order: {
		type: Number,
		default: 0
	},
	priority: {
		type: String,
		enum: ['new','popular','standard'],
		default: 'standard'
	},
	apiExternal: APIExternalSchema,
	instances: [String]
});

// Definir virtuals

CoursesSchema.virtual('numBlocks').get(function() {
	if(this.blocks){
		return this.blocks.length;
	}	else {
		return 0;
	}
});

CoursesSchema.virtual('IVA').get(function() {
	return process.env.IVA;
});

// Definir middleware

// Definir índices

CoursesSchema.index( { org				: 1 }	);
CoursesSchema.index( { title			: 1 } );
CoursesSchema.index( { author			: 1 } );
CoursesSchema.index( { keyworkds	: 1	}	);
CoursesSchema.index( { categories	: 1	}	);
CoursesSchema.index( { code				: 1, org: 1 }, { unique: true } );
CoursesSchema.index( { priority		: 1	}	);

// Compilar esquema

const Courses = mongoose.model('courses', CoursesSchema);
module.exports = Courses;
