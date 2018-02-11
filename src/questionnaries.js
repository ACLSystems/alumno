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
		enum: ['index', 'text', 'tf']
	},
	index: Number,
	text: String,
	tf: {
		type: String,
		enum: ['true', 'false']
	}
});

module.exports = AnswerSchema;

const QuestionSchema = new Schema ({
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
	help: {
		type: String
	},
	type: {
		type: String,
		enum: ['open', 'text', 'option', 'tf'],
		// open 	>>> pregunta abierta
		// text 	>>> pregunta con respuesta de texto
		// option >>> pregunta con opciones (opción múltiple)
		// tf			>>> verdadero(t), falso(f)
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
