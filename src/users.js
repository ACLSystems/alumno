// Esquema para modelar Usuarios
const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const ModSchema = require('./modified');
const PermissionsSchema = require('./permissions');
const moment = require('moment');
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
    unique: [true, 'Email already exists. Please verify'],
    match: /\S+@\S+\.\S+/
  },
  birthDate: {
    type: Date
  }
});

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

});

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
  recoverString: {
    type: String,
    default: ''
  },
  passwordSaved:{
    type: String,
    default: ''
  }
});

module.exports = AdmUsrSchema;

// Esquema para usuario
const UserSchema = new Schema ({
  name: {
    type: String,
    required: [true, 'User name is required'],
    unique: [true, 'User name already exists. Please verify'],
    lowercase: true
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
  person: PersonSchema,
  roles: RolesSchema,
  mod: [ModSchema],
  perm: PermissionsSchema,
  admin: AdmUsrSchema
});


//Encriptar password antes de guardarlo en la base
UserSchema.pre('save', function(next) {
  if(this.password && this.admin.passwordSaved !== 'saved') {
    var salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
    this.admin.passwordSaved = 'saved';
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

function properCase(obj) {
  var name = new String(obj);
  var newName = new String();
  var nameArray = name.split(" ");
  var arrayLength = nameArray.length - 1;
  nameArray.forEach(function(word,i) {
    word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    if(i === arrayLength) { newName += word } else { newName += word + ' '};
  });
  return newName;
};
