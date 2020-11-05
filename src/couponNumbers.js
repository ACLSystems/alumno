const mongoose 	= require('mongoose');
const auto 			= require('mongoose-sequence')(mongoose);

const Schema 		= mongoose.Schema;
const ObjectId 	= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const CouponNumberSchema = new Schema({
	number: {
		type: Number
	},
	coupon: {
		type: ObjectId,
		ref: 'coupons'
	}
});

CouponNumberSchema.plugin(auto,{id:'numberSeq',inc_field: 'number', reference_fields: ['coupon'] });

CouponNumberSchema.index({number: 1});
CouponNumberSchema.index({coupon: 1});
