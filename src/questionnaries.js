// Esquema para modelar cuestionarios
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permission');
const Schema = mongoose.Schema;

const QuestionSchema = new Schema ({
  text: {
    type: String,
    required: true
  }
  type: {
    type: String,
    enum: ['Open', 'Option'],
    required: true
  }
  options: [String],
  answers: [String],
  isVisible: Boolean,
  author: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  own: {OwnerSchema},
  mod: [{ModSchema}],
  perm: {PermissionsSchema}
});

module.exports = QuestionSchema;

const QuestionnarieSchema = new Schema ({
  type: {
    type: String,
    enum: ['Quiz','Poll'],
    default: 'Quiz'
  },
  questions: [{questionSchema}],
  version: {
    type: String,
    min: [1, 'Questionnarie version cannot be less than 1']
  },
  keywords: [String],
  isVisible: Boolean,
  own: {OwnerSchema},
  mod: [{ModSchema}],
  perm: {PermissionsSchema}
});

const Questionnaries = mongoose.model('questionnaries', QuestionnarieSchema);
module.exports = Questionnaries;
