const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const NotificationSchema = new Schema({
	destination: {
		kind: String,
		item: {
			type: ObjectId,
			refPath: 'destination.kind'
		}
	},
	source: {
		kind: String,
		item: {
			type: ObjectId,
			refPath: 'source.kind'
		}
	},
	sourceType: {
		type: String,
		enum: ['user','system'],
		default: 'user'
	},
	role: {
		type: String,
		enum: ['admin', 'instructor', 'supervisor', 'user'],
		default: 'user'
	},
	message: {
		type: String
	},
	read: {
		type: Boolean,
		default: false
	},
	date: {
		type: Date,
		default: Date.now
	},
	object: {
		kind: String,
		item: {
			type: ObjectId,
			refPath: 'object.kind'
		}
	}
});

NotificationSchema.index( { 'destination.item'	: 1 	} );
NotificationSchema.index( { read								: 1 	} );
NotificationSchema.index( { date								: -1 	} );
NotificationSchema.index( { 'object.item'				: 1 	} );

const Notifications = mongoose.model('notifications', NotificationSchema);
module.exports = Notifications;
