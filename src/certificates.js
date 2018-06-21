const mongoose 	= require('mongoose');
const auto 			= require('mongoose-sequence')(mongoose);
const Schema 		= mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const CertificateSchema = new Schema ({
	number: {
		type: Number
	},
	roster: {
		type: Schema.Types.ObjectId,
		ref: 'rosters'
	}
});

CertificateSchema.plugin(auto,{inc_field: 'number'});
CertificateSchema.index({number	:1	},{unique: true});
CertificateSchema.index({user		:1	});
CertificateSchema.index({course	:1	});

const Certificate = mongoose.model('certificates', CertificateSchema);
module.exports = Certificate;
