// Definir requerimientos
const mongoose 					= require('mongoose');
const ModSchema 				= require('./modified');
const OwnerSchema 			= require('./owner');
const PermissionsSchema = require('./permissions');

const Schema 						= mongoose.Schema;
const ObjectId 					= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const InstanceSchema = new Schema({
	backOffice: String,
	bank: {
		name: String,
		account: String,
		CLABE: String
	},
	color: {
		name: String,
		events: [String],
	},
	footer: {
		link: String,
		name: String
	},
	organization: String,
	orgUnit: {
		type: ObjectId,
		ref: 'orgUnits'
	},
	hostname: String,
	platform: {
		type: {
			type: String,
			enum: ['mooc','other']
		},
		selfRegister: Boolean,
		moocAmount: String,
		university: Boolean
	},
	logo: {
		big:String,
		bigWhite: String,
		normal:String,
		brand: String,
		small: String
	},
	url: {
		api: String,
		libreta: String,
		libretaURI: String,
		siteName: String
	},
	instance: {
		title: String,
		name: String,
		ref: String,
		description: String
	},
	captcha: {
		siteKey: String,
		publicKey: String
	},
	emailSupport: String,
	vendor: {
		link: String,
		name: String
	},
	idTutor: String,
	version: Number,
	own: OwnerSchema,
	mod: [ModSchema],
	perm: PermissionsSchema
});

InstanceSchema.index({hostname: 1},{unique: true});
InstanceSchema.index({orgUnit	: 1});

const Instances = mongoose.model('instances', InstanceSchema);
module.exports = Instances;
