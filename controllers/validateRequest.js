const jwt = require('jwt-simple');
const Users = require('../src/users');
const winston = require('winston');
require('winston-daily-rotate-file');

var transport = new(winston.transports.DailyRotateFile) ({
	filename: './logs/log',
	datePattern: 'yyyy-MM-dd.',
	prepend: true,
	localTime: true,
	level: process.env.ENV === 'development' ? 'debug' : 'info'
});

var logger = new(winston.Logger) ({
	transports: [
		transport
	]
});

//const validateUser = require('../routes/auth').validateUser;

module.exports = function(req, res, next) {

	// When performing a cross domain request, you will receive
	// a preflighted request first. This is to check if our myapp
	// is safe.

	// We skip the token outh for [OPTIONS] requests.
	// if (req.method == 'OPTIONS') next();

	var token = (req.body && req.body.access_token) || req.headers['x-access-token'];
	var key = (req.body && req.body.x_key) || req.headers['x-key'];

	if(!token || !key ) {
		res.status(400);
		res.json({
			'status': 400,
			'message': 'Missing token or key'
		});
		return;
	}

	if (token && key) {
		var decoded = jwt.decode(token, require('../config/secret')());

		if(decoded.exp <= Date.now()) {
			res.status(400);
			res.json({
				'status': 400,
				'message': 'Token expired'
			});
			return;
		}

		// Authorize the user to see if s/he can access our resources
		Users.findOne({ name: key })
			.then((user) => {
				//console.log(user); // eslint-disable-line
				if (user) {
					var dbUserObj = {
						name: user.name,
						roles: user.roles,
						username: user.name
					};
					console.log(req.url);
					console.log(req.url.indexOf('admin'));
					console.log(req.url.indexOf('business'));
					console.log(req.url.indexOf('orgadm'));
					console.log(req.url.indexOf('orgcontent'));
					console.log(req.url.indexOf('author'));
					console.log(req.url.indexOf('instructor'));
					console.log(req.url.indexOf('supervisor'));
					console.log(req.url.indexOf('/api/v1/'));
					if (  (req.url.indexOf('admin') >= 0 && dbUserObj.roles.isAdmin) ||
									(req.url.indexOf('business') >= 0 && dbUserObj.roles.isBusiness) ||
									(req.url.indexOf('orgadm') >= 0 && dbUserObj.roles.isOrg) ||
									(req.url.indexOf('orgcontent') >= 0 && dbUserObj.roles.isOrgContent) ||
									(req.url.indexOf('author') >= 0 && dbUserObj.roles.isAuthor) ||
									(req.url.indexOf('instructor') >= 0 && dbUserObj.roles.isInstructor) ||
									(req.url.indexOf('supervisor') >= 0 && dbUserObj.roles.isSupervisor) ||
									(req.url.indexOf('admin') < 0 &&
									req.url.indexOf('business') < 0 &&
									req.url.indexOf('orgadm') < 0 &&
									req.url.indexOf('orgcontent') < 0 &&
									req.url.indexOf('author') < 0 &&
									req.url.indexOf('instructor') < 0 &&
									req.url.indexOf('supervisor') < 0 &&
									req.url.indexOf('admin') < 0 &&
									req.url.indexOf('/api/v1/') >= 0)) {
						next();
					} else {
						res.status(403);
						res.json({
							'status': 403,
							'message': 'User not authorized'
						});
					}
					return;
				} else {
					// No user with this name exists, respond back with a 401
					res.status(401);
					res.json({
						'status': 401,
						'message': 'User not valid'
					});
					return;
				}
			})
			.catch((err) => {
				logger.info('Validate Request ------');
				logger.info(err);
				res.status(500);
				res.json({
					'status': 500,
					'message': 'Error: ',
					'error': err
				});
			});
	} else {
		res.status(401);
		res.json({
			'status': 401,
			'message': 'User needs to log in, or token/key invalid'
		});
		return;
	}
};
