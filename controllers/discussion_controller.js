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
			commentObj.type			= 'root';
			commentObj.title		= req.body.title;
			commentObj.pubtype	= req.body.pubtype;
		}
		if(!req.body.title && req.body.root) {
			commentObj.type 		= 'comment';
			commentObj.root			= req.body.root;
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
			Discussion.findOne({type: 'root', title: commentObj.title, org: key_user.org._id})
				.then((old_disc) => {
					if(old_disc) {
						commentObj.root 			= old_disc._id;
						commentObj.type 			= 'comment';
						delete commentObj.title;
					}
					Discussion.create(commentObj)
						.then((d) => {
							if(d.type === 'root') {
								status.type				= d.type;
								status.message 		= 'Root created';
								status.root 			= d._id;
							}
							if(d.type === 'comment') {
								status.type				= d.type;
								status.message 		= 'Comment created';
								status.root 			= d.root;
								status.comment		= d._id;
							}
							res.status(200).json(status);
						})
						.catch((err) => {
							Err.sendError(res,err,'discussion_controller','create -- Creating comment --');
						});
				})
				.catch((err) => {
					Err.sendError(res,err,'discussion_controller','create -- Finding Root --');
				});
		} else {
			Discussion.findOne({_id: commentObj.replyto})
				.then((c) => {
					if(c) {
						if(c.type === 'comment' || c.type === 'reply') {
							commentObj.type 			= 'reply';
							commentObj.comment 		= c._id;
							commentObj.root 			= c.root;
						} else if(c.type === 'root') {
							commentObj.root 			= c._id;
							commentObj.type 			= 'comment';
						}
						Discussion.create(commentObj)
							.then((d) => {
								status.type					= d.type;
								status.root 				= d.root;
								status.id						= d._id;
								if(d.type === 'comment') {
									status.message 		= 'Comment created';

								} else {
									status.message 		= 'Reply created';
									status.comment		= d.comment;
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
			select = req.query.select;
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
