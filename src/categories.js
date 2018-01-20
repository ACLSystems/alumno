const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
		type: String,
		required: true
	}
});

CategorySchema.index( { org: 1}, { unique: false } );
CategorySchema.index( { name: 1, org: 1}, { unique: true } );
const Category = mongoose.model('categories', CategorySchema);
module.exports = Category;
