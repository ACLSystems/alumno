// Definir requerimientos
const mongoose 	= require('mongoose');

const Schema 		= mongoose.Schema;
const ObjectId 	= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const JobsLogSchema = new Schema ({
	logType: {
		type: String,
		enum: ['info','warn','error'],
		default: 'info'
	},
	job: {
		type: ObjectId,
		ref: 'jobs'
	},
	text: {
		type: String
	},
	begin: {
		type: Date
	},
	end: {
		type: Date
	},
	runningTime:{
		type: Number
	}
});

// Definir virtuals

// Definir middleware

// Definir índices

JobsLogSchema.index( { job			: 1 } );
JobsLogSchema.index( { begin		: 1 } );
JobsLogSchema.index( { end			: 1 } );
JobsLogSchema.index( { logType	: 1 } );

// Compilar esquema

const JobLogs = mongoose.model('joblogs', JobsLogSchema);
module.exports = JobLogs;
