const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AddressSchema = new Schema ({
	line1: {
		type: String
	},
	line2: {
		type: String
	},
	postalCode: {
		type: String
	},
	locality: {
		type: String
	},
	city: {
		type: String
	},
	state: {
		type: String
	},
	country: {
		type: String
	}
});

module.exports = AddressSchema;
