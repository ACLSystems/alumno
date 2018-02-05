const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CareerSchema = new Schema ({
	name: {
		type: String,
		required: true
	},
	longName: {
		type: String,
		required: true
	},
	area: {
		type: String,
		required: true
	},
	isVisible: {
		type: Boolean,
		required: true,
		default: true
	},
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	},
});

CareerSchema.index( { org: 1}, { unique: false } );
CareerSchema.index( { area: 1, org: 1}, { unique: false } );
CareerSchema.index( { name: 1, org: 1}, { unique: true } );
CareerSchema.index( { name: 1, area: 1, org: 1}, { unique: false } );
const Career = mongoose.model('careers', CareerSchema);
module.exports = Career;
