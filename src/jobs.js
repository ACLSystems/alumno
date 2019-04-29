// Definir requerimientos
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const JobsSchema = new Schema ({
	status: {
		type: String,
		enum: ['draft','active','suspended','deleted'],
		default: 'draft'
	},
	code: {
		type: String,
	},
	name: {
		type: String,
		required: true
	},
	cron: {
		second	: { type: String, default: '*' }, // (0-59)
		minute	: { type: String, default: '*' }, // (0-59)
		hour		: { type: String, default: '*' }, // (0-23)
		day			: { type: String, default: '*' }, // (1-31)
		month		: { type: String, default: '*' }, // (0-11) Enero - Diciembre
		weekDay	: { type: String, default: '*' }, // (0-6 ) Domingo - Sábado
	},
	onTick: {
		type: String
	},
	onComplete: {
		type: String
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: 'users'
	},
	type: {
		type: String,
		enum: ['internal','user'],
		default: 'internal'
	},
	triggerType: {
		type: String,
		enum: ['time','manual'],
		default: 'time'
	},
	dependsOn: {
		type: Schema.Types.ObjectId,
		ref: 'jobs'
	},
	priority: {
		type: Number,
		default: 900
	},
	beginDate: {
		type: Date
	},
	endDate: {
		type: Date
	},
	tz: {
		type: String,
		default: 'America/Mexico_City'
	},
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
	perm: PermissionsSchema
},{toJSON: {virtuals: true}});

// Definir virtuals

JobsSchema.virtual('cronString').get(function() {
	return this.cron.second + ' ' +
	this.cron.minute + ' ' +
	this.cron.hour + ' ' +
	this.cron.day + ' ' +
	this.cron.month + ' ' +
	this.cron.weekDay;
});

// Definir middleware

// Definir índices

JobsSchema.index( { code	: 1, org: 1	}, {unique: true} );
JobsSchema.index( { priority		: 1	} );
JobsSchema.index( { code				: 1 } );
JobsSchema.index( { name				: 1 } );
JobsSchema.index( { status			: 1 } );
JobsSchema.index( { beginDate		: 1 } );
JobsSchema.index( { endDate			: 1 } );

// Compilar esquema

const Jobs = mongoose.model('jobs', JobsSchema);
module.exports = Jobs;
