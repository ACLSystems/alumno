const cache 					= require('../src/cache'		);
const Time 						= require('../shared/time'	);
const Session 				= require('../src/sessions'	);
const Err 						= require('../controllers/err500_controller');
const User 						= require('../src/users');
const TA							= require('time-ago');
const sessionString 	= 'session:name:';
//const sessionStringId = 'session:id:';

module.exports = {
	async users(req,res) {
		const usersSessions = await cache.keys(sessionString + '*');
		const users = usersSessions.map(user => user.slice(sessionString.length));
		if(users.length > 0){
			res.status(200).json({
				numUsers: users.length,
				users: users
			});
		} else {
			res.status(200).json({
				numUsers: users.length,
				message: 'No existen sesiones en el sistema. Probablemente el sistema reinició o se borró el caché premeditadamente. Por favor, intente nuevamente.'
			});
		}
	}, //users

	async userSessionDetails(req,res){
		const onlyDate = getToday();
		const usersSession = await cache.get(sessionString + req.query.username);
		User.findOne({name:req.query.username})
			.select('name')
			.lean()
			.then((username) => {
				if(username){
					Session.find({user:username._id, onlyDate: onlyDate})
						.sort({ date: -1 })
						.select('onlyDate date url group course -_id')
						.lean()
						.then((sessions) => {
							if(sessions && Array.isArray(sessions)){
								sessions = sessions.map(sess => {
									sess.dateAgo = TA.ago(sess.date);
									sess.date = sess.date.toString();
									return sess;
								});
								if(usersSession) {
									res.status(200).json({
										username: username.name,
										active: true,
										userDetails: sessions
									});
								} else {
									res.status(200).json({
										username: username.name,
										active: false,
										userDetails: sessions
									});
								}
							} else {
								res.status(404).json({
									message: `Usuario ${req.query.username} no tiene sesiones hoy`
								});
							}
						})
						.catch((err) => {
							Err.sendError(res,err,'SessionController','Finding session: ' + req.query.username);
						});
				} else {
					res.status(404).json({
						message: `Usuario ${req.query.username} no fue encontrado`
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'SessionController','Finding user: ' + req.query.username);
			});
	}
};

function getToday() {
	const now = new Date();
	let {date} = Time.displayLocalTime(now);
	//date = new Date(date);
	//date = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
	return date;
}
