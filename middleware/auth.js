const StatusCodes = require('http-status-codes');
//const jwt 				= require('jwt-simple');
const jsonwebtoken = require('jsonwebtoken');
const Users 			= require('../src/users');
const Orgs 				= require('../src/orgs');
const OrgUnits 		= require('../src/orgUnits');
const Session			= require('../src/sessions');
const Time 				= require('../shared/time');
const cache 			= require('../src/cache');
//const logger 			= require('../shared/winston-logger');
const version 		= require('../version/version');
const Err 				= require('../controllers/err500_controller');

/**
	* CONFIG
	* Todo se extrae de variables de Ambiente
	*/
/** @const {number} - Días de expiración
	* @default				- 7
*/
//const expires = parseInt(process.env.NODE_EXPIRES) || 7;
const expiresD = process.env.NODE_EXPIRES || '7d';
/** @const {string} - url de login */
const urlLogin = '/login';
/** @var {string} - Llaves públicas */
var privateKEY  = process.env.PRIV_KEY;
var publicKEY  = process.env.PUB_KEY;
const audience = process.env.NODE_LIBRETA_URI;
const issuer  = version.vendor;

if(!privateKEY || !publicKEY) {
	throw new Error('No hay llaves para generar tokens');
}

// Decodificamos las llaves... vienen en base64
var buff = Buffer.from(privateKEY,'base64');
privateKEY = buff.toString('utf-8');
buff = Buffer.from(publicKEY,'base64');
publicKEY = buff.toString('utf-8');

