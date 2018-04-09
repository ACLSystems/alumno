// Esquema para modelar grupos
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permissions');
//const RosterSchema = require('./roster');
//const Course = require('./courses');
//const Block = require('./blocks');
//const Orgs = require('./orgs');
//const OrgUnits = require('./orgUnits');
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
	beginDate: {
		type: Date
	},
	endDate: {
		type: Date
	}
});

module.exports = DatesSchema;

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
	own: OwnerSchema,
	mod: [ModSchema],
	perm: PermissionsSchema,
	admin: AdminSchema
});

GroupsSchema.pre('save', function(next) {
	this.students = this.roster;
	next();
});


GroupsSchema.virtual('numStudents').get(function() {
	if(this.roster) {
		return this.students.length;
	} else {
		return 0;
	}
});

GroupsSchema.index( { code: 1, org: 1}, { unique: true } );
GroupsSchema.index( { code: 1 }, { unique: false } );
GroupsSchema.index( { name: 1, org: 1}, { unique: false} );

const Groups = mongoose.model('groups', GroupsSchema);
module.exports = Groups;
