const mongoose = require('mongoose');
//const TasksSchema = require('./tasks');
const Schema = mongoose.Schema;

const WtaskSchema = new Schema ({
	t: {
		type: Schema.Types.ObjectId,
		ref: 'tasks'
	},
	w: {
		type: Number,
		min: [0,'Minimum value is 0'],
		max: [100,'Maximum value is 100']
	}
});

module.exports = WtaskSchema;
