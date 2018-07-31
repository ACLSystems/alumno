// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definir esquema y subesquemas

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
		enum:['discussion','question','announcement'],
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

// Definir virtuals

// Definir middleware

DiscussionsSchema.pre('save', function(next) {
	if(typeof this.block !== 'undefined') {
		this.blockExists = true;
	} else {
		this.blockExists = false;
	}
	next();
});

// Definir índices

DiscussionsSchema.index( { course		:  1	} );
DiscussionsSchema.index( { group		:  1	} );
DiscussionsSchema.index( { block		:  1	} );
DiscussionsSchema.index( { pubtype	:  1 	} );
DiscussionsSchema.index( { type			:  1 	} );
DiscussionsSchema.index( { root			:  1 	} );
DiscussionsSchema.index( { comment	:  1 	} );
DiscussionsSchema.index( { replyto	:  1 	} );
DiscussionsSchema.index( { user			:  1 	} );
DiscussionsSchema.index( { date			: -1 	} );

// Compilar esquema

const Discussions = mongoose.model('discussions', DiscussionsSchema);
module.exports = Discussions;
