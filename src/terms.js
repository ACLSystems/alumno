const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TermSchema = new Schema ({
	name: {
		type: String,
		required: true
	},
	type: {
		type: String,
		enum: ['semester', 'quarter', 'trimester', 'quadmester'],
		default: 'semester'
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

TermSchema.index( { org: 1}, { unique: false } );
TermSchema.index( { name: 1, org: 1}, { unique: true } );
const Term = mongoose.model('terms', TermSchema);
module.exports = Term;
