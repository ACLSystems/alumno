const Discussion 		= require('../src/discussions'							);
const Notification 	= require('../src/notifications'						);
const Follow 				= require('../src/follow'										);
const Group 				= require('../src/groups'										);
const Err 					= require('../controllers/err500_controller');
const mailjet 			= require('../shared/mailjet'								);
const TA 						= require('time-ago'												);
const StatusCodes 	= require('http-status-codes'								);

/**
	* CONFIG
	*/
/** @const {number} - plantilla para notificar al usuario */
// const templateID 		= parseInt(process.env.MJ_TEMPLATE_NOTUSER);

module.exports = {
	async create(req,res) {
		const key_user 	= res.locals.user;
		const discussion = new Discussion(req.body);
		discussion.org = key_user.org;
		discussion.orgUnit = key_user.orgUnit;
		discussion.user = key_user._id;
		if(discussion.block === ''){
			delete discussion.block;
		}
		await discussion.save().catch((err) => {
			Err.sendError(res,err,'discussion_controller','create -- Creating comment -- User: ' + key_user.name + ' text: ' + discussion.text);
			return;
		});
		// Aquí insertamos la parte de notificaciones
		// Para anuncios
		if(discussion.pubtype === 'announcement') {
			if(!discussion.sourceType) {
				discussion.sourceType = 'user';
			}
			if(!discussion.sourceRole) {
				discussion.sourceRole = 'instructor';
			}
			if(!discussion.message) {
				discussion.message = 'El instructor ha hecho un nuevo anuncio';
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
				type: discussion.sourceType,
				sourceRole: discussion.sourceRole,
				message		: discussion.message,
				objects		: [{
					item: discussion._id,
					kind: 'discussions'
				}]
			});
			message.save()
				.catch((err) => {
					Err.sendError(res,err,'discussion_controller','create -- Creating notification for announcement' + key_user.name + ' text: ' + discussion.text);
					return;
				});
		} else if(discussion.pubtype === 'discussion' || discussion.pubtype === 'question') {
			if(discussion.group) {
				const group = await Group.findById(discussion.group)
					.select('type instructor course')
					.populate('instructor', 'person preferences')
					.catch((err) => {
						Err.sendError(res,err,'discussion_controller','create -- Finding group ' + key_user.name + ' group: ' + discussion.group);
						return;
					});
				if(group && group.instructor) {
					if(group.type === 'tutor') {
						if(group.instructor._id + '' !== key_user._id + ''){
							message = new Notification({});
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
							await message.save().catch((err) => {
								Err.sendError(res,err,'discussion_controller','create -- sending notification for discussion ' + key_user.name);
								return;
							});
							if(group.instructor && (!group.instructor.preferences  || !group.instructor.preferences.alwaysSendEmail) || group.instructor.preferences.alwaysSendEmail) {
								let subject = 'Tienes una notificación';
								mailjet.sendGenericMail(group.instructor.person.email,group.instructor.person.name,subject,message.message,group.orgUnit);
							}
						}
					}
				}
			}
		} else {
			const follows = await Follow.find({$or: [{'object.item': discussion.root},{'object.item': discussion.comment},{'object.item': discussion.replyto}],'who.item': key_user._id})
				.populate('who.item')
				.catch((err) => {
					Err.sendError(res,err,'discussion_controller','create -- Searching follow for discussion ' + key_user.name + ' text: ' + discussion.text);
				});
			for(let f of follows) {
				var send_email = true;
				if(f.who.item.preferences && f.who.item.preferences.alwaysSendEmail === false) { send_email = false; }
				message = new Notification({});
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
				await message.save().catch((err) => {
					Err.sendError(res,err,'discussion_controller','create -- sending notification for discussion ' + key_user.name + ' text: ' + discussion.text);
					return;
				});
				if(send_email) {
					let subject = 'Tienes una notificación';
					await mailjet.sendGenericMail(f.who.item.person.email,f.who.item.person.name,subject,'Están hablando de una pregunta o tema que estás siguiendo',discussion.orgUnit);
				}
			}
		}
		// Hasta acá es la parte de notificaciones
		res.status(StatusCodes.OK).json({
			'message'	: 'Register created'
		});

	}, // crear comentario

	get(req,res) {
		const key_user 	= res.locals.user;
		// console.log(req.query.query);
		const query			= JSON.parse(req.query.query);
		if(!query.course || query.course === '' || query.course === 'undefined') {
			delete query.course;
		}
		if(!query.group || query.group === '' || query.group === 'undefined') {
			delete query.group;
		}
		if(!query.pubType || query.pubType === '' || query.pubType === 'undefined') {
			delete query.pubType;
		}
		if(!query.type || query.type === '' || query.type === 'undefined') {
			delete query.type;
		}
		//console.log(query);
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
					var discs_send = [];
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
