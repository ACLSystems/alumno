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
  own: OwnerSchema,
  mod: [ModSchema],
  perm: PermissionsSchema
});
