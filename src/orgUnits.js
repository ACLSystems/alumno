// Definir requerimientos
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const PointSchema = require('./point');
const AddressSchema = require('./address');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

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
		enum: ['org', 'country', 'region', 'state', 'city', 'area', 'campus','statal','cast','institute', 'department', 'building', 'section', 'floor','room']
	},
	level: {
		type: Number,
		min: [1,'Minimum value is 1'],
		max: [3,'Maximum value is 3'],
		default: 3
	},
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	},
	isActive: {
		type: Boolean,
		default: true
	},
	displayEvals: {
		type: Boolean,
		default: false
	},
	displayRFC:{
		type: Boolean,
		default:false
	},
	displayShift:{
		type: Boolean,
		default: false
	},
	contactPhone: [String],
	formatted_address: String,
	geometry:PointSchema,
	address: AddressSchema,
	mod: [ModSchema],
	perm: PermissionsSchema
});

// Definir virtuals

// Definir middleware

OrgUnitsSchema.pre('save', function(next) {
	this.name = this.name.toLowerCase();
	next();
});

// Definir índices

OrgUnitsSchema.index( { org				: 1, parent	: 1, name	: 1	}, { unique: true } );
OrgUnitsSchema.index( { parent		:	1	} );
OrgUnitsSchema.index( { name			: 1 } );
OrgUnitsSchema.index( { type			: 1 } );
OrgUnitsSchema.index( { level			: 1 } );
OrgUnitsSchema.index( { longName	: 1 } );
OrgUnitsSchema.index( { isActive	: 1 } );

// Compilar esquema

const OrgUnits = mongoose.model('orgUnits', OrgUnitsSchema);
module.exports = OrgUnits;
