// Esquema para modelar rosters
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

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
	},
	maxGradeQ: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	},
	lastAttemptQ: {
		type: Date
	},
	gradeT: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
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
	finalGrade: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	}
});

GradesSchema.pre('save', function(next) {
	if(this.quests.length > 0) {
		var lastGrade = this.maxGradeQ;
		var lastDate  = this.lastAttemptQ;
		if(this.quests && this.quests.length > 0) {
			this.quests.forEach(function(q) {
				if(q.grade > lastGrade) {
					lastGrade = q.grade;
					lastDate	= q.attempt;
				}
			});
			this.maxGradeQ		= lastGrade;
			this.lastAttemptQ	= lastDate;
		}
		if(this.wTotal > 0 && this.track === 100) {
			this.finalGrade = ((this.wq * this.maxGradeQ)+(this.wt*this.gradeT));
		} else {
			this.finalGrade = 0;
		}
	}
	next();
});

GradesSchema.virtual('wTotal').get(function() {
	return this.wq + this.wt;
});

GradesSchema.virtual('numAttempts').get(function() {
	return this.quests.length;
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
	finalGrade: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	},
	track:{
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
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
	pass: {
		type: Boolean,
		defaul: false
	}
});

RosterSchema.pre('save', function(next) {
	var grades = this.grades;
	var fg = 0;
	var i = 0;
	var w = 0;
	var track = 0;
	grades.forEach(function(g) {
		fg = fg + (g.finalGrade * g.w);
		track = track + g.track;
		if(g.w > 0) {
			w++;
		}
		i++;
	});

	if(w > 0) { this.finalGrade = parseInt(fg/w); }
	this.track = parseInt(track / i);

	if(this.finalGrade > this.minGrade && this.track > this.minTrack) {
		this.pass = true;
	}

	next();
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