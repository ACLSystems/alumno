const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SessionUnitSchema = new Schema ({
  user: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean
  }
});

const SessionSchema = new Schema ({
  session: [{SessionUnitSchema}]
});

const Sessions = mongoose.model('sessions', SessionSchema);
module.exports = SessionSchema;
