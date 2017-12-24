// Esquema para modelar Tareas
const mongoose = require('mongoose');
const ModSchema = require('./modified');
const PermissionsSchema = require('./permissions');
const OwnerSchema = require('./owner');
const Schema = mongoose.Schema;

const TasksSchema = new Schema ({
  title: {
    type: String
    required: true
  },
  description: {
    type: String
  },
  content: {
    type: String
  },
  files: {
    type: String
  },
  status: {
    type: String,
    enum: ['Draft','Published'],
    default: 'Draft'
  },
  version: {
    type: Number
    min: [1, 'La version de la tarea no puede ser menor a 1']
  },
  keywords: {
    type: [String]
  },
  isVisible: {
    type: Boolean
    default: true
  },
  own: {OwnerSchema},
  mod: [{ModSchema}],
  perm: {PermissionsSchema}
});

const Task = mongoose.model('tasks', TasksSchema);
module.exports = Task;
