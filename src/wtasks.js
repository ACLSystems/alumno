const mongoose = require('mongoose');
const TasksSchema = require('./tasks');
const Schema = mongoose.Schema;

const WtaskSchema = new Schema ({
  t: {
    type: Schema.Types.ObjectId
    ref: 'tasks'
  },
  w: {
    type: Number,
    min: [0,'El valor mínimo es 0'],
    max: [100,'El valor máximo es 100']
  }
});

module.exports = WtaskSchema;
