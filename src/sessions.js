const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const SessionSchema = new Schema ({
	user: {
		type: Schema.Types.ObjectId,
		ref: 'users'
	},
	token: {
		type: String
	},
	date: {
		type: Date,
		required: true
	},
	url: {
		type: String
	}
});

SessionSchema.index( { user:  1 } );
SessionSchema.index( { date: -1 } );

const Sessions = mongoose.model('sessions', SessionSchema);
module.exports = Sessions;
