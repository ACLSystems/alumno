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


const GradesSchema = new Schema ({
	block: {
		type: Schema.Types.ObjectId,
		ref: 'blocks'
	},
	tasksFiles: {
		type: [String]
	},
	taskGrades: {
		type: [Number],
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	},
	questAnswers: {
		type: [String]
	},
	questGrades: {
		type: [Number],
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	},
	track: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	}

});

module.exports = GradesSchema;

const RosterSchema = new Schema ({
	status: {
		type: String,
		enum: ['pending','active','finished','remove']
	},
	grades: GradesSchema
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
	students: [{
		type: Schema.Types.ObjectId,
		ref: 'users'
	}],
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
});

GroupsSchema.index( { code: 1, org: 1}, { unique: true } );
GroupsSchema.index( { name: 1, org: 1}, { unique: false} );
const Groups = mongoose.model('groups', GroupsSchema);
module.exports = Groups;
