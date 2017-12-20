// Esquema para modelar Unidades Organizacionales
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrgSchema = new Schema ({
  // name --> Nombre de la organizacion
  // org.name
  name: {
    type: String,
    validate: {
      validator: (name) => name.length > 2,
      message: '"name" debe tener más de 2 caracteres'
    },
    required: [ true, '"name" es requerido']
  },
  // alias --> arreglo de "alias" o nombres con los que se conoce al tenant
  // Tenant.alias[]
  alias: [String],
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

const Org = mongoose.model('org', OrgSchema);
module.exports = Org;
