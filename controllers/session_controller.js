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
		res.status(200).json({
			numUsers: users.length,
			users: users
		});
	}, //users

	async userSessionDetails(req,res){
		const onlyDate = getToday();
		const usersSession = await cache.get(sessionString + req.query.username);
		User.findOne({name:req.query.username})
			.select('name')
			.lean()
			.then((username) => {
				if(username){
					Session.findOne({user:username._id, onlyDate: onlyDate})
						.select('onlyDate details -_id')
						.lean()
						.then((session) => {
							if(session){
								if(session.details && Array.isArray(session.details)) {
									session.details.map(detail => {
										detail.date = detail.date.toString();
										detail.dateAgo = TA.ago(detail.date);
									});
								}
								if(usersSession) {
									res.status(200).json({
										username: username.name,
										active: true,
										userDetails: session
									});
								} else {
									res.status(200).json({
										username: username.name,
										active: false,
										userDetails: session
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
