// Definir requerimientos
const mongoose 	= require('mongoose');
const auto 			= require('mongoose-sequence')(mongoose);
//const Roster 		= require('./roster');

const Schema 		= mongoose.Schema;
const ObjectId 	= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const CertificateSchema = new Schema ({
	number: {
		type: Number,
		unique: true
	},
	roster: {
		type: ObjectId,
		ref: 'rosters',
		unique: true
	},
	date: {
		type: Date,
		default: Date.now
	}
});

// Definir Virtuals

// Definir middleware

CertificateSchema.plugin(auto,{inc_field: 'number'});
/*
CertificateSchema.post('save', function(next) {
	Roster.findOne({_id: this.roster})
		.then((item) => {
			if(item) {
				if(!item.certificateNumber || item.certificateNumber === 0) {
					item.certificateNumber = this.number;
					item.save()
						.then(() => {
							next();
						})
						.catch((err) => {
							console.log('certificate middleware Error: Saving roster: ' + this.roster + ' Error: ' + err); //eslint-disable-line
						});
				} else {
					next();
				}
			} else {
				next();
			}
		})
		.catch((err) => {
			console.log('certificate middleware Error: Finding roster: ' + this.roster + ' Error: ' + err); //eslint-disable-line
		});
});
*/

// Definir índices

CertificateSchema.index( { number					: 1					} );

// Compilar esquema

const Certificate = mongoose.model('certificates', CertificateSchema);
module.exports = Certificate;
