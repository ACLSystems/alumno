// Definir requerimientos
const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const ModSchema = require('./modified');
const PermissionsSchema = require('./permissions');
const PointSchema = require('./point');
const AddressSchema = require('./address');
const moment = require('moment');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

// Definir esquema y subesquemas

// Esquema para el usuario que pertenece a una institución o corporación
const CorporateSchema = new Schema ({
	id: { // se puede usar como id del empleado
		type: String
	},
	isActive: {
		type: Boolean,
		default: true
	},
	type: {
		type: String,
		enum:['student', 'teacher', 'administrative'],
		default: 'student'
	}
},{ _id: false });

// Definir virtuals

// Definir middleware

module.exports = CorporateSchema;

const FiscalSchema = new Schema ({
	identification: { // RFC del usuario
		type: String,
		alias: 'RFC',
		match: /^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/ //CALA72100734A
	},
	name: {
		type: String
	},
	idAPIExternal: { // Id que se utiliza en el sistema externo de facturación
		type: Number
	},
	//phonePrimary: Se toma del campo mainPhone de Person
	//phoneSecondary: Se toma del campo secondaryPhone de Person
	//mobile: Se toma del campo cellPhone de Person
	observations: {
		type: String
	},
	//email: Se toma del campo email de Person
	priceList: { //Colocar el default de la lista de precios
		type: String
	},
	seller: { //Colocar el vendedor por default
		type: String
	},
	term: { //Colocar el término de pago por default
		type:String
	},

	address: {
		street: { type: String},
		extNum: { type: String},
		intNum: { type: String},
		colony: { type: String},
		locality: { type: String},
		municipality: {type: String},
		town: {
			type: String,
			alias: 'city'
		},
		cp: {
			type: String,
			alias: 'zipCode'
		},
		state: { type: String},
		country: {
			type: String,
			default: 'México'
		},
	},
	type: {
		type: String,
		enum:['client', 'provider'],
		default: 'client'
	},
	cfdiUse: {
		type: String
	}
},{ _id: false });

// Definir virtuals

// Definir middleware

module.exports = FiscalSchema;

// Esquema para el usuario que es un estudiante
const StudentSchema = new Schema ({
	id: { // se puede usar como matricula o id del estudiante
		type: String
	},
	career: {
		type: String
	},
	term: {
		type: String
	},
	isActive: {
		type: Boolean,
		default: true
	},
	type: {
		type: String,
		enum:['internal', 'external'],
		default: 'internal'
	},
	external: {
		type: String,
		enum: ['private','public','particular']
	},
	origin: {
		type: String
	}
},{ _id: false });

// Definir virtuals

// Definir middleware

module.exports = StudentSchema;

// Esquema para datos de la persona que posee un usuario
const PersonSchema = new Schema ({
	name: {
		type: String
	},
	fatherName: {
		type: String
	},
	motherName: {
		type: String
	},
	email: {
		type: String,
		unique: [true, 'Email already exists. Please verify'],
		match: /\S+@\S+\.\S+/
	},
	birthDate: {
		type: Date
	},
	mainPhone: {
		type: String
	},
	secondaryPhone: {
		type: String
	},
	cellPhone: {
		type: String
	},
	genre: {
		type: String,
		enum: ['male', 'female']
	},
	alias: {
		type: String
	}

},{ _id: false });

// Definir virtuals
PersonSchema.virtual('fullName').get(function () {
	return this.name + ' ' + this.fatherName + ' ' + this.motherName;
});

// Definir middleware
PersonSchema.pre('save', function(next) {
	this.name = properCase(this.name);
	this.fatherName = properCase(this.fatherName);
	this.motherName = properCase(this.motherName);
	var birthDate = moment.utc(this.birthDate);
	this.birthDate = birthDate.toDate();
	next();
});

module.exports = PersonSchema;

// Esquema para manejar roles

const RolesSchema = new Schema ({
	isAdmin: {
		type: Boolean,
		required: true,
		default: false
	},
	isBusiness: {
		type: Boolean,
		required: true,
		default: false
	},
	isOrg: {
		type: Boolean,
		required: true,
		default: false
	},
	isOrgContent: {
		type: Boolean,
		required: true,
		default: false
	},
	isAuthor: {
		type: Boolean,
		required: true,
		default: false
	},
	isInstructor: {
		type: Boolean,
		required: true,
		default: false
	},
	isSupervisor: {
		type: Boolean,
		required: true,
		default: false
	}

},{ _id: false });

// Definir virtuals

// Definir middleware

module.exports = RolesSchema;

