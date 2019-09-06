// Definir requerimientos
const mongoose 	= require('mongoose');

const Schema		= mongoose.Schema;
const ObjectId	= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const CategorySchema = new Schema ({
	name: {
		type: String,
		required: true
	},
	type: {
		type: String,
		enum: ['course'],
		default: 'course'
	},
	isVisible: {
		type: Boolean,
		required: true,
		default: true
	},
	org: {
		type: ObjectId,
		ref: 'orgs'
	}
});

// Definir middleware

// Definir índices

CategorySchema.index( { org				: 1					} );
CategorySchema.index( { isVisible	: 1					} );
CategorySchema.index( { type			: 1					} );
CategorySchema.index( { name			: 1, org: 1	}, { unique: true } );

// Compilar esquema

const Category = mongoose.model('categories', CategorySchema);
module.exports = Category;
