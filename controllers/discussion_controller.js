const Discussion 		= require('../src/discussions'							);
const Notification 	= require('../src/notifications'						);
const Follow 				= require('../src/follow'										);
const Err 					= require('../controllers/err500_controller');
const mailjet 			= require('../shared/mailjet'								);
const TA 						= require('time-ago'												);

module.exports = {
	create(req,res) {
		const key_user 	= res.locals.user;
		var commentObj	= req.body;
		commentObj.org 			= key_user.org;
		commentObj.orgUnit 	= key_user.orgUnit;
		commentObj.user 		=	key_user._id;
		if(commentObj.block === ''){
			delete commentObj.block;
		}
		Discussion.create(commentObj)
			.then((discussion) => {
				// Aquí insertamos la parte de notificaciones
				// Para anuncios
				if(discussion.pubtype === 'announcement') {
					if(!commentObj.sourceType) {
						commentObj.sourceType = 'user';
					}
					if(!commentObj.sourceRole) {
						commentObj.sourceRole = 'instructor';
					}
					if(!commentObj.message) {
						commentObj.message = 'El instructor ha hecho un nuevo anuncio';
					}
					var message = new Notification({
						source: {
							item: key_user._id,
							kind: 'users'
						},
						destination: {
							item: discussion.group,
							kind: 'groups'
						},
						sourceType: commentObj.sourceType,
						sourceRole: commentObj.sourceRole,
						message		: commentObj.message,
						object		: discussion._id
					});
					message.save()
						.catch((err) => {
							Err.sendError(res,err,'discussion_controller','create -- Creating notification for announcement' + key_user.name + ' text: ' + commentObj.text);
						});
				} else {
					Follow.find({$or: [{'object.item': discussion.root},{'object.item': discussion.comment},{'object.item': discussion.replyto}],'who.item': key_user._id})
						.populate('who.item')
						.then((follows) => {
							follows.forEach(function(f) {
								var send_email = true;
								if(f.who.item.preferences && f.who.item.preferences.alwaysSendEmail === false) { send_email = false; }
								var message = {};
								message.destination = {
									kind: 'users',
									item: f.who.item._id
								};
								message.source = {
									kind: 'users',
									item: key_user._id
								};
								message.sourceRole = 'user';
								message.destinationRole = 'user';
								message.sourceType = 'system';
								message.object = {
									item: discussion._id,
									kind: 'discussions'
								};
								message.message = 'Han respondido a una discusión/pregunta que tú estás siguiendo';
								Notification.create(message)
									.then(() => {
										if(send_email) {
											mailjet.sendMail(f.who.item.person.email, f.who.item.person.name, 'Tienes una notificación',493237,'curso',message.message);
										}
									})
									.catch((err) => {
										Err.sendError(res,err,'discussion_controller','create -- sending notification for discussion ' + key_user.name + ' text: ' + commentObj.text);
									});
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'discussion_controller','create -- Searching follow for discussion ' + key_user.name + ' text: ' + commentObj.text);
						});
				}
				// Hasta acá es la parte de notificaciones
				res.status(200).json({
					'status'	: 200,
					'message'	: 'Register created'
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'discussion_controller','create -- Creating comment -- User: ' + key_user.name + ' text: ' + commentObj.text);
			});
	}, // crear comentario

	get(req,res) {
		const query			= JSON.parse(req.query.query);
		var order 			= -1;
		var skip 				= 0;
		var limit 			= 15;
		var select 			= '';
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
						var disc_send = {};
						const vars = ['title','text','type','pubtype','root','comment','replyto','block','group','course'];
						vars.forEach(function(evar) {
							if(disc[evar]){
								disc_send[evar] = disc[evar];
							}
						});
						disc_send.discussionId 	= disc._id;
						disc_send.when 					= TA.ago(disc.date);
						disc_send.date 					= disc.date;
						disc_send.userId 				= disc.user._id;
						if(disc.user.person.alias) {
							disc_send.user 	= disc.user.person.alias;
						} else {
							disc_send.user 	= disc.user.person.fullName;
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
				Err.sendError(res,err,'discussion_controller','get -- Getting comment --');
			});
	}
};
