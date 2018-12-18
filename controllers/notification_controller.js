//const mongoose 			= require('mongoose'												);
const Notification 	= require('../src/notifications'						);
const User 					= require('../src/users'										);
const Err 					= require('../controllers/err500_controller');
const mailjet 			= require('../shared/mailjet'								);
const TA 						= require('time-ago'												);

module.exports = {

	create(req,res) {
		const key_user 	= res.locals.user;
		var query 		= req.body;
		if(query.objects && query.objects.length > 0) {
			var errorInObjects = false;
			query.objects.forEach(function(object) {
				if(!object.hasOwnProperty('item')) {
					errorInObjects = true;
				}
			});
			if(errorInObjects) {
				res.status(200).json({
					'status': '400',
					'message': 'Bad Objects array. Missing "item" in one object in the array'
				});
				return;
			}
		}
		Promise.all([
			// buscar el usuario que quiere mandar el mensaje (source)
			User.findById(key_user._id),
			// buscar el usuario que recibirá el mensaje (destination)
			User.findById(query.destination)
		])
			.then((results) => {
				const [source,destination] = results;
				if(source) {
					var message = new Notification({ message: query.message });
					message.source = { item : source._id };
					message.source.role = query.sourceRole ? query.sourceRole : 'user';
					message.source.kind = query.sourceKind ? query.sourceKind : 'users';
					if(destination) {
						var send_email = true;
						if(destination.preferences && destination.preferences.alwaysSendEmail === false) {
							send_email = false;
						}
						message.destination = { item : destination._id };
						message.destination.role = query.destinationRole ? query.destinationRole : 'user';
						message.destination.kind = query.destinationKind ? query.destinationKind : 'users';
						if(query.objects && query.objects.length > 0 ) { message.objects = query.objects; }
						message.save()
							.then(() => {
								res.status(200).json({
									'status': '200',
									'notificationid': message._id,
									'message': `Notification for: ${destination.name} created successfully`
								});
								if(send_email) {
									mailjet.sendMail(destination.person.email, destination.person.name, 'Tienes una notificación',493237,message.message);
								}
							})
							.catch((err) => {
								Err.sendError(res,err,'notification_controller','create -- Creating Notification --',false,false,`Destination: ${destination.name} Source: ${source.name}`);
							});
					} else {
						res.status(200).json({
							'status': '404',
							'message': 'Destination not found'
						});
					}
				} else {
					res.status(200).json({
						'status': '404',
						'message': 'Source not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'notification_controller','create -- Finding users --');
			});
	}, //create

	newNotifications(req,res) {
		const key_user 	= res.locals.user;
		Notification.countDocuments({'destination.item': key_user._id, read: false})
			.then((count) => {
				if(count > 0){
					res.status(200).json({
						'status': 200,
						'newNotifications': count
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No new notifications'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'notification_controller','newNotifications -- Finding new notifications for --' + key_user.name );
			});
	}, //newNotifications

	myNotifications(req,res) {
		const key_user 	= res.locals.user;
		var skip			=	0;
		var limit			= 0;
		if(req.query.skip) {
			skip = req.query.skip;
		}
		if(req.query.limit) {
			limit = req.query.limit;
		}
		var query 			= {
			'destination.item': key_user._id
		};
		if('read' in req.query) {
			query.read = req.query.read;
		} else {
			query.read = false;
		}
		Notification.find(query)
			.populate([{
				path: 'objects.item',
				select: '_id'
			},
			{
				path: 'source.item'
			},
			{
				path: 'destination.item'
			}
			])
			.skip(skip)
			.limit(limit)
			.lean()
			.then((notifications) => {
				if(notifications && notifications.length > 0) {
					var nots = [];
					notifications.forEach(function(notification) {
						var not = {
							notificationid	: notification._id,
							source					: notification.source,
							sourceType			: notification.type,
							sourceRole			: notification.source.role,
							destinationRole :	notification.destination.role,
							destination			: notification.destination,
							message					: notification.message,
							read						: notification.read,
							dateAgo					: TA.ago(notification.date),
							date						: notification.date,
							objects					: notification.objects
						};
						if(not.source.kind === 'users' || not.sourceType === 'user') {
							if(not.source.item){
								if(not.source.item.password	) {delete not.source.item.password;	}
								if(not.source.item.perm			)	{delete not.source.item.perm;			}
								if(not.source.item.admin		) {delete not.source.item.admin;		}
								if(not.source.item.roles		) {delete not.source.item.roles;		}
								if(not.source.item.mod			)	{delete not.source.item.mod;			}
								if(not.source.item.fiscal		)	{delete not.source.item.fiscal;		}
								if(not.source.item.student	)	{delete not.source.item.student;	}
								if(not.source.item.corporate)	{delete not.source.item.corporate;}
								if(not.source.item.__v			)	{delete not.source.item.__v;			}
								if(not.source.item._id			)	{delete not.source.item.person._id;}
								if(not.source.item.char1		)	{delete not.source.item.char1;		}
								if(not.source.item.char2		)	{delete not.source.item.char2;		}
								if(not.source.item.report		)	{delete not.source.item.report;		}
							}
						}
						if(not.destination.kind === 'users') {
							if(not.destination.item){
								if(not.destination.item.password	) {delete not.destination.item.password;}
								if(not.destination.item.perm			)	{delete not.destination.item.perm;		}
								if(not.destination.item.admin			)	{delete not.destination.item.admin;		}
								if(not.destination.item.roles			) {delete not.destination.item.roles;		}
								if(not.destination.item.mod				) {delete not.destination.item.mod;			}
								if(not.destination.item.fiscal		) {delete not.destination.item.fiscal;	}
								if(not.destination.item.student		) {delete not.destination.item.student;	}
								if(not.destination.item.corporate	) {delete not.destination.item.corporate;}
								if(not.destination.item.__v				) {delete not.destination.item.__v;			}
								if(not.destination.item._id				) {delete not.destination.item.person._id;}
								if(not.destination.item.char1			) {delete not.destination.item.char1;		}
								if(not.destination.item.char2			) {delete not.destination.item.char2;		}
								if(not.destination.item.report		) {delete not.destination.item.report;	}
							}
						}
						if(not.objects && not.objects.length > 0){
							not.objects.forEach(function(object) {
								if(object._id) {delete object._id;}
								if(object && object.kind === 'discussions') {
									if(object.item.date) { object.item.dateAgo = TA.ago(object.item.date); }
								}
							});
						}
						nots.push(not);
					});
					res.status(200).json({
						'status': 200,
						'message': nots
					});
				} else {
					res.status(200).json({
						'status': 404,
						'message': 'No messages found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'notification_controller','myNotifications -- Finding Notifications --',false,false,`User: ${key_user.name}`);
			});
	}, //myNotifications

	closeNotification(req,res) {
		//const key_user 	= res.locals.user;
		Notification.findById(req.body.notificationid)
			.then((notification) => {
				if(notification) {
					notification.read = true;
					notification.dateRead = new Date();
					notification.save()
						.then(() => {
							res.status(200).json({
								'status': 200,
								'message': 'Notification saved'
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'notification_controller','closeNotification -- Save Notification --');
						});
				} else {
					res.status(200).json({
						'status': 404,
						'message': 'No notification found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'notification_controller','closeNotification -- Finding Notification --');
			});
	}, //closeNotification

	reOpenNotification(req,res) {
		Notification.findById(req.body.notificationid)
			.then((notification) => {
				if(notification) {
					notification.read = false;
					notification.dateRead = new Date();
					notification.save()
						.then(() => {
							res.status(200).json({
								'status': 200,
								'message': 'Notification saved'
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'notification_controller','closeNotification -- Save Notification --');
						});
				} else {
					res.status(200).json({
						'status': 404,
						'message': 'No notification found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'notification_controller','closeNotification -- Finding Notification --');
			});
	} //reOpenNotification
};


// Private Functions