const AdmUsrSchema = new Schema({
	isActive: {
		type: Boolean,
		default: true
	},
	isVerified: {
		type: Boolean,
		default: false
	},
	isDataVerified: {
		type: Boolean,
		default: false
	},
	recoverString: {
		type: String,
		default: ''
	},
	passwordSaved:{
		type: String,
		default: ''
	},
	validationString: {
		type: String,
		default: ''
	},
	adminCreate: {
		type: Boolean,
		default: false
	},
	initialPassword: {
		type: String
	}
},{ _id: false });

// Definir virtuals

// Definir middleware

module.exports = AdmUsrSchema;

const PrefsSchema = new Schema({
	alwaysSendEmail: {
		type: Boolean,
		default: true
	}
});

// Definir virtuals

// Definir middleware

module.exports = PrefsSchema;

// Esquema para usuario
const UserSchema = new Schema ({
	name: {
		type: String,
		required: [true, 'User name is required'],
		unique: [true, 'User name already exists. Please verify'],
		match: /\S+@\S+\.\S+/
	},
	password: {
		type: String,
		required: [true, 'Password is required']
	},
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: Schema.Types.ObjectId,
		ref: 'orgUnits'
	},
	report: {
		type: Boolean,
		default: true
	},
	char1: {
		type: String
	},
	char2: {
		type: String
	},
	person: PersonSchema,
	roles: RolesSchema,
	mod: [ModSchema],
	perm: PermissionsSchema,
	admin: AdmUsrSchema,
	geometry: PointSchema,
	address: AddressSchema,
	student: StudentSchema,
	corporate: CorporateSchema,
	fiscal: [FiscalSchema],
	preferences: PrefsSchema,
});
// Definir virtuals

// Definir middleware

//Encriptar password antes de guardarlo en la base
UserSchema.pre('save', function(next) {
	//if(this.password && this.admin.passwordSaved !== 'saved') {
	var re = /^\$2a\$10\$.*/;
	var found = re.test(this.password);
	if(!found) {
		var salt = bcrypt.genSaltSync(10);
		this.password = bcrypt.hashSync(this.password, salt);
		this.admin.passwordSaved = 'saved';
	}
	next();
});

UserSchema.pre('save', function(next) {
	if(!this.roles) {
		var roles = { isAdmin: false };
		this.roles = roles;
	}
	next();
});

UserSchema.methods.validatePassword = function(password, cb) {
	bcrypt.compare(password, this.password, function(err, isOk) {
		if(err) return cb(err);
		cb(null, isOk);
	});
};

// Definir índices

UserSchema.index( { org									: 1	}	);
UserSchema.index( { char1								: 1	}	);
UserSchema.index( { char2								: 1	}	);
UserSchema.index( { report							: 1	}	);
UserSchema.index( { orgUnit							: 1	}	);
UserSchema.index( { 'person.name'				: 1	}	);
UserSchema.index( { 'person.fatherName'	: 1	}	);
UserSchema.index( { 'person.motherName'	: 1	}	);
UserSchema.index( { 'person.email'			: 1	}	);
UserSchema.index( { 'person.genre'			: 1	}, { sparse: true }	);
UserSchema.index( { 'fiscal.id'					: 1	}, { sparse: true } );
UserSchema.index( { 'fiscal.type'				: 1	}, { sparse: true } );
UserSchema.index( { 'student.id'				: 1	}, { sparse: true }	);
UserSchema.index( { 'student.term'			: 1	}, { sparse: true }	);
UserSchema.index( { 'student.type'			: 1	}, { sparse: true }	);
UserSchema.index( { 'student.career'		: 1	}, { sparse: true }	);
UserSchema.index( { 'student.origin'		: 1	}, { sparse: true }	);
UserSchema.index( { 'student.isActive'	: 1	}, { sparse: true }	);
UserSchema.index( { 'student.external'	: 1	}, { sparse: true }	);
UserSchema.index( { 'corporate.id'			: 1	}, { sparse: true }	);
UserSchema.index( { 'corporate.type'		: 1	}, { sparse: true }	);
UserSchema.index( { 'corporate.isActive': 1	}, { sparse: true }	);

// Compilar esquema

const User = mongoose.model('users', UserSchema);
module.exports = User;

// Funciones privadas

function properCase(obj) {
	var name = new String(obj);
	var newName = new String();
	var nameArray = name.split(' ');
	var arrayLength = nameArray.length - 1;
	nameArray.forEach(function(word,i) {
		word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		if(i === arrayLength) { newName += word; } else { newName += word + ' '; }
	});
	return newName;
}
