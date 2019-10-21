// Definir requerimientos
const mongoose			= require('mongoose');
const ModSchema			= require('./modified');
const Certificate		= require('./certificates');
const Block 				= require('./blocks');
const Task 					= require('./tasks');
const Schema 				= mongoose.Schema;
const ObjectId 			= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

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
},{ _id: false });

// Definir virtuals

// Definir middleware

module.exports = AdminSchema;

const depSchema = new Schema ({
	dep: {
		type: ObjectId,
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
},{ _id: false });

// Definir virtuals

// Definir middleware

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
	},
	id: {
		type: String
	},
	text: {
		type: String
	},
	repair: {
		type: String
	}
});

// Definir virtuals

// Definir middleware

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

// Definir virtuals

// Definir middleware

module.exports = QuestsSchema;

const GradesSchema = new Schema ({
	block: {
		type: ObjectId,
		ref: 'blocks'
	},
	blockSection: {
		type: Number
	},
	blockNumber: {
		type: Number
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
	},
	order: {
		type: Number
	}
},{ _id: false });

GradesSchema.pre('save', async function(next) {
	if(this.tasks && Array.isArray(this.tasks) && this.tasks.length >0) {
		const task	= await Block.findOne({_id: this.block}).select('task -_id').lean();
		const oriTasks	= await Task.findOne({_id: task.task}).select('items -_id').lean();
		this.tasks.forEach(task => {
			const oriTask = oriTasks.items.find(t => t.label === task.label);
			if(oriTask){
				task.text = oriTask.text;
				task.id		= oriTask._id;
			} else {
				const oriTask2 = oriTasks.items.find(t => t._id === task.id);
				if(oriTask2) {
					task.text = oriTask.text;
				}
			}
		});
		this.tasks.sort(function(a,b) {
			var labelA = a.label.toUpperCase();
			var labelB = b.label.toUpperCase();
			if(labelA < labelB) {
				return -1;
			}
			if(labelA > labelB) {
				return 1;
			}
			return 0;
		});
	}
	next();
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
		var graded = true;
		this.tasks.forEach(function(t) {
			tasks++;
			if(t.justDelivery) {
				grades = grades + 100;
			} else if(t.graded) {
				grades = grades + t.grade;
			}
			if(t.graded === true) {
				graded = true;
			}
		});
		this.gradedT = graded;
		if(tasks > 0) {
			this.gradeT = grades / tasks;
		} else {
			this.gradeT = 0;
		}
	}
	var wTotal = this.wq + this.wt;
	if(wTotal > 0 && this.track === 100){
		// console.log('Aquí cambiamos el finalGrade');
		this.finalGrade = (((this.wq * this.maxGradeQ)+(this.wt*this.gradeT))/(wTotal));
	} else if(this.w === 0){
		// Esta parte es para asegurarnos que no haya calificaciones en donde no debe
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

// Definir virtuals

// Definir middleware

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
},{ _id: false });

// Definir virtuals

// Definir middleware

module.exports = SectionSchema;

