const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SessionSchema = new Schema ({
	user: {
		type: String,
		required: true
	},
	token: {
		type: String,
		required: true
	},
	date: {
		type: Date,
		required: true
	},
	isActive: {
		type: Boolean,
		default: true // validar que cuando el servidor arranque ponga todas las sesiones TRUE en FALSE
	}
});

const Sessions = mongoose.model('sessions', SessionSchema);
module.exports = Sessions;
