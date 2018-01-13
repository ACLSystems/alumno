// Esquema para control de la aplicacion
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ControlSchema = new Schema({
  version: {
      type: String
  },
  schemas: [String]
});

const Control = mongoose.model('control', ControlSchema, 'control');
module.exports = Control;
