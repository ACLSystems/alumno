// Esquema para modelar grupos
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permissions');
//const BlocksSchema = require('./blocks');
//const CoursesSchema = require('./courses');
//const OrgsSchema = require('./orgs');
//const OrgUnitsSchema = require('./orgUnits');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

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
	block: {
		type: Schema.Types.ObjectId,
		ref: 'blocks'
	},
	beginDate: {
		type: Date
	},
	endDate: {
		type: Date
	}
});

module.exports = DatesSchema;

const TasksSchema = new Schema ({
	file: {
		type: String
	},
	text: {
		type: String
	},
	grade: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	}
});

module.exports = TasksSchema;

const QuestsSchema = new Schema ({
	answers: [],
	grade: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	},
	attempts: {
		type: [Date]
	}
});

module.exports = QuestsSchema;

const GradesSchema = new Schema ({
	block: {
		type: Schema.Types.ObjectId,
		ref: 'blocks'
	},
	tasks: [TasksSchema],
	quests: [QuestsSchema],
	track: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	}

});

module.exports = GradesSchema;

const RosterSchema = new Schema ({
	student: {
		type: Schema.Types.ObjectId,
		ref: 'users'
	},
	status: {
		type: String,
		enum: ['pending','active','finished','remove']
	},
	grades: [GradesSchema]
});

module.exports = RosterSchema;

const GroupsSchema = new Schema ({
	code: {
		type: String,
		required: true
	},
	name: {
		type: String,
		required: true
	},
	course: {
		type: Schema.Types.ObjectId,
		ref: 'courses'
	},
	instructor: {
		type: Schema.Types.ObjectId,
		ref: 'users'
	},
	roster: [RosterSchema],
	beginDate: {
		type: Date
	},
	endDate: {
		type: Date
	},
	dates: [DatesSchema],
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: Schema.Types.ObjectId,
		ref: 'orgUnits'
	},
	own: OwnerSchema,
	mod: [ModSchema],
	perm: PermissionsSchema,
	admin: AdminSchema
});

GroupsSchema.index( { code: 1, org: 1}, { unique: true } );
GroupsSchema.index( { code: 1 }, { unique: false } );
GroupsSchema.index( { name: 1, org: 1}, { unique: false} );

const Groups = mongoose.model('groups', GroupsSchema);
module.exports = Groups;
