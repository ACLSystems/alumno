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

	if(!token) {
		res.status(400);
		res.json({
			'status': 400,
			'message': 'Error 200: Missing token'
		});
		return;
	} else {
		var segments = token.split('.');
		if (segments.length !== 3) {
			res.status(400).json({
				'status': 400,
				'message': 'Error 201: Token is malformed or corrupt: Please verify'
			});
			return;
		} else {
			var headerSeg = segments[0];
			var payloadSeg = segments[1];
			var signatureSeg = segments[2];
			var header = {};
			var payload = {};
			var itwasError = false;
			if(headerSeg) {
				try {
					header = JSON.parse(base64urlDecode(headerSeg));
				} catch(e) {
					if (e instanceof SyntaxError) {
						res.status(400).json({
							'status': 400,
							'message': 'Error 202: Header token is malformed or corrupt: Please verify'
						});
					}
					itwasError = true;
				}
			} else if(payloadSeg) {
				try {
					payload = JSON.parse(base64urlDecode(payloadSeg));
				} catch(e) {
					if (e instanceof SyntaxError) {
						res.status(400).json({
							'status': 400,
							'message': 'Error 203: Payload token is malformed or corrupt: Please verify'
						});
					}
				}
				itwasError = true;
			}
			if(itwasError) {
				return;
			}
		}
		var decoded = jwt.decode(token, require('../config/secret')());
		if(decoded.exp <= Date.now()) {
			res.status(400).res.json({
				'status': 400,
				'message': 'Error 204: Token expired'
			});
			return;
		}
		req.headers.key = decoded.user;

		// Authorize the user to see if s/he can access our resources
		Users.findOne({ name: decoded.user })
			.then((user) => {
				//console.log(user); // eslint-disable-line
				if (user) {
					var dbUserObj = {
						name: user.name,
						roles: user.roles,
						username: user.name
					};
					/*
					console.log(req.url + ' '  // eslint-disable-line
					+ req.url.indexOf('admin') + ' '
					+ req.url.indexOf('orgadm') + ' '
					+ req.url.indexOf('orgcontent') + ' '
					+ req.url.indexOf('author') + ' '
					+ req.url.indexOf('instructor') + ' '
					+ req.url.indexOf('supervisor') + ' '
					+ req.url.indexOf('/api/v1/') + ' '
					);
					*/
					if (  (req.url.indexOf('admin') !== -1 && dbUserObj.roles.isAdmin) ||
									(req.url.indexOf('business') !== -1 && dbUserObj.roles.isBusiness) ||
									(req.url.indexOf('orgadm') !== -1 && dbUserObj.roles.isOrg) ||
									(req.url.indexOf('orgcontent') !== -1 && dbUserObj.roles.isOrgContent) ||
									(req.url.indexOf('author') !== -1 && dbUserObj.roles.isAuthor) ||
									(req.url.indexOf('instructor') !== -1 && dbUserObj.roles.isInstructor) ||
									(req.url.indexOf('supervisor') !== -1 && dbUserObj.roles.isSupervisor) ||
									(req.url.indexOf('admin') === -1 &&
									req.url.indexOf('business') === -1 &&
									req.url.indexOf('orgadm') === -1 &&
									req.url.indexOf('orgcontent') === -1 &&
									req.url.indexOf('author') === -1 &&
									req.url.indexOf('instructor') === -1 &&
									req.url.indexOf('supervisor') === -1 &&
									req.url.indexOf('admin') === -1 &&
									req.url.indexOf('/api/v1/') !== -1)) {
						next();
					} else {
						res.status(403);
						res.json({
							'status': 403,
							'message': 'Error 205: User not authorized'
						});
					}
					return;
				} else {
					// No user with this name exists, respond back with a 401
					res.status(401);
					res.json({
						'status': 401,
						'message': 'Error 206: User not valid'
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
					'message': 'Error 40: System Error',
					'error': err
				});
			});
	}
	/*
	else {
		res.status(401);
		res.json({
			'status': 401,
			'message': 'User needs to log in, or token/key invalid'
		});
		return;
	}
	*/
};


// Private functions

function base64urlDecode(str) {
	return new Buffer(base64urlUnescape(str), 'base64').toString();
}

function base64urlUnescape(str) {
	str += new Array(5 - str.length % 4).join('=');
	return str.replace(/\-/g, '+').replace(/_/g, '/');
}
