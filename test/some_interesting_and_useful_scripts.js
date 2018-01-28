var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
	name: String
});

module.exports = mongoose.model('User', UserSchema);

var PostSchema = new mongoose.Schema({
	title: String,
	postedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	comments: [{
		text: String,
		postedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	}]
});

module.exports = mongoose.model('Post', PostSchema);

const Post = new PostSchema;
const User = new UserSchema;
var alex = new Post;

//Now lets save the Post and after it got created, query for all existing Posts.

Post.save(function(error) {
	if (!error) {
		Post.find({})
			.populate('postedBy')
			.populate('comments.postedBy')
			.exec(function(error, posts) {
				console.log(JSON.stringify(posts, null, "\t")); // eslint-disable-line
			});
	}
});

// With this same schema, how to query all posts grouped by User?
//This should point you the direction:

User.find({}).exec(function (err, users) {
	users.forEach(function (u) {
		Post.find({postedBy: u._id})
			.populate('postedBy')
			.exec(function (err, posts) {
				console.log(posts); // eslint-disable-line
			});
	});
});

//To remove posts of user "Alex" you can run this:

Post.find({ postedBy : alex._id }).remove().exec();

//To find the Posts with comments from "Alex" you can run this:

Post.find({ 'comments.postedBy' : alex._id }).exec();
