// Esquema para modelar Unidades Organizacionales
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const PermissionsSchema = require('./permissions');
const Schema = mongoose.Schema;

const OrgUnitsSchema = new Schema ({
  name: {
    type: String,
    index: true
  },
  longName: {
    type: String
  },
  alias:{
    type: [String]
  },
  parent: {
    type: String,
    index: true
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

OrgUnitsSchema.index( { name: 1, parent: 1}, { unique: true } );

const OrgUnits = mongoose.model('orgUnits', OrgUnitsSchema);
module.exports = OrgUnits;

OrgUnitsSchema.pre('save', function(next) {
  this.name = this.name.toLowerCase();
  next();
});
