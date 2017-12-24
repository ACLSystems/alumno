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
    min: [0,'El valor mínimo es 0'],
    max: [100,'El valor máximo es 100']
  }
});

module.exports = WquestSchema;
