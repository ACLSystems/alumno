// Esquema para modelar Usuarios
//const bcrypt = require('bcrypt');  // Encriptar el password del usuario
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/*
  Schema = mongoose.Schema,
  bcrypt = require(bcrypt),
  SALT_WORK_FACTOR = 10;
*/

// Todos los atributos de cada esquema/modelo deben seguir estas reglas:
// Siempre en idioma inglés
// Siempre en minusculas, a menos que sea la conjunción de dos palabras
//  donde ambas deben estar juntas y las subsecuentes palabras deberan
//  comenzar con mayúscula. Por ejemplo: Apellido Paterno => fatherName
// No iniciar con números, letras mayúsculas, ni caracteres especiales
// No usar palabras reservadas.

// Esquema para datos de la persona que posee un usuario
const PersonSchema = new Schema ({
  // User.person.name <-- nombre del usuario
  name: {
    type: String
  },
  // User.person.fatherName <-- Apellido paterno del usuario
  fatherName: {
    type: String
  },
  // User.person.motherName <-- Apellido materno del usuario
  motherName: {
    type: String
  },
  // User.person.email <-- Correo del usuario
  email: {  // El correo deberá ser el mismo que el nombre del usuario User.name
    type: String
  },
  // User.person.birthDate <-- Fecha de nacimiento
  birthDate: {
    type: Date
  }
});

module.exports = PersonSchema;

// Esquema para usuario
const UserSchema = new Schema ({
  // User.name <-- username
  name: {
    type: String,
    required: [true, 'nombre de usuario es requerido'],
    unique: true,
    lowercase: true
  },
  // User.password <-- password del usuario
  password: {
    type: String,
    required: [true, 'password es requerido']
  },
  // User.person <-- objeto persona (ver esquema person)
  person: {PersonSchema},
  // User.org <-- referencia a objeto org (ver modelo org)
  org: {
    type: Schema.Types.ObjectId,
    ref: 'org'
  },
  orgUnit: {
    type: Schema.Types.ObjectId,
    ref: 'orgUnit'
  },
  createDate: {
    type: Date,
    default: Date.now
  },
  modifiedDate: {
    type: Date,
    default: Date.now
  },
  modifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  }
});

// Middlewares para UserSchema --------------------------------------------------------------
// antes de guardar el password hay que encriptarlo
/*
UserSchema.pre('save', {
  var user = this;
  // only hash the password if it has been modified (or is new)
  if(!user.isModified('password')) return next();

  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if(err) return next(err);

    // override the cleartext password with the hashed one
    user.password = hash;
    next();
  });
});

// para acceder al password encriptado
UserSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};
*/

const User = mongoose.model('users', UserSchema);
module.exports = User;
