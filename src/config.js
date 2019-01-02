// Definir requerimientos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

const ConfigSchema = new Schema({
	fiscal: {
		pricelist: { //Colocar el default de la lista de precios
			id: {
				type: String
			},
			name: {
				type: String
			}
		},
		seller: { //Colocar el vendedor por default
			id: {
				type: String
			},
			name: {
				type: String
			},
			identification: {
				type: String
			}
		},
		term: { //Colocar el término de pago por default
			id: {
				type: String
			},
			name: {
				type: String
			},
			days: {
				type: String
			}
		}
	},
	apiExternal: {
		uri: {
			type: String
		},
		username: {
			type: String
		},
		token: {
			type: String
		},
		enabled: {
			type: Boolean,
			default: false
		}
	},
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	}
});

// Definir middleware

// Definir índices

// Compilar esquema

const Config = mongoose.model('config', ConfigSchema, 'config');
module.exports = Config;
