const mongoose			= require('mongoose');
const Schema 				= mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const AttemptSchema = new Schema({
	attempt : [],
	roster: {
		type: Schema.Types.ObjectId,
		ref: 'rosters'
	},
	block: {
		type: Schema.Types.ObjectId,
		ref: 'blocks'
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: 'users'
	}
});

AttemptSchema.index({ roster	: 1 });
AttemptSchema.index({ block		: 1 });
AttemptSchema.index({ user		: 1 });

const Attempts = mongoose.model('attempts', AttemptSchema);
module.exports = Attempts;
