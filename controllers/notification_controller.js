//const mongoose 			= require('mongoose'												);
const StatusCodes 	= require('http-status-codes');
const TA 						= require('time-ago');
const Notification 	= require('../src/notifications'						);
const User 					= require('../src/users'										);
const Err 					= require('../controllers/err500_controller');
const mailjet 			= require('../shared/mailjet'								);

const redisClient = require('../src/cache');



/**
	* CONFIG
	* Todo se extrae de variables de Ambiente
	*/
/** @const {number}  -  plantilla para el usuario que es registrado por el administrador */
const template_notuser = parseInt(process.env.MJ_TEMPLATE_NOTUSER);

module.exports = {

	create(req,res) {
		const key_user 	= res.locals.user;
		var query 		= req.body;
		if(query.objects && query.objects.length > 0) {
			var errorInObjects = false;
			query.objects.forEach(function(object) {
				const properties = Object.keys(object);
				if(!properties.includes('item')) {
					errorInObjects = true;
				}
			});
			if(errorInObjects) {
				res.status(StatusCodes.NOT_ACCEPTABLE).json({
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
								res.status(StatusCodes.CREATED).json({
									'notificationid': message._id,
									'message': `Notification for: ${destination.name} created successfully`
								});
								if(send_email) {
									let subject = 'Tienes una notificación';
									let variables = {
										'Nombre': destination.person.name,
										'mensaje': message.message
									};
									mailjet.sendMail(destination.person.email,destination.person.name,subject,template_notuser,variables);
								}
								if(message.destination.role === 'user') {
									var allClients = getAllClients();
									if(allClients && Array.isArray(allClients) && allClients > 0) {
										const found = allClients.find(client => client.client + '' === destination._id + '');
										if(found) {
											emit(destination._id+'',{
												command: 'notification',
												channel: destination._id + '',
												message: 'reload'
											});
										}
									}
								}
							})
							.catch((err) => {
								Err.sendError(res,err,'notification_controller','create -- Creating Notification --',false,false,`Destination: ${destination.name} Source: ${source.name}`);
							});
					} else {
						res.status(StatusCodes.OK).json({
							//'status': '404',
							'message': 'Destination not found'
						});
					}
				} else {
					res.status(StatusCodes.OK).json({
						//'status': '404',
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
					res.status(StatusCodes.OK).json({
						'newNotifications': count
					});
				} else {
					res.status(StatusCodes.OK).json({
						'message': 'No new notifications'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'notification_controller','newNotifications -- Finding new notifications for --' + key_user.name );
			});
	}, //newNotifications

	async getNotification(req,res) {
		try {
			const notification = await Notification.findById(req.query.notificationid);
			console.log(notification);
			if(notification) {
				res.status(StatusCodes.OK).json(notification);
			} else {
				res.status(StatusCodes.OK).json({
					message: 'No notification found with this id'
				});
			}
		} catch (e) {
			Err.sendError(res,e,'notification_controller','getNotification - finding notification' );
		}
	}, //getNotification

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
				select: '_id name title code'
			},
			{
				path: 'source.item',
				select: 'person'
			},
			{
				path: 'destination.item',
				select: 'person'
			}
			])
			.skip(skip)
			.limit(limit)
			// .sort('-date')
			.lean()
			.then((notifications) => {
				if(notifications && notifications.length > 0) {
					var nots = [];
					notifications.forEach(notification => {
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
					res.status(StatusCodes.OK).json({
						'message': nots
					});
				} else {
					res.status(StatusCodes.OK).json({
						//'status': 404,
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
							res.status(StatusCodes.OK).json({
								'message': 'Notification saved'
							});
							if(notification.destination.role === 'user') {
								var allClients = getAllClients();
								if(allClients && Array.isArray(allClients) && allClients > 0) {
									const found = allClients.find(client => client.client + '' === notification.destination.item + '');
									if(found) {
										emit(notification.destination.item +'',{
											command: 'notification',
											channel: notification.destination.item + '',
											message: 'reload'
										});
									}
								}
							}
						})
						.catch((err) => {
							Err.sendError(res,err,'notification_controller','closeNotification -- Save Notification --');
						});
				} else {
					res.status(StatusCodes.OK).json({
						//'status': 404,
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
							res.status(StatusCodes.OK).json({
								'message': 'Notification saved'
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'notification_controller','closeNotification -- Save Notification --');
						});
				} else {
					res.status(StatusCodes.OK).json({
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

async function getAllClients() {
	var allClients = await redisClient.get('clients');
	if(allClients) {
		allClients = [...JSON.parse(allClients)];
	} else {
		allClients = [];
	}
	return allClients;
}

async function emit(destination, message) {
	const io = require('socket.io-emitter')(redisClient);
	io.to(destination).emit(destination,message);
}
