//const mongoose 			= require('mongoose'												);
const Notification 	= require('../src/notifications'						);
const User 					= require('../src/users'										);
const Err 					= require('../controllers/err500_controller');
const mailjet 			= require('../shared/mailjet'								);
const TA 						= require('time-ago'												);

module.exports = {

	create(req,res) {
		const key_user 	= res.locals.user;
		var message 		= req.body;
		User.findById(key_user._id)
			// buscar el usuario que quiere mandar el mensaje
			.then((source) => {
				if(source) {
					var send_email = true;
					if(source.preferences && source.preferences.alwaysSendEmail === false) {
						send_email = false;
					}
					message.source = {
						kind: 'users',
						item: source._id
					};
					if(message.object) {
						message.object = {
							item: message.object,
							kind: message.objectType
						};
						delete message.objectType;
					}
					User.findById(message.destination)
						.then((destination) => {
							if(destination) {
								message.destination = {
									kind: 'users',
									item: destination._id
								};
								Notification.create(message)
									.then(() => {
										res.status(200).json({
											'status': '200',
											'message': 'Notification for: (' + destination.name + ') created successfully'
										});
										if(send_email) {
											mailjet.sendMail(source.person.email, source.person.name, 'Tienes una notificación',493237,'curso',message.message);
										}
									})
									.catch((err) => {
										Err.sendError(res,err,'notification_controller','create -- Creating Notification --');
									});
							} else {
								res.status(200).json({
									'status': '404',
									'message': 'Destination not found'
								});
							}
						})
						.catch((err) => {
							Err.sendError(res,err,'notification_controller','create -- Finding Destination --');
						});
				} else {
					res.status(200).json({
						'status': '404',
						'message': 'Source not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'notification_controller','create -- Finding Source --');
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
		}
		Notification.find(query)
			.populate([{
				path: 'object.item'
			},
			{
				path: 'source.item'
			}])
			.skip(skip)
			.limit(limit)
			.lean()
			.then((notifications) => {
				if(notifications.length > 0) {
					var nots = new Array();
					notifications.forEach(function(notification) {

						var not = {
							notificationid			: notification._id,
							source					: notification.source,
							sourceType			: notification.sourceType,
							sourceRole			: notification.sourceRole,
							destinationRole :	notification.destinationRole,
							message					: notification.message,
							read						: notification.read,
							dateAgo					: TA.ago(notification.date),
							date						: notification.date,
							object					: notification.object
						};
						if(not.source.kind === 'users') {
							delete not.source.item.password;
							delete not.source.item.perm;
							delete not.source.item.admin;
							delete not.source.item.roles;
							delete not.source.item.mod;
							delete not.source.item.fiscal;
							delete not.source.item.__v;
							delete not.source.item.person._id;
						}
						if(not.object && not.object.kind === 'discussions') {
							delete not.object.item.__v;
							if(not.object.item.date) { not.object.item.dateAgo = TA.ago(not.object.item.date); }
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
				Err.sendError(res,err,'notification_controller','myNotifications -- Finding Notifications --');
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
