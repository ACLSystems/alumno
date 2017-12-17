// Esquema para modelar Usuarios
const bcrypt = require('bcrypt');
const mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  bcrypt = require(bcrypt),
  SALT_WORK_FACTOR = 10;

// Esquema para datos de la persona que posee un usuario
const PersonSchema = new Schema ({

});

// Esquema para usuario
const UserSchema = new Schema ({
  name: {
    type: String,
    required: [true, 'nombre de usuario es requerido'],
    index: {
      unique: true
    }
  },
  password: {
    type: String,
    required: [true, 'password es requerido']
  },
  tenant: {
    type: Schema.Types.ObjectId,
    ref: 'tenant'
});

// Middlewares para UserSchema --------------------------------------------------------------
// antes de guardar el password hay que encriptarlo
UserSchema.pre('save', {
  var user = this;
  // only hash the password if it has been modified (or is new)
  if(!user.isModified('password')) return next();

  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if(err) return next(err);

    // override the cleartext password with the hashed one
    user.password = hash;
    next();
  });
});

// para acceder al password encriptado
UserSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
}

const User = mongoose.model('user', UserSchema);
module.exports = User;
