// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const FollowSchema = new Schema({
	who: {
		kind: String,
		item: {
			type: Schema.Types.ObjectId,
			refPath: 'who.kind'
		}
	},
	object: {
		kind: String,
		item: {
			type: Schema.Types.ObjectId,
			refPath: 'object.kind'
		}
	}
});

// Definir virtuals

// Definir middleware

// Definir índices

FollowSchema.index( { 'object.item'	: 1 } );
FollowSchema.index( { 'who.item'		: 1 } );

// Compilar esquema

const Follows = mongoose.model('follows', FollowSchema);
module.exports = Follows;
