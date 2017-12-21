// Esquema para modelar Unidades Organizacionales
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const permUnitSchema = new Schema ({
  // unidad de permiso
  // permUnit.canRead
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

const permissionsSchema = new Schema ({
  // matriz de permisos
  // permUnit.canRead
  users: {permUnitSchema},
  roles: {permUnitSchema},
  orgs: {permUnitSchema},
  orgUnits: {permUnitSchema}
});

module.exports = Permissions;
