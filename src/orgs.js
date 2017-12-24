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
    required: [ true, '"name" es requerido']
  },
  longName: {
    type: String,
    validate: {
      validator: (longName) => longName.length > 2,
      message: '"longName" debe tener más de 2 caracteres'
    },
    required: [ true, '"longName" es requerido']
  }
  alias:{
    type: [String],
    validate: {
      validator: (alias) => alias.length > 2,
      message: '"alias" debe tener más de 2 caracteres'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
  mod: [{ModSchema}],
  perm: {PermissionsSchema}
});

/*
OrgSchema.pre('save', function(next) {
  console.log('Pre: test');
  console.log(this.name);
  Org.findOne({ name: this.name })
    .then((myOrg) => {
      console.log('Pre: find');
      console.log(myOrg);
      if(myOrg.name === this.name)  {
        var err = new Error('Name existe');
        next(err);
      }
      next();
    });
});
*/

const Orgs = mongoose.model('orgs', OrgsSchema);
module.exports = Orgs;
