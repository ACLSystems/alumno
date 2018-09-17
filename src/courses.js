// Definir requerimientos
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permissions');
//const BlocksSchema = require('./blocks');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const CoursesSchema = new Schema ({
	code: {
		type: String,
		required: true
	},
	title: {
		type: String,
		required: true
	},
	org: {
		type: Schema.Types.ObjectId,
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
	own: OwnerSchema,
	mod: [ModSchema],
	perm: PermissionsSchema,
	blocks: [{
		type: Schema.Types.ObjectId,
		ref: 'blocks'
	}],
	resources: [{
		type: Schema.Types.ObjectId,
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
	order: {
		type: Number,
		default: 0
	}
});

// Definir virtuals

CoursesSchema.virtual('numBlocks').get(function() {
	if(this.blocks){
		return this.blocks.length;
	}	else {
		return 0;
	}
});

// Definir middleware

// Definir índices

CoursesSchema.index( { org				: 1 }	);
CoursesSchema.index( { title			: 1 } );
CoursesSchema.index( { author			: 1 } );
CoursesSchema.index( { keyworkds	: 1	}	);
CoursesSchema.index( { categories	: 1	}	);
CoursesSchema.index( { code				: 1, org: 1 }, { unique: true } );

// Compilar esquema

const Courses = mongoose.model('courses', CoursesSchema);
module.exports = Courses;
