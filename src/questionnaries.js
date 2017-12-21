// Esquema para modelar cuestionarios
const mongoose = require('mongoose');
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
  answer: String,
  isVisible: Boolean,
  author: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  authorOrg: {
    type: Schema.Types.ObjectId,
    ref: 'org'
  },
  authorOrgUnit: {
    type: Schema.Types.ObjectId,
    ref: 'orgUnit'
  },
  createDate: {
    type: Date,
    default: Date.now
  }
  modifiedDate: {
    type: Date,
    default: Date.now
  },
  modifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  perm: {
    type: Schema.Types.ObjectId,
    ref: 'permissions'
  }
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
  authorOrg: {
    type: Schema.Types.ObjectId,
    ref: 'org'
  },
  authorOrgUnit: {
    type: Schema.Types.ObjectId,
    ref: 'orgUnit'
  },
  createDate: Date,
  modifiedDate: Date,
  modifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  perm: {
    type: Schema.Types.ObjectId,
    ref: 'permissions'
  }
});

const Questionnaries = mongoose.model('questionnaries', questionnarieSchema);
module.exports = Questionnaries;
