

module.exports = function(req, res, next) {
	var url = req.url;
	const indexurl = url.indexOf('?');
	if(indexurl !== -1){
		url = url.substring(0,indexurl);
	}
	switch (url) {
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

	case '/api/user/near':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give data by query to process'
			});
		} else if(!req.query.lng && !req.query.lat) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give coordinates (lng,lat) in query to process'
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
	case '/api/user/validateemail':
		if(!req.headers['email'] && !req.query.email) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give user email to process'
			});
		} else {
			next();
		}
		break;
	case '/api/v1/user/passwordchange':
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
	case '/api/v1/user/getroles':
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
	case '/api/v1/user/setroles':
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give data by query to process'
			});
		} else if(!req.body.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give user name by query or by header to process'
			});
		} else if(!req.body.roles) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give roles of user to set'
			});
		} else {
			const roles = Object.keys(req.body.roles);
			var message = '';
			roles.forEach(function(key) {
				if(key !== 'isAdmin' &&
				key !== 'isOrg' &&
				key !== 'isBusiness' &&
				key !== 'isOrgContent' &&
				key !== 'isAuthor' &&
				key !== 'isInstructor' &&
				key !== 'isSupervisor') {
					message = 'Please use only recongnized roles';
				}
			});
			if (message !== '') {
				res.status(406).json({
					'status': 406,
					'message': message
				});
			} else {
				next();
			}
		}
		break;

	case '/api/v1/orgadm/orgunit/massiveregister':
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give data by body to process'
			});
		} else {
			var status = 'ok';
			var result = new Array();
			req.body.forEach(function(ou,index) {
				if(!ou.name) {
					result.push({ 'status': index + '.- Missing OU name'});
					status = 'not ok';
				}
				if(!ou.parent) {
					result.push({ 'status': index + '.- Missing OU parent name'});
					status = 'not ok';
				}
				if(!ou.type) {
					result.push({ 'status': index + '.- Missing OU type'});
					status = 'not ok';
				}
			});
			if(status === 'ok'){
				next();
			} else {
				res.status(406).json({
					'status': 406,
					'message': result
				});
			}
		}
		break;
	case '/api/v1/orgadm/orgunit/register':
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give data by body to process'
			});
		} else if(!req.body.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give user name by body to process'
			});
		} else if(!req.body.org) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give org name by body to process'
			});
		/*
		} else if(!req.body.parent) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give orgUnit parent name by body to process'
			});
		*/
		} else {
			next();
		}
		break;

	default:
		res.status(404).json({
			'status': 404,
			'message': 'API not found - validate Params'
		});
	}
};
