const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DependencySchema = new Schema ({
	block: {
		type: Schema.Types.ObjectId,
		ref: 'blocks'
	},
	onBlock: {
		type: Schema.Types.ObjectId,
		ref: 'blocks'
	},
	createAttempt: {
		type: Boolean,
		default: false
	},
	track: {
		type: Boolean,
		default: false
	},
	saveTask: {
		type: Boolean,
		default: false
	}
});

const Dependencies = mongoose.model('dependencies', DependencySchema);
module.exports = Dependencies;
