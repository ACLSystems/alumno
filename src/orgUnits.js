// Esquema para modelar Unidades Organizacionales
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrgUnitSchema = new Schema ({
  // name --> Nombre de la unidad organizacional
  // orgUnits.name
  name: {
    type: String,
    unique: true,  // Hay que validarlo
    validate: {
      validator: (name) => name.length > 2,
      message: '"Org name" debe tener más de dos caracteres'
    }
  },
  // longName --> Nombre largo de la unidad organizacional
  // orgUnits.logName
  longName: {
    type: String,
    validate: {
      validator: (longName) => longName.length > 2,
      message: '"Org long name" debe tener más de dos caracteres'
    }
  },
  // alias --> Alias de la unidad organizacional
  // orgUnits.alias[]
  alias: [String],
  // parent --> OU al que pertenece esta unidad
  // orgUnits.parent
  parent: {
    type: String
  },
  // org --> Org a la que pertenece esta unidad
  // orgUnits.org
  org: {
    type: Schema.Types.ObjectId,
    ref: 'orgs'
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

const OrgUnit = mongoose.model('orgUnits', OrgUnitSchema);
module.exports = OrgUnit;
