const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AddressSchema = new Schema ({
	adddress_line_1: {
		type: String
	},
	adddress_line_2: {
		type: String
	},
	postal_code: {
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
