// Esquema para modelar Usuarios
const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const ModSchema = require('./modified');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

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
    match: /\S+@\S+\.\S+/
  },
  birthDate: {
    type: Date
  }
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

});

module.exports = RolesSchema;

// Esquema para usuario
const UserSchema = new Schema ({
  name: {
    type: String,
    required: [true, 'nombre de usuario es requerido'],
    unique: [true, 'usuario ya existe. Favor de verificar'],
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'password es requerido']
  },
  person: PersonSchema,
  org: {
    type: Schema.Types.ObjectId,
    ref: 'orgs'
  },
  orgUnit: {
    type: Schema.Types.ObjectId,
    ref: 'orgUnits'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  roles: RolesSchema,
  mod: [ModSchema],
  perm: PermissionsSchema,
  recoverString: {
    type: String
  }
});


//Encriptar password antes de guardarlo en la base
UserSchema.pre('save', function(next) {
  if(this.password) {
    var salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
  };
  next();
});

UserSchema.pre('save', function(next) {
  if(!this.roles) {
    var roles = { isAdmin: false };
    this.roles = roles;
  };
  next();
});

UserSchema.methods.validatePassword = function(password, cb) {
  bcrypt.compare(password, this.password, function(err, isOk) {
    if(err) return cb(err);
    cb(null, isOk);
  });
}

const User = mongoose.model('users', UserSchema);
module.exports = User;
