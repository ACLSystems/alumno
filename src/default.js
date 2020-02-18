const mongoose 					= require('mongoose');
const ModSchema 				= require('./modified');
const Schema 						= mongoose.Schema;

mongoose.plugin(schema => {
	schema.options.usePushEach = true;
});

const DefaultSchema = new Schema({
	module:  {
		type: String,
		enum: ['roster','user','mail','course','group','other'],
		required: [true, '"module" es requerido'],
		default: 'other'
	},
	code: {
		type: String,
		required: [true, '"code" es requerido']
	},
	config: {
		type: String,
		required: [true, '"config" es requerido']
	},
	mod: [ModSchema]
});

DefaultSchema.index({ module: 1, code: 1}, { unique: true});
DefaultSchema.index({ module: 1 });
DefaultSchema.index({ code	: 1 });

const Defaults = mongoose.model('defaults', DefaultSchema);
module.exports = Defaults;
