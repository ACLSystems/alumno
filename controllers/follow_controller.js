const Follow 		= require('../src/follow');
const Err 			= require('../controllers/err500_controller');
var ObjectId 	= require('mongoose').Types.ObjectId;

module.exports = {
	create(req,res) {
		const key_user 	= res.locals.user;
		var object 			= req.body.object;
		var objectType	= req.body.objectType;
		var followObj 	= new Follow({
			who: {
				kind: 'users',
				item: key_user._id
			},
			object:{
				kind: objectType,
				item: object
			}
		});
		followObj.save()
			.then(() => {
				res.status(200).json({
					'status': 200,
					'message': 'Follow saved'
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'follow_controller','create -- saving follow --');
			});
	}, // create

	myFollows(req,res) {
		const key_user 	= res.locals.user;
		Follow.find({'who.item': key_user._id})
			.populate([
				{ path:'object.item' }
			])
			.then((myFws) => {
				if(myFws.length > 0) {
					var follows = [];
					myFws.forEach(function(follow) {
						var f = { _id: follow._id};
						if(follow.object && follow.object.kind === 'discussions') {
							f.object 			= follow.object;
						}
						follows.push(f);
					});
					res.status(200).json({
						'status': 200,
						'message': follows.length + ' follows found for user -' + key_user.name + '-',
						'follows': follows
					});
				} else {
					res.status(200).json({
						'status': 404,
						'message': 'No follows found for user -' + key_user.name + '-'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'follow_controller','myFollows -- searching follows --');
			});
	}, // myFollows

	delete(req,res) {
		const key_user 	= res.locals.user;
		if(!ObjectId.isValid(req.body.followid)) {
			res.status(200).json({
				'status': 200,
				'message': 'followid -' + req.body.followid + '- is not a valid ID'
			});
			return;
		}
		Follow.findById(req.body.followid)
			.then((follow) => {
				if(follow) {
					if(follow.who.item + '' === key_user._id + '') {
						Follow.findByIdAndRemove(follow)
							.then((follow) => {
								res.status(200).json({
									'status': 200,
									'message': 'Document ' + follow._id + ' successfully deleted'
								});
							})
							.catch((err) => {
								Err.sendError(res,err,'follow_controller','myFollows -- deleting follow by id --');
							});
					} else {
						res.status(200).json({
							'status': 401,
							'message': 'You do not have permissions to delete this document'
						});
					}
				} else {
					res.status(200).json({
						'status': 404,
						'message': 'Follow id not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'follow_controller','myFollows -- searching follow --');
			});
	} // delete

};
