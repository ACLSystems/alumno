// Esquema para modelar Unidades Organizacionales
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PermUnitSchema = new Schema ({
  // unidad de permiso
  // permUnit.canRead
  name: {
    type: String
  }
  canRead: {
    type: Boolean
  },
  // permUnit.canModify
  canModify: {
    type: Boolean
  },
  // permUnit.canSec
  canSec: {
    type: Boolean
  }
});

module.exports = PermUnitSchema;

const PermissionsSchema = new Schema ({
  // matriz de permisos
  // permUnit.canRead
  users: [PermUnitSchema],
  roles: [PermUnitSchema],
  orgs: [PermUnitSchema],
  orgUnits: [PermUnitSchema]
});

module.exports = PermissionsSchema;
