// Definir requerimientos
const mongoose 	= require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const CouponSchema = new Schema ({
	number: {
		type: String
	},
	object: {
		kind: String,
		item: {
			type: Schema.Types.ObjectId,
			refPath: 'object.kind'
		}
	},
	discount: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100'],
		default: 0
	},
	status: {
		type: String,
		enum: ['current','expired','cancelled'], // Status expired debe ser manejado manualmente durante la consulta del cupón
		default: 'current'
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
	}
});

// Definir virtuals

// Definir middleware

// Definir índices

// Compilar esquema

const Coupons = mongoose.model('coupons', CouponSchema);
module.exports = Coupons;
