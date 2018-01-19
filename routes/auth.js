const jwt = require('jwt-simple');
const Users = require('../src/users');
//const bcrypt = require('bcrypt-nodejs');

var auth = {

	login: function(req, res) {

		var username = req.body.username || req.body.name || '';
		var password = req.body.password || '';

		if (username == '' || password == '') {
			res.status(401);
			res.json({
				'status': 401,
				'message': 'Please, give credentials'
			});
			return;
		}

		Users.findOne({ name: username })
			.then((user) => {
				user.validatePassword(password, function(err, isOk) {
					if(isOk) {
						/*
						var dbUserObj = {
							name: user.name,
							role: user.roles,
							username: user.name
						};
						*/
						res.status(200);
						//res.json(genToken(dbUserObj));
						res.json(genToken());
					}
				});
			})
			.catch((err) => {
				const mess = {id: 404, error: 'Error: password incorrect'};
				res.status(404).send(mess + err);
			});

		/*
		var dbUserObj = auth.validate(username, password);
		console.log(dbUserObj);
		if (!dbUserObj) {
			res.status(401);
			res.json({
				'status': 401,
				'message': 'Credenciales no validas'
			});
			return;
		} else {
			// If authentication is success, we will generate a Token
			// and dispatch it to the client
			res.status(200);
			res.json(genToken(dbUserObj));
		}
		*/
	}

	/*
	validate: function(username, password) {
		Users.findOne({ name: username })
			.then((user) => {
				user.validatePassword(password, function(err, isOk) {
					if(isOk) {
						var temp = {
							name: user.name,
							role: user.roles,
							username: user.name
						};
						console.log(temp);
						return temp;
					} else {
						return;
					}
				});
				if(user){
					bcrypt.compare(password, user.password, function(err,check){
						if(check) {
							var dbUserObj = {
								name: user.name,
								role: user.roles,
								username: user.name
							};
							console.log(dbUserObj);
							return dbUserObj;
						}
					});
				}
			});
	},

	validateUser: function(username) {
		console.log('Estamos en validateUser: ' + username);
		Users.findOne({ name: username})
			.then((user) => {
				if(!user) {
					return;
				} else {
					var dbUserObj = {
						name: user.name,
						role: user.roles,
						username: user.name
					};
				};
			});
		return dbUserObj;
	},
	*/
};

// private Methods

function genToken(user) {
	var expires = expiresIn(7);  // 7 días
	var token = jwt.encode({
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

module.exports = auth;
