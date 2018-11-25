// Definir requerimientos
const mongoose 	= require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const CouponHolderSchema = new Schema ({
	coupon: {
		type: Schema.Types.ObjectId,
		ref: 'coupons',
		required: true
	},
	total:{
		type: Number,
		default:0
	},
	status:{
		type: String,
		enum: ['reserved','released','holding']
	},
	holder: {
		type: Schema.Types.ObjectId,
		ref: 'users'
	},
	date: {
		type: Date,
		default: Date.now
	},
	dateReleased: {
		type: Date
	},
	dateHold: {
		type: Date
	}
});

// Definir virtuals

// Definir middleware

CouponHolderSchema.pre('save', function(next) {
	if(this.isModified('status') && this.status === 'holding') {	// Validar estos dos hooks
		this.dateHold = new Date();
	}
	if(this.isModified('status') && this.status === 'released') {
		this.dateReleased = new Date();
	}
	next();
});

// Definir índices

// Compilar esquema

const CouponHolders = mongoose.model('couponHolders', CouponHolderSchema);
module.exports = CouponHolders;
