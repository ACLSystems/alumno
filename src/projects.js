const mongoose	= require('mongoose');

const Schema 		= mongoose.Schema;
const ObjectId 	= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const ProjectSchema = new Schema({
	name: {
		type: String
	},
	org: {
		type: ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: ObjectId,
		ref: 'orgUnits'
	},
	owner: {
		type: ObjectId,
		ref: 'users'
	}
});

ProjectSchema.index({'name'	: 1});

const Project = mongoose.model('projects', ProjectSchema);
module.exports = Project;
