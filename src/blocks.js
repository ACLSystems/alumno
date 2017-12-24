// Esquema para modelar bloques
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permissions');
const WtaskSchema = require('./wtasks');
const WquestSchema = require('./wquestionnaries');
const Schema = mongoose.Schema;

const BlocksSchema = new Schema ({
  code: {
    type: String,
    required: true
  },
  type: {
    type: String
    enum: ['text','textVideo','video','task','questionnarie']
  }
  title: {
    type: String,
    required: true
  },
  section: {
    type: String
  },
  number: {
    type: Number
  },
  order: {
    type: Number
  },
  content: {
    type: String
  },
  media: {
    type: String
  },
  rules: {
    type: String
  },
  questionnaries: [{WquestSchema}],
  tasks: [{WtaskSchema}],
  status: {
    type: String,
    enum: ['Draft','Published'],
    default: 'Draft'
  },
  version: {
    type: Number,
    min: [1, 'La version del bloque no puede ser menor a 1']
  }
  isVisible: {
    type: Boolean,
    default: false
  },
  keywords: [String],
  own: {OwnerSchema},
  mod: [{ModSchema}],
  perm: {PermissionsSchema}
});

const Blocks = mongoose.model('blocks', BlocksSchema);
module.exports = Blocks;
