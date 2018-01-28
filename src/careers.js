const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CareerSchema = new Schema ({
	name: {
		type: String,
		required: true
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

CareerSchema.index( { org: 1}, { unique: false } );
CareerSchema.index( { name: 1, org: 1}, { unique: true } );
const Career = mongoose.model('careers', CareerSchema);
module.exports = Career;
