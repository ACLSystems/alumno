const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const FileSchema = new Schema ({
	name: {
		type: String,
		required: true
	},
	mimetype: {
		type: String,
		required: true
	},
	filename: {
		type: String,
		required: true
	},
	path: {
		type: String,
		required: true
	},
	size: {
		type: Number,
		required: true,
		default: 0
	}
});

FileSchema.index( { name: 1 } );

const File = mongoose.model('files', FileSchema);
module.exports = File;
