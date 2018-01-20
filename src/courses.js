// Esquema para modelar cursos
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permissions');
//const BlocksSchema = require('./blocks');
const Schema = mongoose.Schema;

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
		type: String,
		required: true
	},
	type: {
		type: String,
		enum: ['Self-paced','Tutor']
	},
	level: {
		type: String,
		enum: ['Basic','Intermediate','Advanced','Expert'],
		default: 'Basic'
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
	status: {
		type: String,
		enum: ['Draft','Published'],
		default: 'Draft'
	}
});

CoursesSchema.index( { code: 1, title: 1, org: 1}, { unique: true } );
CoursesSchema.index( { org: 1 }, { unique: false } );
const Courses = mongoose.model('courses', CoursesSchema);
module.exports = Courses;
