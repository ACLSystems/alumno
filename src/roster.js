// Esquema para modelar rosters
const mongoose = require('mongoose');
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
	attempt: {
		type: Date
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
		enum: ['pending','active','finished','remove'],
		default: 'pending'
	},
	grades: [GradesSchema],
	group: {
		type: Schema.Types.ObjectId,
		ref: 'groups'
	},
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: Schema.Types.ObjectId,
		ref: 'orgUnits'
	},
});

RosterSchema.index( {org: 1								},{unique: false} );
RosterSchema.index( {group: 1							},{unique: false}	);
RosterSchema.index( {orgUnit: 1						},{unique: false} );
RosterSchema.index( {student: 1						},{unique: false}	);
RosterSchema.index( {org: 1, orgUnit: 1		},{unique: false} );
RosterSchema.index( {student: 1, group: 1	},{unique: true	}	);
const Rosters = mongoose.model('rosters', RosterSchema);
module.exports = Rosters;

//module.exports = RosterSchema;
