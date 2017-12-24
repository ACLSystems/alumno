// Esquema para modelar Unidades Organizacionales
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

const OrgUnitsSchema = new Schema ({
  name: {
    type: String,
    validate: {
      validator: (name) => name.length > 2,
      message: '"Org name" debe tener más de dos caracteres'
    }
  },
  longName: {
    type: String,
    validate: {
      validator: (longName) => longName.length > 2,
      message: '"Org long name" debe tener más de dos caracteres'
    }
  },
  alias:{
    type: [String],
    validate: {
      validator: (alias) => alias.length > 2,
      message: '"alias" debe tener más de 2 caracteres'
    }
  },
  parent: {
    type: String
  },
  org: {
    type: Schema.Types.ObjectId,
    ref: 'orgs'
  },
  isActive: {
    type: Boolean,
    default: true
  }
  mod: [{ModSchema}],
  perm: {PermissionsSchema}
});

const OrgUnits = mongoose.model('orgUnits', OrgUnitsSchema);
module.exports = OrgUnits;
