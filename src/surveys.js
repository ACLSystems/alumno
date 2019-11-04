const mongoose 					= require('mongoose');
const ModSchema 				= require('./modified');

const Schema 						= mongoose.Schema;
const ObjectId 					= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true; });

const SurveySchema = new Schema ({
	user: {
		type: ObjectId,
		ref: 'users'
	},
	responses: [],
	mod: [ModSchema]
});

const Surveys = mongoose.model('surveys', SurveySchema);
module.export = Surveys;
