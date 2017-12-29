// Esquema para modelar cursos
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const OwnerSchema = require('./owner');
const PermissionsSchema = require('./permissions');
const BlocksSchema = require('./blocks');
const Schema = mongoose.Schema;

const CoursesSchema = new Schema ({
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
    enum: ['Basic','Intermediate','Advanced','Expert'],
    default: 'Basic'
  },
  categories: {
    type: [String]
    required: true
  },
  isVisible: {
    type: Boolean,
    default: true
  }
  keywords: {
    type: [String]
  },
  description: {
    type: String
  },
  image: {
    type: String
  },
  details: {
    type: String
  },
  syllabus: {
    type: String
  },
  price: {
    type: Number,
    default: 0,
    min: [0,'El precio del curso no puede ser menor a 0']
  },
  cost: {
    type: Number,
    default: 0
    min: [0,'El costo del curso no puede ser menor a 0']
  },
  own: {OwnerSchema},
  mod: [{ModSchema}],
  perm: {PermissionsSchema},
  blocks: [{BlocksSchema}],
  status: {
    type: String
    enum: ['Draft','Published'],
    default: 'Draft'
  }
});

const Courses = mongoose.model('courses', CoursesSchema);
module.exports = Courses;