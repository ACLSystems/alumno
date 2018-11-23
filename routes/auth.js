const jwt = require('jwt-simple');
const Users = require('../src/users');
const Session = require('../src/sessions');

const logger = require('../shared/winston-logger');

var auth = {

	login: function(req, res) {

		var username = req.body.username || req.body.name || '';
		var password = req.body.password || '';

		if (username == '' || password == '') {
			res.status(401).json({
				'status': 401,
				//'message': 'Please, give credentials'
				'message': 'Error: Por favor, proporcione las credenciales para acceder'
			});
			return;
		}

		Users.findOne({$or: [{name: username},{'person.email': username}] })
			.then((user) => {
				if(!user) {
					res.status(404).json({
						'status': 404,
						//'message': 'User -' + username + '- not found'
						'message': 'Error: el usuario o el password no son correctos'
					});
				} else {
					user.validatePassword(password, function(err, isOk) {
						if(isOk) {
							var session = new Session;
							var objToken = genToken(user);
							var date = new Date();
							session.user = objToken.user._id;
							session.token = objToken.token;
							session.date = date;
							session.save().then(() => {
								res.status(200).json({
									'status': 200,
									'token': objToken.token,
									'expires': objToken.expires
								});
							})
								.catch((err) => {
									sendError(res,err,'auth -- Saving session --');
								});
						} else {
							res.status(400).json({
								'status': 400,
								//'message': 'Password incorrect'
								'message': 'Error: el usuario o el password no son correctos'
							});
						}
					});
				}
			})
			.catch((err) => {
				const mess = {id: 500, error: 'Error: server error'};
				res.status(500).send(mess + err);
			});
	}
};

// private Methods

function genToken(user) {
	var expires = expiresIn(parseInt(process.env.EXPIRES));  //número de días para que el token expire
	var token = jwt.encode({
		user: user.name,
		exp: expires
	}, require('../config/secret')());

	return {
		token: token,
		expires: expires,
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
	res.status(500).json({
		'status': 500,
		'message': 'Error',
		'Error': err.message
	});
	return;
}

module.exports = auth;
