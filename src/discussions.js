const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DiscussionsSchema = new Schema ({
	title: {
		type: String
	},
	text: {
		type: String,
		required: true
	},
	type: {
		type: String,
		enum:['root','comment','reply'],
		required: true,
		default: 'root'
	},
	pubtype: {
		type: String,
		enum:['discussion','question'],
		required: true,
		default: 'discussion'
	},
	root: {
		type: Schema.Types.ObjectId,
		ref: 'discussions'
	},
	comment: {
		type: Schema.Types.ObjectId,
		ref: 'discussions'
	},
	replyto: {
		type: Schema.Types.ObjectId,
		ref: 'discussions'
	},
	block: {
		type: Schema.Types.ObjectId,
		ref: 'blocks'
	},
	blockExists: {
		type: Boolean
	},
	group: {
		type: Schema.Types.ObjectId,
		ref: 'groups'
	},
	course: {
		type: Schema.Types.ObjectId,
		ref: 'courses'
	},
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: Schema.Types.ObjectId,
		ref: 'orgUnits'
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: 'users'
	},
	date: {
		type: Date,
		default: Date.now
	}
});

// RosterSchema.pre('save', function(next) {

DiscussionsSchema.pre('save', function(next) {
	if('block' in this) {
		this.blockExists = true;
	} else {
		this.blockExists = false;
	}
	next();
});

DiscussionsSchema.index( { type: 1, org: 1}, 						{ unique: false } );
DiscussionsSchema.index( { type: 1, title: 1, org: 1}, 	{ unique: false } );
DiscussionsSchema.index( { type: 1, block:1, 	org: 1},	{ unique: false } );
DiscussionsSchema.index( { type: 1, group:1, 	org: 1},	{ unique: false } );
DiscussionsSchema.index( { type: 1, course:1, org: 1},	{ unique: false } );
DiscussionsSchema.index( { type: 1, comment: 1 }, 			{ unique: false } );

const Discussions = mongoose.model('discussions', DiscussionsSchema);
module.exports = Discussions;
