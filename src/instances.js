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
	orgUnitName: {
		type: String
	},
	registerOrgUnit: {
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

InstanceSchema.static('getInstance', async function(instanceOUName, giveMe) {
	const query = checkValidOID(instanceOUName) ?
		{_id: instanceOUName} :
		{ $or : [
			{name: instanceOUName},
			{parent: instanceOUName}
		]};
	const OrgUnit = require('./orgUnits');
	var ou = await OrgUnit.findOne(query).catch(err => {
		console.log(err);
		return null;
	});
	if(!ou) return null;
	if(ou.type !== 'state') {
		ou = await OrgUnit.findOne({name: ou.parent}).catch(err => {
			console.log(err);
			return null;
		});
		if(!ou) return null;
	}
	const instance = await this.findOne({ $or : [
		{orgUnit: ou._id},
		{orgUnitName: instanceOUName}
	]}).catch(err => {
		console.log(err);
		return null;
	});
	if(!instance) return null;
	return (
		giveMe === 'combo' && instance.url &&
		instance.url.libreta) ?
		{
			ouName: instance.orgUnitName,
			url: instance.url.libreta
		} :
		(giveMe === 'ouName') ?  instance.orgUnitName :
			(giveMe === 'URL' && instance.url &&
			instance.url.libreta) ? instance.url.libreta :
				(giveMe === 'instance') ? instance._id :
					instance;
});

InstanceSchema.index({hostname: 1},{unique: true});
InstanceSchema.index({orgUnit	: 1});

const Instances = mongoose.model('instances', InstanceSchema);
module.exports = Instances;

function checkValidOID(stringToCheck) {
	// console.log(stringToCheck);
	// console.log(typeof stringToCheck);
	if(typeof stringToCheck === 'object') stringToCheck += '';
	const ObjectId = mongoose.Types.ObjectId;
	const regex = /^[a-fA-F0-9]{24}$/g;
	if(ObjectId.isValid(stringToCheck) && stringToCheck.match(regex)) return true;
	return false;
}
