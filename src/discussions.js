// Definir requerimientos
const mongoose 	= require('mongoose');

const Schema 		= mongoose.Schema;
const ObjectId 	= Schema.Types.ObjectId;

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
		enum:['discussion','question','announcement','tutor'],
		required: true,
		default: 'discussion'
	},
	root: {
		type: ObjectId,
		ref: 'discussions'
	},
	comment: {
		type: ObjectId,
		ref: 'discussions'
	},
	replyto: {
		type: ObjectId,
		ref: 'discussions'
	},
	block: {
		type: ObjectId,
		ref: 'blocks'
	},
	blockExists: {
		type: Boolean
	},
	group: {
		type: ObjectId,
		ref: 'groups'
	},
	course: {
		type: ObjectId,
		ref: 'courses'
	},
	org: {
		type: ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: ObjectId,
		ref: 'orgUnits'
	},
	user: {
		type: ObjectId,
		ref: 'users'
	},
	toUser: {
		type: ObjectId,
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
