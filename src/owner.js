const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OwnerSchema = new Schema ({
	user: {
		type: String
		required: true
	},
	org: {
		type: String,
		required: true
	},
	orgUnit: {
		type: String,
		required: true
	}
});

module.exports = OwnerSchema;
