const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ModSchema = new Schema ({
  by: {
    type: String,
    required: true
  },
  when: {
    type: Date,
    required: true,
    default: Date.now
  }
});

module.exports = ModSchema;
