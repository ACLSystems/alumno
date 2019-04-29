// Definir requerimientos
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const AdminSchema = new Schema({
	blocksPending: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [1000,'Maximum value is 1000'],
		default: 2
	}
});

module.exports = AdminSchema;

const DatesSchema = new Schema ({
	beginDate: {
		type: Date
	},
	endDate: {
		type: Date
	},
	label: {
		type: String
	},
	type: {
		type: String,
		enum: ['general','exam','task','certificate']
	}
});

module.exports = DatesSchema;


const RubricSchema = new Schema ({
	block: {
		type: Schema.Types.ObjectId,
		ref: 'blocks'
	},
	wq: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	},
	wt: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	},
	w: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	}
});

module.exports = RubricSchema;

const GroupsSchema = new Schema ({
	status: {
		type: String,
		enum: ['draft','coming','active','closed'],
		default: 'draft'
	},
	code: {
		type: String,
		required: true
	},
	name: {
		type: String,
		required: true
	},
	type: {
		type: String,
		enum: ['self-paced','tutor','assisted'],
		default: 'self-paced'
	},
	public: {
		type: Boolean,
		default: false
	},
	course: {
		type: Schema.Types.ObjectId,
		ref: 'courses'
	},
	instructor: {
		type: Schema.Types.ObjectId,
		ref: 'users'
	},
	roster: [{
		type: Schema.Types.ObjectId,
		ref: 'rosters'
	}],
	students: [{
		type: Schema.Types.ObjectId,
		ref: 'users'
	}],
	presentBlockBy: {
		type: String,
		enum: ['free','dates','lapse'],
		default: 'free'
	},
	beginDate: {
		type: Date
	},
	endDate: {
		type: Date
	},
	dates: [DatesSchema],
	lapse: {
		type: Number,
		min: [0,'Minimum value is 0'],
		default: 0
	},
	lapseBlocks: [{
		type: Number,
		min: [0,'Minimum value is 0']
	}],
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: Schema.Types.ObjectId,
		ref: 'orgUnits'
	},
	minGrade: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 60
	},
	minTrack: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 60
	},
	isActive: {
		type: Boolean,
		default: true
	},
	certificateActive: {
		type: Boolean,
		default: true
	},
	own: OwnerSchema,
	mod: [ModSchema],
	perm: PermissionsSchema,
	admin: AdminSchema,
	rubric: [RubricSchema]
});

// Definir virtuals

GroupsSchema.virtual('numStudents').get(function() {
	if(this.roster) {
		return this.students.length;
	} else {
		return 0;
	}
});

// Definir middleware

// Definir índices

GroupsSchema.index( { org					: 1, code: 1 	}, { unique: true  } );
GroupsSchema.index( { code				: 1 					} );
GroupsSchema.index( { name				: 1 					} );
GroupsSchema.index( { course			: 1 					} );
GroupsSchema.index( { orgUnit			: 1 					} );
GroupsSchema.index( { instructor	: 1 					} );
GroupsSchema.index( { isActive		: 1 					} );
GroupsSchema.index( { status			: 1 					} );
GroupsSchema.index( { endDate			: 1						} );

// Compilar esquema

const Groups = mongoose.model('groups', GroupsSchema);
module.exports = Groups;
