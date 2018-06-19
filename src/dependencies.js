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

DependencySchema.index( { block: 1, onBlock: 1}, { unique: true } );
DependencySchema.index( { onBlock: 1					}, { unique: true } );

const Dependencies = mongoose.model('dependencies', DependencySchema);
module.exports = Dependencies;