module.exports = {

	async login(req, res) {
		const username = req.body.username || req.body.name || '',
			password = req.body.password || '';
		if (username == '' || password == '') {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				'message': 'Error: Por favor, proporcione las credenciales para acceder'
			});
		}
		var user = await Users.findOne(
			{$or: [{
				name: username
			},{
				'person.email': username
			}]
			})
			.populate([{
				path: 'orgUnit',
				select: 'name parent type longName'
			},{
				path: 'org',
				select: 'name longName'
			}])
			.catch((err) => {
				Err.sendError(res,err,'auth','login -- Finding User --');
				return;
			});
		if(!user) {
			return res.status(StatusCodes.NOT_FOUND).json({
				'message': 'Error: el usuario o el password no son correctos'
			});
		}
		// console.log(user);
		if(!user.orgUnit.name && checkValidOID(user.orgUnit)) {
			// console.log(user.orgUnit);
			const ou = await OrgUnits.findById(user.orgUnit)
				.select('name parent type longName')
				.catch((err) => {
					Err.sendError(res,err,'auth','login -- Finding orgUnit 2nd round --');
					return;
				});
			if(ou) user.orgUnit = ou;
		}
		if(!user.org.name && checkValidOID(user.org)) {
			// console.log(user.orgUnit);
			const org = await Orgs.findById(user.org)
				.select('name longName')
				.catch((err) => {
					Err.sendError(res,err,'auth','login -- Finding org 2nd round --');
					return;
				});
			if(org) user.orgUnit = org;
		}
		// console.log('Aquí está el usuario');
		// console.log(user);
		await user.validatePassword(password, async (err, isOk) => {
			if(!isOk) {
				return res.status(StatusCodes.UNAUTHORIZED).json({
					'message': 'Error: el usuario o el password no son correctos'
				});
			}
			var invalidTokens = [],
				validToken = null;
			for(let token of user.admin.tokens) {
				await jsonwebtoken.verify(token,publicKEY, err => {
					if(err) invalidTokens.push(token);
					if(!err) validToken = token;
				});
			}
			user.admin.tokens = user.admin.tokens.filter(token => {
				return !invalidTokens.includes(token);
			});
			if(validToken) {
				const tokenDecoded = await jsonwebtoken.decode(validToken);
				if(!tokenDecoded.orgUnit.name || !tokenDecoded.org.name) {
					// console.log(user.orgUnit);
					validToken = null;
				}
				if(validToken) return res.status(StatusCodes.OK).json({
					token: validToken,
					iat: tokenDecoded.iat,
					exp: tokenDecoded.exp,
					note: 'token reused'
				});
			}
			const payload = {
				admin: {
					isActive : user.admin.isActive,
					isVerified : user.admin.isVerified,
					isDataVerified : user.admin.isDataVerified
				},
				attachedToWShift: user.attachedToWShift,
				org: user.org,
				userid: user._id,
				person: user.person,
				orgUnit: user.orgUnit,
				preferences: user.preferences
			};
			const signOptions = {
				issuer,
				subject: user.name,
				audience,
				expiresIn: expiresD,
				algorithm: 'RS256'
			};
			// console.log('Payload:');
			// console.log(payload);
			// console.log('Options:');
			// console.log(signOptions);
			const token = await jsonwebtoken.sign(payload, privateKEY, signOptions);
			const tokenDecoded = await jsonwebtoken.decode(token);
			var session = new Session({
				user: user._id,
				token,
				onlyDate: getToday(),
				date: new Date(),
				url: urlLogin
			});
			await session.save().catch((err) => {
				Err.sendError(res,err,'auth', `login -- Guardando sesión - con usuario ${user.name}`);
				return;
			});
			await cache.hmset('session:id:'+user._id,{
				token,
				url: urlLogin
			});
			await cache.set('session:name:'+ user.name + ':' + user.orgUnit.name, 'session:id:'+user._id);
			cache.expire('session:id:'+user._id,cache.ttlSessions);
			cache.expire('session:name:'+ user.name + ':' + user.orgUnit.name,cache.ttlSessions);
			if(!user.admin.tokens || !Array.isArray(user.admin.tokens)){
				user.admin.tokens = [];
			}
			user.admin.tokens.push(token);
			user.admin.lastLogin = new Date();
			await user.save().catch((err) => {
				Err.sendError(res,err,'auth', 'login -- Guardando usuario --');
			});
			res.status(StatusCodes.OK).json({
				token,
				iat: tokenDecoded.iat,
				exp: tokenDecoded.exp,
				note: 'new token'
			});
		});
	}, //login

	async logout(req,res) {
		var user = await Users.findOne({
			name: res.locals.user.name,
			'admin.tokens': res.locals.token
		}).catch((err) => {
			Err.sendError(res,err,'auth','logout -- localizando usuario --');
		});
		if(!user) {
			return res.status(StatusCodes.NOT_FOUND).json({
				'message': 'Error: el usuario o la sesión no existen'
			});
		}
		user.admin.tokens = user.admin.tokens.filter(tok => {
			return tok !== res.locals.token;
		});
		await user.save().catch((err) => {
			Err.sendError(res,err,'auth','logout -- Finding User --');
		});
		res.status(StatusCodes.OK).json({
			'message': 'Se ha cerrado la sesión'
		});
	},

	async logoutAll(req,res) {
		var user = await Users.findOne({
			name: res.locals.user.name,
			'admin.tokens': res.locals.token
		}).catch((err) => {
			Err.sendError(res,err,'auth','logout -- Finding User --');
		});
		if(!user) {
			return res.status(StatusCodes.NOT_FOUND).json({
				'message': 'Error: el usuario o la sesión no existen'
			});
		}
		user.admin.tokens = [];
		await user.save().catch((err) => {
			Err.sendError(res,err,'auth','logout -- Finding User --');
		});
		res.status(StatusCodes.OK).json({
			'message': 'Se han cerrado todas las sesiones'
		});
	}
};

// private Methods

function getToday() {
	const now = new Date();
	let {date} = Time.displayLocalTime(now);
	//date = new Date(date);
	//date = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
	return date;
}

function checkValidOID(stringToCheck) {
	// console.log(stringToCheck);
	// console.log(typeof stringToCheck);
	const mongoose = require('mongoose');
	if(typeof stringToCheck === 'object') {
		const keys = Object.keys(stringToCheck);
		// console.log(keys);
		if(keys.includes('_bsontype') || keys.includes('id')) {
			stringToCheck += '';
		} else {
			return false;
		}
	}
	const ObjectId = mongoose.Types.ObjectId;
	const regex = /^[a-fA-F0-9]{24}$/g;
	if(ObjectId.isValid(stringToCheck) && stringToCheck.match(regex)) return true;
	return false;
}
