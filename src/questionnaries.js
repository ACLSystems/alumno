// Definir requerimientos
const mongoose 					= require('mongoose');
const ModSchema 				= require('./modified');
const OwnerSchema 			= require('./owner');
const PermissionsSchema = require('./permissions');

const Schema 						= mongoose.Schema;
const ObjectId 					= Schema.Types.ObjectId;

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
	},
	eval: {
		type: Number
		// Eval se usa para las preguntas de tipo "test"
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
		default: '1'
		// El orden como queremos que aparezca en angular
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
		type: ObjectId,
		ref: 'orgs'
	},
	type: {
		type: String,
		enum: ['quiz','poll','exam','test'],
		// Cualquier tipo de cuestionario puede ser parte de la calificación final
		// Los tipos de cuestionarios pueden ser:
		// ** quiz ** -->	Para exámenes rápidos y de pocas preguntas donde el autor/profesor/tutor
		//								quiere solo evaluar el conocimiento y progreso del alumno. Los resultados
		//								se presentan o no (configurable) al finalizar el cuestionario.
		// ** poll ** --> Estos cuestionarios sirven como encuestas dentro del curso. Por lo regular
		//								no se toman en cuenta para calificación. (eso se regula con los ponderadores)
		// ** exam ** --> Estos cuestionarios normalmente son los ideales para evaluar el progreso
		//								del alumno en el curso. Constan normalmente de una gran cantidad de preguntas
		//								A estos cuestionarios se les añade un reloj (configurable) para obligar al alumno
		//								o no intentar la copia del examen. También se pueden utilizar funcionalidades como
		//								Preguntas aleatorias, muestra de preguntas, etc.
		// ** test ** --> Estos cuestionarios normalmente se utilizan para hacer evaluaciones de tipo
		//								diagnóstico, donde los resultados son presentados regularmente al finalizar el
		//								cuestionario. Para estos cuestionarios normalmente se deben usar preguntas de tipo
		//								diagnóstico.
		default: 'quiz'
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
		// Calificación mínima para este cuestionario (si se requiere)
	},
	maxAttempts: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [10,'Maximum value is 10'],
		default: 5
		// Número máximo de intentos para este cuestionario
	},
	questions: [QuestionSchema],
	w: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 1
		// Si w es mayor a cero, entonces quiere decir que este cuestionario debe tomarse en cuenta para la calificación final
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
	shuffle: {
		type: Boolean,
		default: false
		// Indica si las preguntas se mostraran en orden aleatorio (true => aleatorio)
	},
	show: { // Si show es cero, entonces muestra todas las preguntas
		type: Number,
		default: 0
		// Si es mayor a cero, entonces solo se mostrará el número de preguntas que indique "show"
	},
	diagnostic: {
		aspects: [
			{
				name: {
					type: String
				},
				min: {
					type: Number
				},
				max: {
					type: Number
				},
				eval: [{
					min: {
						type: Number
					},
					max: {
						type: Number
					},
					results: {
						type: String
					},
					notes: {
						type: String
					}
				}]
			}
		],
		notes: {
			text: {
				type: String
			},
			show: {
				type: Boolean,
				defaul: true
			}
		}
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
