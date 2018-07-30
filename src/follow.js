const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const FollowSchema = new Schema({
	who: {
		kind: String,
		item: {
			type: Schema.Types.ObjectId,
			refPath: 'who.kind'
		}
	},
	object: {
		kind: String,
		item: {
			type: Schema.Types.ObjectId,
			refPath: 'object.kind'
		}
	}
});


FollowSchema.index( { 'object.item'	: 1 } );
FollowSchema.index( { 'who.item'		: 1 } );

const Follows = mongoose.model('follows', FollowSchema);
module.exports = Follows;
