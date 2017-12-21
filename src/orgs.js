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

const Org = mongoose.model('orgs', OrgSchema);
module.exports = Org;
