

module.exports = function(req, res, next) {
	switch (req.url) {
	case '/api/user/register':
		if(!req.body){
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give data by body to process'
			});
		} else if(!req.body.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please give user name'
			});
		} else if (!req.body.org) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please give org'
			});
		} else if(!req.body.orgUnit){
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please give orgUnit'
			});
		} else if(!req.body.password) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please give password for ' + req.body.name
			});
		} else if(!req.body.person){
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please give person details for ' + req.body.name + '. If you send a JSON like { "person.name" : "myName" } , please re-write to  {"person": { "name": "myName"}} in order to process'
			});
		} else if(!req.body.person.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please give person name for ' + req.body.name
			});
		} else if(!req.body.person.fatherName) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please give person fatherName for ' + req.body.name
			});
		} else if(!req.body.person.motherName) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please give person motherName for ' + req.body.name
			});
		} else if(!req.body.person.email){
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please give person email for ' + req.body.name
			});
		} else {
			next();
		}
		break;
	case '/api/v1/user/getdetails':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give data by query to process'
			});
		} else if(!req.query.name && !req.headers['name']) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give user name by query or by header to process'
			});
		} else {
			next();
		}
		break;
	case '/api/user/validateEmail':
		if(!req.headers['email'] && !req.query.email) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give user email to process'
			});
		} else {
			next();
		}
		break;
	case '/api/v1/user/passwordChange':
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give data by query to process'
			});
		} else if(!req.body.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give user name by query to process'
			});
		} else if(!req.body.password) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give user password by query to process'
			});
		} else {
			next();
		}
		break;
	case '/api/v1/user/modify':
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give data by query to process'
			});
		} else if(!req.body.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give user name by query to process'
			});
		} else {
			next();
		}
		break;
	default:
		res.send(404).json({
			'status': 404,
			'message': 'API not found'
		});
	}
};
