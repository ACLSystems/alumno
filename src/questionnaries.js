// Esquema para modelar cuestionarios
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

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
		enum: ['index', 'text', 'tf', 'group']
	},
	index: Number,
	text: String,
	tf: {
		type: String,
		enum: ['true', 'false']
	},
	group: {
		type: Array
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
	footerShow: {
		type: Boolean,
		default: false
	},
	text: {
		type: String
	},
	group: {
		type: [String]
	},
	help: {
		type: String
	},
	type: {
		type: String,
		enum: ['open', 'text', 'option', 'tf', 'map','group'],
		// open 	>>> pregunta abierta
		// text 	>>> pregunta con respuesta de texto
		// option >>> pregunta con opciones (opción múltiple)
		// tf			>>> verdadero(t), falso(f)
		// map		>>> Grupo de preguntas que basan sus respuestas en un set de opciones
		// group	>>> Grupo de preguntas que basan sus respuestas en un grupo de respuestas
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
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	},
	type: {
		type: String,
		enum: ['quiz','poll'],
		default: 'Quiz'
	},
	begin: {
		type: Boolean,
		default: false
	},
	minimum:  {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 60
	},
	repeatIfFail: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [5,'Maximum value is 5'],
		default: 5
	},
	repeatIfPass: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [5,'Maximum value is 5'],
		default: 5
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

const Questionnaries = mongoose.model('questionnaries', QuestionnarieSchema);
module.exports = Questionnaries;
