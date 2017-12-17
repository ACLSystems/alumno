// Esquema para modelar TENANTS
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Subdocumento para Unidades Organizacionales
const OrgUnitSchema = new Schema ({
  // name --> Nombre de la Organizacion
  name: {
    type: String,
    unique: true,
    validate: {
      validator: (name) => name.length > 2,
      message: '"Org name" debe tener más de dos caracteres'
    },
  }
  // longName --> Nombre largo de la Organizacion
  longName: {
    type: String,
    validate: {
      validator: (longName) => longName.length > 2,
      message: '"Org long name" debe tener más de dos caracteres'
    }
  },
  // alias --> Alias de la Organizacion
  alias: [String],
  // parent --> O(tenant), OU al que pertenece esta unidad
  parent: {
    type: String
  }
});

const TenantSchema = new Schema ({
  // name --> Nombre del Tenant
  name: {
    type: String,
    validate: {
      validator: (name) => name.length > 2,
      message: '"name" debe tener más de 2 caracteres'
    },
    required: [ true, '"name" es requerido']
  },
  // alias --> arreglo de "alias" o nombres con los que se conoce al tenant
  alias: [String],
  // organization --> arreglo de unidades organizacionales
  orgUnits: [OrgUnitSchema]
});

const Tenant = mongoose.model('tenant', TenantSchema);
module.exports = Tenant;
