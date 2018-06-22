// Esquema para modelar rosters
const mongoose			= require('mongoose');
const Certificate		= require('./certificates');
const Schema 				= mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const AdminSchema = new Schema ({
	what: {
		type: String
	},
	who: {
		type: String
	},
	date: {
		type: Date,
		default: Date.now
	}
});

module.exports = AdminSchema;

const depSchema = new Schema ({
	dep: {
		type: Schema.Types.ObjectId,
		ref: 'dependencies'
	},
	createAttempt: {
		type: Boolean
	},
	track: {
		type: Boolean
	},
	saveTask: {
		type: Boolean
	}
});

module.exports = depSchema;

const TasksSchema = new Schema ({
	content: {
		type: String
	},
	type: {
		type: String,
		enum: ['file','text'],
		default: 'text'
	},
	label: {
		type: String
	},
	grade: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	},
	graded: {
		type: Boolean,
		default: false
	},
	date: {
		type: Date,
		default: Date.now
	},
	justDelivery: {
		type: Boolean,
		default: false
	}
});
TasksSchema.pre('save', function(next) {
	if(this.justDelivery && this.content) {
		this.grade 	= 100;
		this.graded = true;
	}
	next();
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
		type: Date,
		default: Date.now
	}
});

module.exports = QuestsSchema;

const GradesSchema = new Schema ({
	block: {
		type: Schema.Types.ObjectId,
		ref: 'blocks'
	},
	tasks: [TasksSchema],
	tasktries: [{
		type: Date
	}],
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
	gradedT: {
		type: Boolean,
		default: false
	},
	gradedQ: {
		type: Boolean,
		default: false
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
	},
	dependencies: [depSchema],
	repair: {
		type: Number
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
	}
	if(this.tasks.length > 0) {
		var tasks = 0;
		var grades = 0;
		this.tasks.forEach(function(t) {
			tasks++;
			if(t.justDelivery) {
				grades = grades + 100;
			} else if(t.graded) {
				grades = grades + t.grade;
			}
		});
		if(tasks > 0) {
			this.gradeT = grades / tasks;
			this.gradedT = true;
		} else {
			this.gradeT = 0;
		}
	}
	var wTotal = this.wq + this.wt;
	if(wTotal > 0 && this.track === 100) {
		this.finalGrade = (((this.wq * this.maxGradeQ)+(this.wt*this.gradeT))/(wTotal));
	} else {
		this.finalGrade = 0;
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

const SectionSchema = new Schema ({
	viewed: {
		type: Date
	},
	beginDate: {
		type: Date
	},
	endDate: {
		type: Date
	}
});

module.exports = SectionSchema;

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
	sections: [SectionSchema],
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
	},
	passDate: {
		type: Date
	},
	flag: {
		type: Number
	},
	newTask: {
		type: Boolean
	},
	isActive: {
		type: Boolean,
		default: true
	},
	admin: [AdminSchema],
	repair: {
		type: Number
	},
	report: {
		type: Boolean,
		default: true
	},
	tookCertificate: {
		type: Boolean,
		default: false
	},
	certificateNumber: {
		type: Number,
		default: 0
	}
});

RosterSchema.pre('save', function(next) {
	const now = new Date;
	var grades = this.grades;
	var fg = 0;
	var i = 0;
	var w = 0;
	var track = 0;
	grades.forEach(function(g) {
		fg = fg + (g.finalGrade * g.w);
		track = track + g.track;
		w += g.w;
		i++;
	});

	if(w > 0) { this.finalGrade = fg/w; }
	this.track = parseInt(track / i);

	if(!this.pass && (this.finalGrade > this.minGrade && this.track > this.minTrack)) {
		this.pass 		= true;
		this.passDate	= now;

		if(!this.certificateNumber || this.certificateNumber === 0) {
			var cert 	= new Certificate;
			cert.roster = this._id;
			Certificate.findOne({roster: cert.roster})
				.then((certFound) => {
					if(certFound) {
						this.certificateNumber = certFound.number;
						next();
					} else {
						cert.save()
							.then((cert) => {
								this.certificateNumber = cert.number;
								next();
							})
							.catch((err) => {
								console.log('Cannot create certificate. Roster: ' + this._id + ' ' + err); //eslint-disable-line
							});
					}
				})
				.catch((err) => {
					console.log('Error trying to find certificate. Roster: ' + this._id + ' ' + err); //eslint-disable-line
				});
		}
	} else {
		next();
	}
	//next();
});

RosterSchema.index( {org								: 1	} );
RosterSchema.index( {pass								: 1	}	);
RosterSchema.index( {track							: 1	}	);
RosterSchema.index( {group							: 1	}	);
RosterSchema.index( {report							: 1	}	);
RosterSchema.index( {orgUnit						: 1	} );
RosterSchema.index( {certificateNumber	: 1	}, { sparse: true } );
RosterSchema.index( {student						: 1,	group: 	1	},{unique: true	}	);

const Rosters = mongoose.model('rosters', RosterSchema);
module.exports = Rosters;
