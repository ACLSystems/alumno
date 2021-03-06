//const jwt 		= require('jwt-simple');
const jsonwebtoken = require('jsonwebtoken');
const Users 	= require('../src/users'										);
const Session = require('../src/sessions'									);
const Err 		= require('../controllers/err500_controller');
const Time 		= require('../shared/time'									);
const Cache 	= require('../src/cache'										);
const StatusCodes = require('http-status-codes');
const version = require('../version/version');

var publicKEY  = process.env.PUB_KEY;
const audience = process.env.NODE_LIBRETA_URI;
const issuer  = version.vendor;

// Decodificamos las llaves... vienen en base64
var buff = Buffer.from(publicKEY,'base64');
publicKEY = buff.toString('utf-8');

//const logger = require('../shared/winston-logger');

//const validateUser = require('../routes/auth').validateUser;

module.exports = async function(req, res, next) {

	// When performing a cross domain request, you will receive
	// a preflighted request first. This is to check if our myapp
	// is safe.

	// We skip the token outh for [OPTIONS] requests.
	// if (req.method == 'OPTIONS') next();

	var verifyOptions = {
		issuer:  issuer,
		audience:  audience,
		algorithm:  ['RS256']
	};

	// token puede venir del encabezado 'Authorization'
	// o 'x-access-token' (aunque este ya va pa'fuera)
	// o del cuerpo de la solicitud (aunque esto también va pa'fuera)
	// Validar el tema del case-insensitive para los encabezados
	var token = req.headers['Authorization'] || req.headers['authorization'] || req.headers['x-access-token'] || (req.body && req.body.access_token) || null;
	if(!token) {
		return res.status(StatusCodes.UNAUTHORIZED).json({
			'message': 'No hay token. Favor de iniciar sesión'
		});
	}
	try {
		// quitarle el "Bearer " si existe
		token = token.replace('Bearer ','');
		// validar el token
		var decoded = await jsonwebtoken.verify(token,publicKEY,verifyOptions);
	} catch (err) {
		if(err.name === 'TokenExpiredError'){
			var tokenDecoded = jsonwebtoken.decode(token);
			var userExpired = await Users.findById(tokenDecoded.userid)
				.select('-__v')
				.catch((err) => {
					Err.sendError(res,err,'Validate Request','-- Finding User Expired: ' + tokenDecoded.sub);
					return;
				});
			if(!userExpired) {
				return res.status(StatusCodes.UNAUTHORIZED).json({
					message: 'Token expirado. Favor de iniciar sesión'
				});
			}
			// userExpired.admin.tokens = userExpired.admin.tokens.filter(tok => tok !== token );
			userExpired.admin.tokens = [];
			await userExpired.save().catch((err) => {
				Err.sendError(res,err,'Validate Request','-- Saving User Expired: ' + tokenDecoded.sub);
				return;
			});
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'Token expirado. Favor de iniciar sesión',
				errMessage: err.message,
				expiredAt: err.expiredAt
			});
		} else if(err.name === 'JsonWebTokenError'){
			var message = 'Hay un error en el token.';
			if(err.message === 'jwt signature is required') {
				message = 'El token no tiene firma.';
			} else if(err.message === 'invalid signature') {
				message = 'Firma inválida.';
			} else if(err.message === 'jwt audience invalid') {
				message = 'Audiencia inválida. Probablemente esto va dirigido a otro sitio?';
			} else if(err.message === 'jwt issuer invalid') {
				message = 'Firmador inválido.';
			} else if(err.message === 'jwt id invalid') {
				message = 'ID inválido.';
			} else if(err.message === 'jwt subject invalid') {
				message = 'Usuario inválido.';
			}
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: message + ' Favor de iniciar sesión.',
				errMessage: err.message
			});
		} else {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: err
			});
		}
	}
	var expired = new Date(0);
	expired.setUTCSeconds(decoded.exp);
	//console.log(expired.toString());
	req.headers.key = decoded.sub;

	// Authorize the user to see if s/he can access our resources
	//Users.findOne({ name: decoded.user })
	// Usuario autenticado, veamos si puede acceder los recursos
	var user = await Users.findOne({_id: decoded.userid, 'admin.tokens': token})
		.populate({
			path: 'org',
			select: 'name',
			options: { lean: true }
		})
		.populate({
			path: 'orgUnit',
			select: 'name parent type level longName displayEvals',
			options: { lean: true }
		})
		.populate({
			path: 'workShift',
			select: 'name org orgUnit allTime shifts',
			options: { lean: true }
		})
		.select('-password')
		.catch((err) => {
			Err.sendError(res,err,'Validate Request','Validate Request -- Finding User: ' + decoded.user);
			return;
		});
	if(!user) {
		return res.status(StatusCodes.UNAUTHORIZED).json({
			'message': 'Usuario o token no válidos. Favor de iniciar sesión.'
		});
	}
	if(!user.org || !user.org.name) {
		return res.status(StatusCodes.NOT_ACCEPTABLE).json({
			'message': 'Error: La organización que el usuario tiene configurada no es válida. Por favor contacte al administrador'
		});
	}
	if(!user.orgUnit || !user.orgUnit.name) {
		return res.status(404).json({
			'message': 'Error: El plantel que el usuario tiene configurado no es válido. Por favor contacte al administrador'
		});
	}
	var dbUserObj = {
		name: user.name,
		roles: user.roles,
		username: user.name
	};
	var url = req.url;
	const indexurl = url.indexOf('?');
	if(indexurl !== -1){
		url = url.substring(0,indexurl);
	}
	if ((url.indexOf('admin') !== -1 && dbUserObj.roles.isAdmin) ||
		(url.indexOf('business') !== -1 && dbUserObj.roles.isBusiness) ||
		(url.indexOf('orgadm') !== -1 && dbUserObj.roles.isOrg) ||
		(url.indexOf('orgcontent') !== -1 && dbUserObj.roles.isOrgContent) ||
		(url.indexOf('author') !== -1 && dbUserObj.roles.isAuthor) ||
		(url.indexOf('instructor') !== -1 && dbUserObj.roles.isInstructor) ||
		(url.indexOf('supervisor') !== -1 && dbUserObj.roles.isSupervisor) ||
		(url.indexOf('requester') !== -1 && dbUserObj.roles.isRequester) ||
		(url.indexOf('admin') === -1 &&
		url.indexOf('business') === -1 &&
		url.indexOf('orgadm') === -1 &&
		url.indexOf('orgcontent') === -1 &&
		url.indexOf('author') === -1 &&
		url.indexOf('instructor') === -1 &&
		url.indexOf('supervisor') === -1 &&
		url.indexOf('requester') === -1 &&
		url.indexOf('admin') === -1 &&
		url.indexOf('/api/v1/') !== -1)) {
		res.locals.user = user;
		res.locals.token = token;
		res.locals.url = url;
		let session = new Session({
			user: user._id,
			onlyDate: getToday(),
			date: new Date,
			url: url
		});
		await session.save().catch((err) => {
			Err.sendError(res,err,'auth -- Saving session -- User: ' + user.name + ' URL: ' + url);
			return;
		});
		await Cache.hmset('session:id:'+user._id,{
			url: url
		});
		await Cache.set('session:name:'+ user.name + ':' + user.orgUnit.name, 'session:id:'+user._id);
		await Cache.expire('session:id:'+user._id,Cache.ttlSessions);
		await Cache.expire('session:name:'+ user.name + ':' + user.orgUnit.name,Cache.ttlSessions);
		next();
	} else {
		res.status(StatusCodes.FORBIDDEN).json({
			'message': 'Usuario no autorizado'
		});
		return;
	}
};


// Private functions

// function base64urlDecode(str) {
// 	return new Buffer(base64urlUnescape(str), 'base64').toString();
// }
//
// function base64urlUnescape(str) {
// 	str += new Array(5 - str.length % 4).join('=');
// 	return str.replace(/\-/g, '+').replace(/_/g, '/');  // eslint-disable-line
// }
/*
function sendError(res, err, section) {
	logger.error('validate request -- Section: ' + section + '----');
	logger.error(err);
	res.status(500).json({
		'status': 500,
		'message': 'Error',
		'Error': err.message
	});
	return;
}
*/
function getToday() {
	const now = new Date();
	let {date} = Time.displayLocalTime(now);
	//date = new Date(date);
	//date = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
	return date;
}
