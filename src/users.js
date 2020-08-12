// Definir requerimientos
const mongoose 					= require('mongoose'			);
const moment 						= require('moment'				);
const bcrypt 						= require('bcryptjs'			);
const ModSchema 				= require('./modified'		);
const PermissionsSchema = require('./permissions'	);
const PointSchema 			= require('./point'				);
const AddressSchema 		= require('./address'			);

const Schema 						= mongoose.Schema;
const ObjectId 					= Schema.Types.ObjectId;

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
	},
	isMonitor: {
		type: Boolean,
		required: true,
		default: false
	},
	isRequester: {
		type: Boolean,
		required: true,
		default: false
	},
	isMoocSupervisor: {
		type: Boolean,
		required: true,
		default: false
	}

},{ _id: false });

// Definir virtuals

// Definir middleware

module.exports = RolesSchema;

const AdmUsrSchema = new Schema({
	// isActive Usuario activo o inactivo
	isActive: {
		type: Boolean,
		default: true
	},
	// isVerified Sirve para validar la cuenta de correo
	isVerified: {
		type: Boolean,
		default: false
	},
	// isDataVerified Sirve para validar los datos del usuario
	isDataVerified: {
		type: Boolean,
		default: false
	},
	// recoverString Cadena para validar la pérdida del password
	recoverString: {
		type: String,
		default: ''
	},
	// recoverNumber Cadena para validar la pérdidad de password
	recoverNumber: {
		type: Number,
		default: 0
	},
	// passwordSaved ???
	passwordSaved:{
		type: String,
		default: ''
	},
	// validationString <-- Investigar para qué lo pusimos
	validationString: {
		type: String,
		default: ''
	},
	// adminCreate Cuenta creada por el administrador
	adminCreate: {
		type: Boolean,
		default: false
	},
	// initialPassword Para guardar el password original
	initialPassword: {
		type: String
	},
	// tokens del usuario
	tokens: [{
		type: String
	}],
	lastLogin: {
		type: Date
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
		type: ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: ObjectId,
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
	flag1: {
		type: String
	},
	flag2: {
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
	fiscal: [{
		type: ObjectId,
		ref: 'fiscalContacts'
	}],
	fiscalcurrent: {
		type: Number
	},
	preferences: PrefsSchema,
	workShift: {
		type: ObjectId,
		ref: 'workshifts'
	},
	attachedToWShift: {
		type: Boolean,
		default: false
	},
	project: [{
		type: ObjectId,
		ref: 'projects'
	}],
	currentProject: {
		type: String
	},
	image: {
		data: Buffer,
		contentType: String,
		originalName: String
	},
	bio : {
		type: String
	}
});
// Definir virtuals

// Definir middleware

//Encriptar password antes de guardarlo en la base
UserSchema.pre('save', function(next) {
	// Este último pedazo hay que validarlo antes de liberarlo.
	// if(!this.isModified('password')) {
	// 	next();
	// }
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
UserSchema.index( { flag1								: 1	}	);
UserSchema.index( { flag2								: 1	}	);
UserSchema.index( { report							: 1	}	);
UserSchema.index( { orgUnit							: 1	}	);
UserSchema.index( { 'person.name'				: 1	}	);
UserSchema.index( { 'person.fatherName'	: 1	}	);
UserSchema.index( { 'person.motherName'	: 1	}	);
UserSchema.index( { 'person.email'			: 1	}	);
UserSchema.index( { 'person.genre'			: 1	}, { sparse: true }	);
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
