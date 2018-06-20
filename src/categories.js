const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

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
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	}
});

CategorySchema.index( { org				: 1					} );
CategorySchema.index( { isVisible	: 1					} );
CategorySchema.index( { type			: 1					} );
CategorySchema.index( { name			: 1, org: 1	}, { unique: true } );

const Category = mongoose.model('categories', CategorySchema);
module.exports = Category;
