const mongoose 	= require('mongoose');
const Request 	= require('../src/requests');
const TA 				= require('time-ago'												);
const Err 			= require('../controllers/err500_controller');

module.exports = {
	create(req,res) {
		const key_user 		= res.locals.user;
		var request = req.body;
		request.requester = key_user._id;
		request.mod = {
			by: key_user.name,
			when: new Date,
			what: 'Request Creation'
		};
		request.own = {
			user: key_user.name,
			org: key_user.org.name,
			orgUnit: key_user.orgUnit.name
		};
		request.perm = {
			users: [{ name: key_user.name, canRead: true, canModify: true, canSec: true }],
			roles: [{ name: 'isSupervisor', canRead: true, canModify: false, canSec: false},
				{ name: 'isOrg', canRead: true, canModify: false, canSec: false},
				{ name: 'isBusiness', canRead: true, canModify: false, canSec: true}],
			orgs: [{ name: key_user.org.name, canRead: true, canModify: false, canSec: false}],
			orgUnits: [{ name: key_user.orgUnit.name, canRead: true, canModify: true, canSec: false}]
		};
		Request.create(request)
			.then((request)  => {
				res.status(200).json({
					'status': 200,
					'message': 'Request -' + request.reqNumber + '- has been created',
					'request': {
						'number': request.reqNumber,
						'label'	:	request.label,
						'id'		: request._id
					}
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'request_controller','create -- Create request --');
			});
	}, //create

	get(req,res) {
		const key_user 	= res.locals.user;
		var query 			= {};
		if(req.query.number) {
			query = {reqNumber: req.query.number};
		}
		if(req.query.id) {
			query = {_id: req.query.id};
		}
		Request.findOne(query)
			.populate('requester','name')
			.select('label details subtotal discount tax total status paymentNotes paymentDates files fiscalFiles requester date reqNumber')
			.then((request)  => {
				if(request) {
					res.status(200).json({
						'status': 200,
						'message': 'Request -' + request.reqNumber + '- found',
						'request': request
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'Request -' + request.number + '- not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'request_controller','get -- Finding request --');
			});
	}, //create

	my(req,res) {
		const key_user 	= res.locals.user;
		var query = {requester:key_user._id};
		var active = true;
		active = JSON.parse(req.query.active);
		if(active) {
			query.status = {$in: ['init','payment']};
		}
		Request.find(query)
			.select('label date reqNumber status')
			.then((requests)  => {
				if(requests && requests.length > 0) {
					res.status(200).json({
						'status': 200,
						'message': 'Requests for -' + key_user.name + '- found',
						'requests': requests
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No requests found for -' + key_user.name
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'request_controller','my -- Finding requests --');
			});
	}, //my

	finish(req,res) {
		const key_user 	= res.locals.user;
		Request.findOne({reqNumber:req.query.number})
			.then((request)  => {
				if(request){
					request.mod.push = {
						by: key_user.name,
						when: new Date,
						what: 'Request change status to Payment'
					};
					request.status = 'payment';
					request.save()
						.then(() => {
							res.status(200).json({
								'status': 200,
								'message': 'Request -' + request.reqNumber + '- updated'
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'request_controller','finish -- Updating request --');
						});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'request_controller','finish -- Finding request --');
			});
	}, //my
};
