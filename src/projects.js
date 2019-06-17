const mongoose			= require('mongoose');
const Schema 				= mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const ProjectSchema = new Schema({
	name: {
		type: String
	},
	org: {
		type: Schema.Types.ObjectId,
		ref: 'orgs'
	},
	orgUnit: {
		type: Schema.Types.ObjectId,
		ref: 'orgUnits'
	},
	owner: {
		type: Schema.Types.ObjectId,
		ref: 'users'
	}
});

ProjectSchema.index({'name'	: 1});

const Project = mongoose.model('projects', ProjectSchema);
module.exports = Project;
