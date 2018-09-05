//const version = require('../shared/version');
const Errors 	= require('../src/errors');
const Err 	 	= require('../controllers/err500_controller');
const TA 			= require('time-ago');

module.exports = {
	get(req,res) {
		var query = {status:'open'};
		var limit = 5;
		if(req.query.status)	{ query.status = req.query.status;			}
		if(req.query.limit)		{ limit = parseInt( req.query.limit );	}
		if(req.query.date)		{ query.date = {$gte: req.query.date};	}
		Errors.find(query)
			.sort({date: -1})
			.limit(limit)
			.lean()
			.then((errs) => {
				if(errs && errs.length > 0){
					errs.forEach(function(er) {
						delete er.__v;
						er.dateAgo = TA.ago(er.date);
					});
					res.status(200).json({
						'status'	: 200,
						'errorNum': errs.length,
						'Errors'	: errs
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No open errors found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'errmessage_controller','get -- Finding errors --',false,false,'---');
			});
	}, // get

	close(req,res) {
		Errors.findByIdAndUpdate(req.body.errorid)
			.then((errObj) => {
				if(errObj) {
					res.status(200).json({
						'status': 200,
						'message': `Error ${errObj._id} was succesfully closed`
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'errmessage_controller','put -- Finding errors --',false,false,'---');
			});
	}, //closeSeveral

	closeSeveral(req,res) {
		var query = {status:'open'};
		if(req.query.date)		{ query.date = {$gte: req.query.date};	}
		Errors.updateMany(query, {$set: {'status': 'closed'}})
			.then(() => {
				res.status(200).json({
					'status': 200,
					'message': 'Errors updated'
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'errmessage_controller','put -- Finding errors --',false,false,'---');
			});
	}
};
