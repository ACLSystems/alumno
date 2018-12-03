const mongoose 	= require('mongoose');
const Request 	= require('../src/requests');
const Err 				= require('../controllers/err500_controller');

module.exports = {
	create(req,res) {
		const key_user 		= res.locals.user;
		var request 			= req.body;
		request.requester = key_user._id;
		Request.create(request)
			.then((request)  => {
				res.status(200).json({
					'status': 200,
					'message': 'Request -' + request.reqNumber + '- has been created',
					'request': {
						'number': request.reqNumber,
						'id': request._id
					}
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'request_controller','create -- Create request --');
			});
	}, //create

	get(req,res) {
		const key_user 		= res.locals.user;
		var query 		= {};
		if(req.query.number) {
			query = {reqNumber: req.query.number};
		}
		if(req.query.id) {
			query = {_id: req.query.id};
		}
		Request.find(query)
			.populate('requester')
			.then((request)  => {
				res.status(200).json({
					'status': 200,
					'message': 'Request -' + request.reqNumber + '- found',
					'request': {}
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'request_controller','create -- Create request --');
			});
	}, //create
};
