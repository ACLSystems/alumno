const Discussion = require('../src/discussions');
const Err = require('../controllers/err500_controller');
const TA = require('time-ago');

module.exports = {
	create(req,res) {
		const key_user 	= res.locals.user;
		const text 			= req.body.text;
		var commentObj = {
			text		: text,
			org 		: key_user.org,
			orgUnit : key_user.orgUnit,
			user		: key_user._id
		};
		if(req.body.title){
			commentObj.type					= 'discussion';
			commentObj.title				= req.body.title;
			commentObj.title				= req.body.pubtype;
		}
		if(!req.body.title && req.body.discussion) {
			commentObj.type 				= 'comment';
			commentObj.discussion		= req.body.discussion;
		}
		if(req.body.replyto) {
			commentObj.type					= 'reply';
		}
		const vars = ['comment','replyto','block','group','course'];
		vars.forEach(function(evar) {
			if(req.body[evar]){
				commentObj[evar] = req.body[evar];
			}
		});
		var status = {
			'status': 200
		};
		if(commentObj.title) {
			Discussion.findOne({type: 'discussion', title: commentObj.title, org: key_user.org._id})
				.then((old_disc) => {
					if(old_disc) {
						commentObj.discussion = old_disc._id;
						commentObj.type 			= 'comment';
						status.message 				= 'Comment created';
						status.discussion 		= old_disc._id;
						delete commentObj.title;
					}
					Discussion.create(commentObj)
						.then((d) => {
							if(d.type === 'discussion') {
								status.type				= d.type;
								status.message 		= 'Discussion created';
								status.discussion = d._id;
							}
							if(d.type === 'comment') {
								status.type				= d.type;
								status.message 		= 'Comment created';
								status.discussion = d.discussion;
								status.comment		= d._id;
							}
							res.status(200).json(status);
						})
						.catch((err) => {
							Err.sendError(res,err,'discussion_controller','create -- Creating comment --');
						});
				})
				.catch((err) => {
					Err.sendError(res,err,'discussion_controller','create -- Finding Discussion --');
				});
		} else {
			Discussion.findOne({_id: commentObj.replyto})
				.then((c) => {
					if(c) {
						if(c.type === 'comment') {
							commentObj.comment = c._id;
							commentObj.discussion = c.discussion;
						} else if(c.type === 'discussion') {
							commentObj.discussion = c._id;
						} else {
							commentObj.comment = c.comment;
							commentObj.discussion = c.discussion;
						}
						Discussion.create(commentObj)
							.then((d) => {
								status.type				= d.type;
								status.discussion = d.discussion;
								if(d.type === 'comment') {
									status.message 		= 'Comment created';
									status.comment		= d._id;
								} else {
									status.message 		= 'Reply created';
									status.comment		= d.comment;
									status.id					= d._id;
								}
								res.status(200).json(status);
							})
							.catch((err) => {
								Err.sendError(res,err,'discussion_controller','create -- Creating comment --');
							});
					} else {
						res.status(404).json({
							'status': 404,
							'message': 'Entry replyto not found'
						});
					}
				})
				.catch((err) => {
					Err.sendError(res,err,'discussion_controller','create -- Finding comment --');
				});
		}

	}, // crear comentario

	get(req,res) {
		//const key_user 	= res.locals.user;
		const query	= JSON.parse(req.query.query);
		var order 	= -1;
		var skip 		= 0;
		var limit 	= 15;
		//var get 		= {title: 1};
		var select 		= '';
		if(req.query.select) {
			select = req.query.get;
		}
		if(req.query.order) {
			order = parseInt(req.query.order);
		}
		if(req.query.skip) {
			skip = parseInt(req.query.skip);
		}
		if(req.query.limit) {
			limit = parseInt(req.query.limit);
		}
		var qOrder 	= {date: order};
		Discussion.find(query)
			.select(select)
			.populate('user', 'person')
			.sort(qOrder)
			.skip(skip)
			.limit(limit)
			.then((discussions) => {
				if(discussions || discussions.length > 0) {
					var discs_send = new Array();
					discussions.forEach(function(disc) {
						var disc_send = {
							id: disc._id
						};
						const vars = ['text','type','title','discussion','comment','replyto','block','group','course'];
						vars.forEach(function(evar) {
							if(disc[evar]){
								disc_send[evar] = disc[evar];
							}
						});
						disc_send.date = TA.ago(disc.date);
						if(disc.user.person.alias) {
							disc_send.user = disc.user.person.alias;
						} else {
							disc_send.user = disc.user.person.fullName;
						}
						discs_send.push(disc_send);
					});
					res.status(200).json({
						'status': 200,
						'message': discs_send
					});
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'No discussions, comments or replys found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'discussion_controller','create -- Creating comment --');
			});
	}
};
