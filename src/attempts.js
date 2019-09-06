const mongoose			= require('mongoose');

const Schema 				= mongoose.Schema;
const ObjectId 			= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const AttemptSchema = new Schema({
	attempt : [],
	roster: {
		type: ObjectId,
		ref: 'rosters'
	},
	block: {
		type: ObjectId,
		ref: 'blocks'
	},
	user: {
		type: ObjectId,
		ref: 'users'
	}
});

AttemptSchema.index({ roster	: 1 });
AttemptSchema.index({ block		: 1 });
AttemptSchema.index({ user		: 1 });

const Attempts = mongoose.model('attempts', AttemptSchema);
module.exports = Attempts;
