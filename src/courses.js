// Esquema para modelar cursos
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const courseSchema = new Schema ({
  code: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Self-paced','Tutor']
  },
  level: {
    type: String,
    enum: ['Basic','Intermediate','Advanced','Expert']
    default: 'Basic'
  },
  categories: {
    type: [String]
    required: true
  },
  isVisible: Boolean,
  keywords: {
    type: [String]
  },
  description: String,
  image: String,
  details: String,
  syllabus: String,
  price: {
    type: Number,
    default: 0
  },
  cost: {
    type: Number,
    default: 0
  },
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
