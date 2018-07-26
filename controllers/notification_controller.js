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

	myNotifications(req,res) {
		const key_user 	= res.locals.user;
		const read			= req.query.read;
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
		if(!read) {
			query.read = false;
		}
		Notification.find(query)
			.populate([{
				path: 'object.item',
				select: 'text'
			},
			{
				path: 'source.item',
				select: 'name person.name person.fatherName person.motherName'
			}])
			.skip(skip)
			.limit(limit)
			.then((notifications) => {
				if(notifications.length > 0) {
					var nots = new Array();
					notifications.forEach(function(notification) {
						var not = {
							source		: notification.source,
							sourceType: notification.sourceType,
							role			: notification.role,
							message		: notification.message,
							read			: notification.read,
							dateAgo		: TA.ago(notification.date),
							date			: notification.date,
							object		: notification.object
						};
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
	} //myNotifications

};


// Private Functions
