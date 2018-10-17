const Discussion 		= require('../src/discussions'							);
const Notification 	= require('../src/notifications'						);
const Follow 				= require('../src/follow'										);
const Group 				= require('../src/groups'										);
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
							kind: 'users',
							role: 'instructor'
						},
						destination: {
							item: discussion.group,
							kind: 'groups',
							role: 'user'
						},
						type: commentObj.sourceType,
						sourceRole: commentObj.sourceRole,
						message		: commentObj.message,
						objects		: [{
							item: discussion._id,
							kind: 'discussion'
						}]
					});
					message.save()
						.catch((err) => {
							Err.sendError(res,err,'discussion_controller','create -- Creating notification for announcement' + key_user.name + ' text: ' + commentObj.text);
						});
				} else if(discussion.pubtype === 'discussion' || discussion.pubtype === 'question') {
					if(commentObj.group) {
						Group.findById(commentObj.group)
							.select('type instructor course')
							.populate('instructor', 'person preferences')
							.then((group) => {
								if(group && group.instructor) {
									if(group.type === 'tutor') {
										if(group.instructor._id + '' !== key_user._id + ''){
											var message = {};
											message.destination = {
												kind: 'users',
												item: group.instructor._id,
												role: 'instructor'
											};
											message.source = {
												kind: 'users',
												item: key_user._id,
												role: 'user'
											};
											message.type = 'user';
											message.objects = [{
												item: discussion._id,
												kind: 'discussions'
											},{
												item: group._id,
												kind: 'groups'
											},{
												item: group.course,
												kind: 'courses'
											}];
											message.message = 'Ha creado una discusión/pregunta en el foro';
											Notification.create(message)
												.then(() => {
													if(group.instructor && (!group.instructor.hasOwnProperty('preferences')  || !group.instructor.preferences.hasOwnProperty('alwaysSendEmail') || group.instructor.preferences.alwaysSendEmail)) {
														mailjet.sendMail(group.instructor.person.email, group.instructor.person.name, 'Tienes una notificación',493237,'curso',message.message);
													}
												})
												.catch((err) => {
													Err.sendError(res,err,'discussion_controller','create -- sending notification for discussion ' + key_user.name);
												});
										}
									}
								}
							})
							.catch((err) => {
								Err.sendError(res,err,'discussion_controller','create -- Finding group ' + key_user.name + ' group: ' + commentObj.group);
							});
					}
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
									item: f.who.item._id,
									role: 'user'
								};
								message.source = {
									kind: 'users',
									item: key_user._id,
									role: 'user'
								};
								message.type = 'system';
								message.objects = [{
									item: discussion._id,
									kind: 'discussions'
								}];
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
		const key_user 	= res.locals.user;
		const query			= JSON.parse(req.query.query);
		var select 			= (req.query.select	) ? req.query.select 					: ''	;
		var order 			= (req.query.order	)	? parseInt(req.query.order) : -1	;
		var skip 				= (req.query.skip		) ? parseInt(req.query.skip) 	: 0		;
		var limit 			= (req.query.limit	) ? parseInt(req.query.limit) : 15	;
		var qOrder 			= {date: order};
		Promise.all([
			Discussion.find(query).select(select).populate('user').sort(qOrder).skip(skip).limit(limit).lean(),
			Follow.find({'who.item': key_user._id}).lean()
		])
			.then((results) => {
				const [discussions,follows] = results;
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
						if(disc.user && disc.user.person){
							if(disc.user.person.alias) {
								disc_send.user 	= disc.user.person.alias;
							} else if (disc.user.person.fullName ){
								disc_send.user 	= disc.user.person.fullName;
							} else {
								disc_send.user 	= `${disc.user.person.name} ${disc.user.person.fatherName} ${disc.user.person.motherName}`;
							}
						} else {
							res.status(200).json({
								'status': 400,
								'message': 'User document is incomplete. Please contact Administrator or Service Desk'
							});
						}
						follows.forEach(function(f) {
							if(f.object.item + '' === disc._id + '') {
								disc_send.followid 	= f._id;
							}
						});
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
