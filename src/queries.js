// Definir requerimientos
const mongoose 	= require('mongoose');
const Schema 		= mongoose.Schema;
const ObjectId 	= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const QuerySchema = new Schema({
	query: [],
	user: {
		type: ObjectId,
		ref: 'users'
	}
});

// Definir virtuals

// Definir middleware

// Definir índices

QuerySchema.index({ query	: 1 });
QuerySchema.index({ user	: 1 });

// Compilar esquema

const Queries = mongoose.model('queries', QuerySchema);
module.exports = Queries;
