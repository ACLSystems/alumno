// Esquema para modelar grupos
const mongoose = require('mongoose');
const BlocksSchema = require('./blocks');
const CoursesSchema = require('./courses');
const OrgsSchema = require('./orgs');
const OrgUnitsSchema = require('./orgUnits');
const Schema = mongoose.Schema;

const ResultsSchema = new Schema ({
  section: {
    type: Number,
    required: true
  },
  block: {
    type: Number,
    required: true
  },
  obtained: {
    type: Number,
    min: [0,'Grade cannot be less than 0'],
    max: [100, 'Grade cannot be greater than 100']
  }
});

module.exports = ResultsSchema;

const GradesSchema = new Schema ({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'users'
  },
  results: [{ResultsSchema}]
});

module.exports = GradesSchema;

const DatesSchema = new Schema {
  section: {
    type: Number,
    required: true
  },
  block: {
    type: Number,
    required: true
  },
  beginDate: {
    type: Date
  },
  endDate: {
    type: Date
  }
}

module.exports = DatesSchema;

const GroupsSchema = new Schema ({
  code: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'courses'
  },
  instructor: {
    type: Schema.Types.ObjectId,
    ref: 'users'
  },
  students: [{
    type: Schema.Types.ObjectId,
    ref: 'users'
  }],
  beginDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  dates: [{DatesSchema}],
  org: {
    type: Schema.Types.ObjectId,
    ref: 'orgs'
  }
  orgUnit: {
    type: Schema.Types.ObjectId,
    ref: 'orgUnits'
  }
});

const Groups = mongoose.model('groups', GroupsSchema);
module.exports = Groups;
