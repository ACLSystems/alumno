const mongoose			= require('mongoose');
const ModSchema			= require('./modified');
const Schema 				= mongoose.Schema;
const ObjectId 			= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const OptionsSchema = new Schema({
	enabled: Boolean,
	font: String,
	fontType: String,
	fontSize: Number,
	textColor: {
		r: Number,
		g: Number,
		b: Number
	},
	grayColor: Number,
	text: {
		xPos: Number,
		yPos: Number,
		pre: String,
		post: String,
		justify: String
	}
}, {_id:false});

const CertTemplateSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	instance: {
		type: ObjectId,
		ref: 'instances',
		required: true
	},
	orgUnitName: {
		type: String
	},
	data: {
		type: String
	},
	survey: {
		type: String
	},
	conditions: {
		status: {
			type: String,
			enum: ['active','pending','any'],
			default: 'active'
		},
		pass: {
			type: Boolean,
			default: true
		},
		finalGrade: {
			type: Boolean,
			default: true
		},
		track: {
			type: Boolean,
			default: true
		},
		minGrade: {
			type: Number,
			default: 70,
			min: [60,'minGrade debe ser al menos 60'],
			max: 100
		},
		minTrack: {
			type: Number,
			default: 100,
			min: [70,'minTrack debe ser al menos 70'],
			max: 100
		}
	},
	drawing: {
		doc: {
			orientation: String,
			unit: String,
			type: {
				type: String
			},
			x: Number,
			y: Number,
			w: Number,
			h: Number
		},
		folio: OptionsSchema,
		to: OptionsSchema,
		studentName: OptionsSchema,
		grade: OptionsSchema,
		course: OptionsSchema,
		courseDuration: OptionsSchema,
		endDate: OptionsSchema,
		qr: {
			enabled: Boolean,
			url: String,
			size: Number,
			x: Number,
			y: Number,
			w: Number,
			h: Number
		}
	},
	mod: [ModSchema]
});

CertTemplateSchema.index({name		 : 1});
CertTemplateSchema.index({instance : 1});

const CertificateTemplate = mongoose.model('certificateTemplate', CertTemplateSchema);
module.exports = CertificateTemplate;
