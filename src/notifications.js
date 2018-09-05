// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const NotificationSchema = new Schema({
	destination: {
		kind: {
			type: String,
			default: 'users'
		},
		item: {
			type: Schema.Types.ObjectId,
			refPath: 'destination.kind'
		},
		role: {
			type: String,
			enum: ['admin', 'instructor', 'supervisor', 'user'],
			default: 'user'
		},
	},
	source: {
		kind: {
			type: String,
			default: 'users'
		},
		item: {
			type: Schema.Types.ObjectId,
			refPath: 'source.kind'
		},
		role: {
			type: String,
			enum: ['admin', 'instructor', 'supervisor', 'user'],
			default: 'user'
		}
	},
	type: {
		type: String,
		enum: ['user','system'],
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
	dateRead: {
		type: Date
	},
	objects: [{
		kind: {
			type: String,
			enum: ['users', 'discussions', 'blocks', 'groups', 'certificates','courses', 'files','notifications','orgs', 'orgUnits', 'requests', 'rosters', 'tasks', 'questionnaries'],
			default: 'users'
		},
		item: {
			type: Schema.Types.ObjectId,
			refPath: 'object.kind'
		}
	}]
});

// Definir virtuals

// Definir middleware

// Definir índices

NotificationSchema.index( { 'destination.item'	: 1 	} );
NotificationSchema.index( { read								: 1 	} );
NotificationSchema.index( { date								: -1 	} );
NotificationSchema.index( { destinationRole			: 1		} );
NotificationSchema.index( { 'object.item'				: 1 	} );

// Compilar esquema

const Notifications = mongoose.model('notifications', NotificationSchema);
module.exports = Notifications;
