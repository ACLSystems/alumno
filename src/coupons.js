// Definir requerimientos
const mongoose 	= require('mongoose');
const mod = require('./modified');
const Schema 		= mongoose.Schema;
const ObjectId 	= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const CouponSchema = new Schema ({
	code: {
		type: String
	},
	org: {
		type: ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: ObjectId,
		ref: 'orgUnits'
	},
	item: {
		type: ObjectId,
		refPath: 'onModel'
	},
	onModel: {
		type: String,
		enum: ['courses','groups']
	},
	discount: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	},
	status: {
		type: String,
		enum: ['draft','current','expired','cancelled'], // Status expired debe ser manejado manualmente durante la consulta del cupón
		default: 'draft'
	},
	quantity:{
		type: Number,
		min: [0,'Minimum value is 0'],
		default: 0
	},
	beginDate:{
		type: Date,
		default: Date.now
	},
	endDate:{
		type: Date,
		default: Date.now
	},
	mod: [mod]
});

// Definir virtuals

// Definir middleware

// Definir índices

// Compilar esquema

CouponSchema.index({code					: 1, item:1, orgUnit: 1}, {unique:true,sparse:true});
CouponSchema.index({code					:	1});
CouponSchema.index({item					:	1},{sparse:true});
CouponSchema.index({orgUnit				: 1},{sparse: true});
CouponSchema.index({beginDate			:	-1});
CouponSchema.index({endDate				:	-1});

const Coupons = mongoose.model('coupons', CouponSchema);
module.exports = Coupons;
