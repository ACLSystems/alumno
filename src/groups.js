// Definir requerimientos
const mongoose 					= require('mongoose');
const ModSchema 				= require('./modified');
const OwnerSchema 			= require('./owner');
const PermissionsSchema = require('./permissions');

const Schema 						= mongoose.Schema;
const ObjectId 					= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const AdminSchema = new Schema({
	blocksPending: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [1000,'Maximum value is 1000'],
		default: 2
	}
},{ _id: false });

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
},{ _id: false });

module.exports = DatesSchema;


const RubricSchema = new Schema ({
	block: {
		type: ObjectId,
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
	},
	section: {
		type: Number
	},
	number: {
		type: Number
	},
	text: String
},{ _id: false });

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
		type: ObjectId,
		ref: 'courses'
	},
	instructor: {
		type: ObjectId,
		ref: 'users'
	},
	roster: [{
		type: ObjectId,
		ref: 'rosters'
	}],
	students: [{
		type: ObjectId,
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
	blockDates: [{
		block: {
			type: ObjectId,
			ref: 'blocks'
		},
		date: Date
	}],
	org: {
		type: ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: ObjectId,
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
	project: {
		type: ObjectId,
		ref: 'projects'
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
GroupsSchema.index( { beginDate		: 1						} );
GroupsSchema.index( { endDate			: 1						} );
GroupsSchema.index( { project			: 1						} );

// Compilar esquema

const Groups = mongoose.model('groups', GroupsSchema);
module.exports = Groups;
