const mongoose 	= require('mongoose');
const auto 			= require('mongoose-sequence')(mongoose);
const Schema 		= mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const CertificateSchema = new Schema ({
	number: {
		type: Number,
		unique: true
	},
	roster: {
		type: Schema.Types.ObjectId,
		ref: 'rosters',
		unique: true
	}
});

CertificateSchema.plugin(auto,{inc_field: 'number'});

const Certificate = mongoose.model('certificates', CertificateSchema);
module.exports = Certificate;
