// Esquema para modelar bloques
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blockSchema = new Schema ({
  title: {
    type: String,
    required: true
  },
  section: [String],
  number: Number,
  order: Number,
  content: String,
  // media:
  // rules:
  questionaries: {
    type: Schema.Types.ObjectId,
    ref: 'questionaries'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isVisible: {
    type: Boolean,
    default: false
  },
  keywords: [String],
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
  },
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

const Blocks = mongoose.model('blocks', blockSchema);
module.exports = Blocks;
