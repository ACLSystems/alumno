// Esquema para modelar Unidades Organizacionales
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

const OrgUnitsSchema = new Schema ({
  name: {
    type: String
  },
  longName: {
    type: String
  },
  alias:{
    type: [String]
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
  },
  mod: [ModSchema],
  perm: PermissionsSchema
});

const OrgUnits = mongoose.model('orgUnits', OrgUnitsSchema);
module.exports = OrgUnits;

OrgUnitsSchema.pre('save', function(next) {
  this.name = this.name.toLowerCase();
  next();
});
