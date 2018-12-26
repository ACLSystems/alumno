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
		var query 			= {};
		if(req.query.number) {
			query = {reqNumber: req.query.number};
		}
		if(req.query.id) {
			query = {_id: req.query.id};
		}
		Request.findOne(query)
			.populate([
				{
					path: 'requester',
					select: 'name fiscal person'
				},
				{
					path: 'details.item',
					select: '-own -perm -mod -rubric -__v',
					populate: [{
						path: 'orgUnit',
						select: 'name longName parent type'
					},{
						path: 'course',
						select: 'code title type price cost'
					}]
				}])
			.select('label tags details subtotal discount tax total status paymentNotes paymentDates files fiscalFiles requester date reqNumber temp1 temp2 temp3')
			.lean()
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
			.sort('-reqNumber')
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
		var   query 		= {};
		if(req.query.number) {
			query = {reqNumber: req.query.number};
		}
		if(req.query.id) {
			query = {_id: req.query.id};
		}
		Request.findOne(query)
			.then((request)  => {
				if(request.status === 'done') {
					res.status(406).json({
						'status': 406,
						'message': 'Request -' + request.reqNumber + '- is in status done. Cannot be changed'
					});
					return;
				}
				if(request.status === 'cancelled') {
					res.status(406).json({
						'status': 406,
						'message': 'Request -' + request.reqNumber + '- is cancelled. Cannot be finished'
					});
					return;
				}
				if(request.status === 'payment') {
					res.status(406).json({
						'status': 406,
						'message': 'Request -' + request.reqNumber + '- is already in status Payment. Cannot be finished'
					});
					return;
				}
				if(request){
					request.mod.push({
						by: key_user.name,
						when: new Date,
						what: 'Request change status to Payment'
					});
					request.status = 'payment';
					request.dateFinished = new Date;
					request.temp1 = [];
					request.temp2 = [];
					request.temp3 = [];
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
	}, //finish

	modify(req,res) {
		const key_user 	= res.locals.user;
		var   query 		= {};
		if(req.body.number) {
			query = {reqNumber: req.body.number};
		}
		if(req.body.id) {
			query = {_id: req.body.id};
		}
		Request.findOne(query)
			.then((request)  => {
				if(request.status === 'done') {
					res.status(406).json({
						'status': 406,
						'message': 'Request -' + request.reqNumber + '- is in status done. Cannot be changed'
					});
					return;
				}
				if(request.status === 'cancelled') {
					res.status(406).json({
						'status': 406,
						'message': 'Request -' + request.reqNumber + '- is cancelled. Cannot be changed'
					});
					return;
				}
				if(request.status === 'payment') {
					res.status(406).json({
						'status': 406,
						'message': 'Request -' + request.reqNumber + '- is in status Payment. Cannot be changed'
					});
					return;
				}
				if(request){
					request.mod.push({
						by: key_user.name,
						when: new Date,
						what: 'Request modified'
					});
					if(req.body.details	) {request.details 	= req.body.details;	}
					if(req.body.subtotal) {request.subtotal = req.body.subtotal;}
					if(req.body.tax			) {request.tax 			= req.body.tax;			}
					if(req.body.total		) {request.total 		= req.body.total;		}
					if(req.body.files		) {request.files 		= req.body.files;		}
					if(req.body.temp1		) {request.temp1 		= req.body.temp1;		}
					if(req.body.temp2		) {request.temp2 		= req.body.temp2;		}
					if(req.body.temp3		) {request.temp3 		= req.body.temp3;		}
					if(!req.body.details 	&&
						!req.body.subtotal	&&
						!req.body.tax				&&
						!req.body.total			&&
						!req.body.files			&&
						!req.body.temp1			&&
						!req.body.temp2			&&
						!req.body.temp3) {
						res.status(406).json({
							'status': 406,
							'message': 'Request -' + request.reqNumber + '- is not modified. Nothing valid to modify.'
						});
						return;
					}
					request.save()
						.then(() => {
							res.status(200).json({
								'status': 200,
								'message': 'Request -' + request.reqNumber + '- updated'
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'request_controller','modify -- Updating request --');
						});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'request_controller','modify -- Finding request --');
			});
	}, //modify

	cancel(req,res) {
		const key_user 	= res.locals.user;
		var   query 		= {};
		if(req.body.number) {
			query = {reqNumber: req.body.number};
		}
		if(req.body.id) {
			query = {_id: req.body.id};
		}
		Request.findOne(query)
			.then((request)  => {
				if(request){
					if(request.status === 'payment') {
						res.status(406).json({
							'status': 406,
							'message': 'Request -' + request.reqNumber + '- is already in process to payment and cannot be cancelled'
						});
						return;
					}
					if(request.status === 'done') {
						res.status(406).json({
							'status': 406,
							'message': 'Request -' + request.reqNumber + '- is already in status done. Cannot be cancelled'
						});
						return;
					}
					if(request.status === 'cancelled') {
						res.status(406).json({
							'status': 406,
							'message': 'Request -' + request.reqNumber + '- is already cancelled'
						});
						return;
					}
					request.mod.push({
						by: key_user.name,
						when: new Date,
						what: 'Request status change to Cancelled'
					});
					request.statusReason = req.body.statusReason;
					request.status = 'cancelled';
					request.dateCancelled = new Date;
					request.save()
						.then(() => {
							res.status(200).json({
								'status': 200,
								'message': 'Request -' + request.reqNumber + '- cancelled succesfully'
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'request_controller','cancel -- Updating request --');
						});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'request_controller','cancel -- Finding request --');
			});
	}, //cancel

};