const RosterSchema = new Schema ({
	student: {
		type: ObjectId,
		ref: 'users'
	},
	status: {
		type: String,
		enum: ['pending','active','finished','remove'],
		default: 'pending'
	},
	grades: [GradesSchema],
	group: {
		type: ObjectId,
		ref: 'groups'
	},
	org: {
		type: ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: ObjectId,
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
	currentBlock: {
		type: ObjectId,
		ref: 'blocks'
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
	certificateTutor: {
		type: Boolean,
		default: false
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
	},
	mod: [ModSchema],
	createDate: {
		type: Date,
		default: Date.now
	},
	project: {
		type: ObjectId,
		ref: 'projects'
	},
	version: {
		type: Number,
		default: 1
	}
});

// Definir virtuals

// Definir middleware

RosterSchema.pre('save', async function(next) {
	var item = this;
	const now = new Date;
	var grades = item.grades;
	var i = 0;
	var w = 0;
	var fg = 0;
	var track = 0;
	if(item.version === 1){
		grades.forEach(function(g) {
			fg = fg + (g.finalGrade * g.w);
			track = track + g.track;
			w += g.w;
			i++;
		});
		if(w > 0) { item.finalGrade = fg/w; }
	}
	if(item.version === 2) {
		// Aquí solo poblamos el arreglo de secciones y las lecciones van dentro de cada sección
		var grades2 = [];
		grades.forEach(grade => {
			track = track + grade.track;
			i++;
			if(grade.blockNumber === 0 && grade.w > 0) {
				grades2.push({
					section: grade.blockSection,
					block: grade.block,
					grades: [],
					w: grade.w,
					finalGrade: 0
				});
			} else {
				let found = grades2.findIndex(grade2 => grade2.section === grade.blockSection);
				if(found > -1 && grade.w > 0) {
					grades2[found].grades.push({
						number: grade.blockNumber,
						w: grade.w,
						wt: grade.wt,
						wq: grade.wq,
						finalGrade: grade.finalGrade
					});
				}
			}
		});
		// console.log(JSON.stringify(grades2,null,2));
		if(grades2.length > 0) {
			// ahora vamos sección por sección sacando calificaciones
			// con la versión 2 de ponderación
			grades2.forEach(sec => {
				if(sec.grades && sec.grades.length > 0) { // checar si no está vacío
					// sacar ponderaciones para la sección
					sec.wTotal = sec.grades.reduce((acc,curr) => acc + curr.w,0);
					sec.grades.forEach(g => {
						g.wPer = sec.wTotal ? g.w / sec.wTotal : 0;
					});
					sec.finalGrade = sec.grades.reduce((acc,curr) => acc + curr.finalGrade * curr.wPer,0);
					let found = item.grades.findIndex(grade => grade.block + '' === sec.block + '');
					if(found > -1) {
						item.grades[found].finalGrade = sec.finalGrade;
					}
				}
			});

			// console.log(JSON.stringify(grades2,null,2));

			const wTotal = grades2.reduce((acc,curr) => acc + curr.w,0);
			const finalGrade = grades2.reduce((acc,curr) => acc + (curr.w / wTotal) * curr.finalGrade,0);
			// console.log(wTotal, finalGrade);
			item.finalGrade = finalGrade;
		}
		// console.log(JSON.stringify(grades2,null,2));
	}

	item.track = parseInt(track / i);
	if(!item.pass && (item.finalGrade > item.minGrade && item.track > item.minTrack)) {
		item.pass 		= true;
		item.passDate	= now;

		if(!item.certificateNumber || item.certificateNumber === 0) {
			var cert 	= new Certificate;
			cert.roster = item._id;
			Certificate.findOne({roster: cert.roster})
				.then((certFound) => {
					if(certFound) {
						item.certificateNumber = certFound.number;
						next();
					} else {
						cert.save()
							.then((cert) => {
								item.certificateNumber = cert.number;
								next();
							})
							.catch((err) => {
								console.log('Cannot create certificate. Roster: ' + item._id + ' ' + err); //eslint-disable-line
							});
					}
					next();
				})
				.catch((err) => {
					console.log('Error trying to find certificate. Roster: ' + item._id + ' ' + err); //eslint-disable-line
				});
		}
	} else {
		next();
	}
});

// Definir índices

RosterSchema.index( {student						: 1,	group: 	1	},{unique: true	}	);
RosterSchema.index( {student						: 1	} );
RosterSchema.index( {org								: 1	} );
RosterSchema.index( {pass								: 1	}	);
RosterSchema.index( {track							: 1	}	);
RosterSchema.index( {group							: 1	}	);
RosterSchema.index( {report							: 1	}	);
RosterSchema.index( {orgUnit						: 1	} );
RosterSchema.index( {project						: 1	} );
RosterSchema.index( {certificateNumber	: 1	}, { sparse: true } );
RosterSchema.index( {student						: 1, status: 	1 } );

// Compilar esquema

const Rosters = mongoose.model('rosters', RosterSchema);
module.exports = Rosters;
