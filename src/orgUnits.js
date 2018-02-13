// Esquema para modelar Unidades Organizacionales
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const PointSchema = require('./point');
const AddressSchema = require('./address');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const OrgUnitsSchema = new Schema ({
	name: {
		type: String,
		index: true
	},
	longName: {
		type: String
	},
	alias:{
		type: [String]
	},
	parent: {
		type: String,
		index: true
	},
	type: {
		type: String,
		enum: ['org', 'country', 'region', 'state', 'city', 'area', 'campus', 'institute', 'department', 'building', 'section', 'floor','room']
	},
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	},
	isActive: {
		type: Boolean,
		default: true
	},
	contactPhone: [String],
	formatted_address: String,
	geometry:PointSchema,
	address: AddressSchema,
	mod: [ModSchema],
	perm: PermissionsSchema
});

OrgUnitsSchema.index( { name: 1, parent: 1, org: 1}, { unique: true } );

const OrgUnits = mongoose.model('orgUnits', OrgUnitsSchema);
module.exports = OrgUnits;

OrgUnitsSchema.pre('save', function(next) {
	this.name = this.name.toLowerCase();
	next();
});
