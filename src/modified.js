const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var date = new Date();

const ModSchema = new Schema ({
  by: {
    type: String,
    required: true,
    default: 'anon'
  },
  when: {
    type: Date,
    required: true,
    default: date
  }
});

module.exports = ModSchema;
