// Esquema para modelar Usuarios
const mongoose = require('mongoose');
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

// Esquema para usuario
const UserSchema = new Schema ({
  name: {
    type: String,
    required: [true, 'nombre de usuario es requerido'],
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'password es requerido']
  },
  person: {PersonSchema},
  org: {
    type: Schema.Types.ObjectId,
    ref: 'org'
  },
  orgUnit: {
    type: Schema.Types.ObjectId,
    ref: 'orgUnit'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
  mod: [{ModSchema}],
  perm: {PermissionsSchema}
});

const User = mongoose.model('users', UserSchema);
module.exports = User;
