const StatusCodes = require('http-status-codes');
const jwt 				= require('jwt-simple');
const Users 			= require('../src/users');
const Session			= require('../src/sessions');
const Time 				= require('../shared/time');
const cache 			= require('../src/cache');
const logger 			= require('../shared/winston-logger');

/**
	* CONFIG
	* Todo se extrae de variables de Ambiente
	*/
/** @const {number} - Días de expiración
	* @default				- 7
*/
const expires = parseInt(process.env.NODE_EXPIRES) || 7;
/** @const {string} - url de login */
const urlLogin = '/login';

var auth = {

	login: function(req, res) {

		var username = req.body.username || req.body.name || '';
		var password = req.body.password || '';

		if (username == '' || password == '') {
			res.status(StatusCodes.UNAUTHORIZED).json({
				'message': 'Error: Por favor, proporcione las credenciales para acceder'
			});
			return;
		}
		Users.findOne({$or: [{name: username},{'person.email': username}] })
			.populate({
				path: 'orgUnit',
				select: 'name parent type longName',
				options: { lean: true }
			})
			.then((user) => {
				if(!user) {
					res.status(StatusCodes.NOT_FOUND).json({
						'message': 'Error: el usuario o el password no son correctos'
					});
				} else {
					user.validatePassword(password, function(err, isOk) {
						if(isOk) {
							const objToken = genToken(user);
							var session = new Session({
								user: user._id,
								token: objToken.token,
								onlyDate: getToday(),
								date: new Date(),
								url: urlLogin
							});
							session.save()
								.then(() => {
									cache.hmset('session:id:'+user._id,{
										token: objToken.token,
										url: urlLogin
									});
									cache.set('session:name:'+ user.name + ':' + user.orgUnit.name, 'session:id:'+user._id);
									cache.expire('session:id:'+user._id,cache.ttlSessions);
									cache.expire('session:name:'+ user.name + ':' + user.orgUnit.name,cache.ttlSessions);
									res.status(StatusCodes.OK).json({
										'token': objToken.token,
										'expires': objToken.expires
									});
								})
								.catch((err) => {
									sendError(res,err,'auth -- Saving session --');
								});

						} else {
							res.status(StatusCodes.UNAUTHORIZED).json({
								'message': 'Error: el usuario o el password no son correctos'
							});
						}
					});
				}
			})
			.catch((err) => {
				const mess = {id: StatusCodes.INTERNAL_SERVER_ERROR, error: 'Error: server error'};
				res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(mess + err);
			});
	}
};

// private Methods

function genToken(user) {
	var expiresInt = expiresIn(expires);
	var token = jwt.encode({
		user: user.name,
		exp: expiresInt
	}, require('../config/secret')());

	return {
		token: token,
		expires: expiresInt,
		user: user
	};
}

function expiresIn(numDays) {
	var dateObj = new Date();
	return dateObj.setDate(dateObj.getDate() + numDays);
}

function sendError(res, err, section) {
	logger.error('Auth -- Section: ' + section + '----');
	logger.error(err);
	res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
		'message': 'Error',
		'Error': err.message
	});
	return;
}

function getToday() {
	const now = new Date();
	let {date} = Time.displayLocalTime(now);
	//date = new Date(date);
	//date = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
	return date;
}

module.exports = auth;
