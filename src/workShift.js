const mongoose			= require('mongoose');
const Schema 				= mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const ShiftSchema = new Schema({
	day: {
		type: Number
	},
	beginHour: {
		type: Number
	},
	beginMinute: {
		type: Number
	},
	endHour: {
		type: Number
	},
	endMinute: {
		type: Number
	},
},{ _id: false });

module.exports = ShiftSchema;

const WorkShiftSchema = new Schema({
	name: {
		type: String
	},
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: Schema.Types.ObjectId,
		ref: 'orgUnits'
	},
	allTime: {
		type: Boolean
	},
	shifts: [ShiftSchema]
});

//WorkShiftSchema.index({'shifts.day'	: 1});

const WorkShift = mongoose.model('workshifts', WorkShiftSchema);
module.exports = WorkShift;
