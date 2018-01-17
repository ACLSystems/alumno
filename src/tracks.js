// Esquema para modelar Tracks
const mongoose = require('mongoose');
//const CoursesSchema = require('./courses');
//const BlocksSchema = require('./blocks');
//const GroupsSchema = require('./groups');
const Schema = mongoose.Schema;

const TracksSchema = new Schema ({
	user: {
		type: String,
		required: true
	},
	blockCompleted:[{
		type: Schema.Types.ObjectId,
		ref: 'blocks'
	}],
	course: {
		type: Schema.Types.ObjectId,
		ref: 'courses'
	},
	group: {
		type: Schema.Types.ObjectId,
		ref: ''
	}
});

const Tracks = mongoose.model('tracks', TracksSchema);
module.exports = Tracks;
