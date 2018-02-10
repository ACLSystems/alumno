// Esquema para modelar cuestionarios
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

const OptionSchema = new Schema ({
	name: {
		type: String,
		required: true
	},
	value: {
		type: String,
		required: true
	}
});

module.exports = OptionSchema;

const AnswerSchema = new Schema ({
	type: {
		type: String,
		enum: ['index', 'text']
	},
	index: Number,
	text: String
});

module.exports = AnswerSchema;

const QuestionSchema = new Schema ({
	text: {
		type: String,
		required: true
	},
	type: {
		type: String,
		enum: ['open', 'option'],
		required: true
	},
	options: [OptionSchema],
	answers: [AnswerSchema],
	isVisible: Boolean,
	w: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 1
	}
});

module.exports = QuestionSchema;

const QuestionnarieSchema = new Schema ({
	type: {
		type: String,
		enum: ['quiz','poll'],
		default: 'Quiz'
	},
	begin: {
		type: Boolean,
		default: false
	},
	questions: [QuestionSchema],
	w: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 1
	},
	version: {
		type: String,
		min: [1, 'Questionnarie version cannot be less than 1']
	},
	keywords: [String],
	isVisible: Boolean,
	own: OwnerSchema,
	mod: [ModSchema],
	perm: PermissionsSchema
});

//const Questionnaries = mongoose.model('questionnaries', QuestionnarieSchema);
//module.exports = Questionnaries;
module.exports = QuestionnarieSchema;
