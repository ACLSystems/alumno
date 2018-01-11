const mongoose = require('mongoose');
const QuestionnarieSchema = require('./questionnaries');
const Schema = mongoose.Schema;

const WquestSchema = new Schema ({
  q: {
    type: Schema.Types.ObjectId
    ref: 'questionnaries'
  },
  w: {
    type: Number,
    min: [0,'Minimum value is 0'],
    max: [100,'Maximum value is 100']
  }
});

module.exports = WquestSchema;
