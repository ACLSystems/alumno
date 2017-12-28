// Esquema para modelar Unidades Organizacionales
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

const OrgsSchema = new Schema ({
  name: {
    type: String,
    validate: {
      validator: (name) => name.length > 2,
      message: '"name" debe tener más de 2 caracteres'
    },
    required: [ true, '"name" es requerido'],
    lowercase: true,
    unique: true
  },
  longName: {
    type: String,
    validate: {
      validator: (longName) => longName.length > 2,
      message: '"longName" debe tener más de 2 caracteres'
    },
    required: [ true, '"longName" es requerido']
  },
  alias:{
    type: [String] /*,
    validate: {
      validator: (alias) => alias.length > 2,
      message: '"alias" debe tener más de 2 caracteres'
    }
    */
  },
  isActive: {
    type: Boolean,
    default: true
  },
  mod: [ModSchema],
  perm: PermissionsSchema
});

const Orgs = mongoose.model('orgs', OrgsSchema);
module.exports = Orgs;
