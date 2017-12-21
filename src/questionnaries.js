// Esquema para modelar cuestionarios
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permission');
const Schema = mongoose.Schema;

const questionSchema = new Schema ({
  text: {
    type: String,
    required: true
  }
  type: {
    type: String,
    enum: ['Open', 'Option'],
    required: true
  }
  option: [String],
  answer: [String],
  isVisible: Boolean,
  author: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  own: OwnerSchema,
  mod: [ModSchema],
  perm: PermissionsSchema
});

const questionnarieSchema = new Schema ({
  type: {
    type: String,
    enum: ['Eval','Poll']
  },
  questions: [{questionSchema}],
  version: String,
  keywords: [String],
  isVisible: Boolean,
  author: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  own: OwnerSchema,
  mod: [ModSchema],
  perm: PermissionsSchema
});

const Questionnaries = mongoose.model('questionnaries', questionnarieSchema);
module.exports = Questionnaries;
