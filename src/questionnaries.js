// Definir requerimientos
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

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

// Definir virtuals

// Definir middleware

// Definir índices

module.exports = OptionSchema;

// Definir esquema y subesquemas

const AnswerSchema = new Schema ({
	type: {
		type: String,
		enum: ['index', 'text', 'tf', 'group','none']
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

// Definir virtuals

// Definir middleware

// Definir índices

module.exports = AnswerSchema;

// Definir esquema y subesquemas

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
	label: {
		type: String
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
		enum: ['open', 'text', 'option', 'tf', 'map','group','none'],
		// open 	>>> pregunta abierta
		// text 	>>> pregunta con respuesta de texto
		// option >>> pregunta con opciones (opción múltiple)
		// tf			>>> verdadero(t), falso(f)
		// map		>>> Grupo de preguntas que basan sus respuestas en un set de opciones
		// group	>>> Grupo de preguntas que basan sus respuestas en un grupo de respuestas
		// none		>>> Preguntas vacías (sin preguntas y sin respuesta). Sirven para colocar texto en medio de los cuestionarios.
		required: true
	},
	options: [OptionSchema],
	answers: [AnswerSchema],
	isVisible: {
		type: Boolean,
		default: true
	},
	display: [{
		type: String,
		enum: ['0','1'],
		default: 1
		// Display permite mostrar u ocultar la pregunta
	}],
	w: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 1
		// W es el peso que lleva esta pregunta.
	}
});

// Definir virtuals

// Definir middleware

// Definir índices

module.exports = QuestionSchema;

// Definir esquema y subesquemas

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
	maxAttempts: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [10,'Maximum value is 10'],
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
	isVisible: {
		type: Boolean,
		default: true
	},
	own: OwnerSchema,
	mod: [ModSchema],
	perm: PermissionsSchema
});

// Definir virtuals

// Definir middleware

// Definir índices

const Questionnaries = mongoose.model('questionnaries', QuestionnarieSchema);
module.exports = Questionnaries;
