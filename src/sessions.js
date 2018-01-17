const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SessionUnitsSchema = new Schema ({
	user: {
		type: String,
		required: true
	},
	date: {
		type: Date,
		required: true,
		default: Date.now
	},
	isActive: {
		type: Boolean,
		default: true // validar que cuando el servidor arranque ponga todas las sesiones TRUE en FALSE
	}
});

module.exports = SessionUnitsSchema;

const SessionSchema = new Schema ({
	session: [{SessionUnitsSchema}]
});

const Sessions = mongoose.model('sessions', SessionSchema);
module.exports = Sessions;
