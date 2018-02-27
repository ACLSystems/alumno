const winston = require('winston');
const User = require('../src/users');
const Org = require('../src/orgs');
const Term = require('../src/terms');
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

module.exports = {
	create(req,res){
		const key_user 	= res.locals.user;
		var org = '';
		if(key_user.roles.isAdmin) {
			if(!req.body.org) {
				res.status(406).json({
					'status': 406,
					'message': 'Error: Org Missing'
				});
				return;
			} else {
				Org.findOne({name: req.body.org})
					.then((org) => {
						var term = {
							name: req.body.name,
							type: req.body.type,
							isVisible: true,
							org: org._id
						};
						Term.create(term)
							.then((term) => {
								res.status(200).json({
									'status': 200,
									'message': 'Term -' + term.name + '- created'
								});
							})
							.catch((err) => {
								sendError(res,err,'create.Term -- Creating Admin Term --');
							});
					})
					.catch((err) => {
						sendError(res,err,'create.Term -- Finding Org --');
					});
			}
		} else {
			org = key_user.org_id;
		}
		var term = {
			name: req.body.name,
			type: req.body.type,
			isVisible: true,
			org: org
		};
		Term.create(term)
			.then((term) => {
				res.status(200).json({
					'status': 200,
					'message': 'Term -' + term.name + '- created'
				});
			})
			.catch((err) => {
				sendError(res,err,'create.Term -- Creating Org Term --');
			});
	}, // create

	massiveCreation(req,res) {
		const key_user 	= res.locals.user;
		var terms_req = req.body;
		var numTerms = { requested: req.body.length};
		Term.find({ org: key_user.org._id})
			.then((terms) => {
				var termObj = {};
				var term_inserted = new Array();
				var term_updated = new Array();
				var failed = new Array();
				var nameStatus = 'ok';
				var typeStatus = 'ok';
				var status = 'ok';
				terms_req.forEach(function(term) {
					termObj = terms.find(function(termObj) { return termObj.name = term.name;});
					if(!termObj) {
						if(!term.name) {
							nameStatus = 'Name missing';
							status = 'not ok';
						}
						if(!term.type) {
							typeStatus = 'Type missing';
							status = 'not ok';
						}
						if(status === 'not ok') {
							failed.push({name: nameStatus, type: typeStatus});
							nameStatus = 'ok';
							typeStatus = 'ok';
							status = 'ok';
						} else {
							term.org = key_user.org._id;
							term_inserted.push(term);
						}
					} else {
						term.org = key_user.org._id;
						term_updated.push(termObj);
					}
				});
				if(term_inserted.length > 0 ) {
					Term.insertMany(term_inserted)
						.catch((err) => {
							sendError(res,err,'massiveCreation.Term -- insert many --');
						});
					numTerms.inserted = term_inserted.length;
				}
				if(term_updated.length > 0) {
					term_updated.forEach(function(term2Up) {
						Term.update({_id: term_updated._id}, {$set: term2Up})
							.catch((err) => {
								sendError(res,err,'massiveCreation.Term -- updating terms --');
							});
					});
					numTerms.updated = term_updated.length;
				}
				numTerms.failed = failed.length;
				var result = numTerms;
				result.details = failed;
				res.status(200).json({
					'status': 200,
					'message': result
				});
			})
			.catch((err) => {
				sendError(res,err,'massiveCreation.Term -- Finding Terms --');
			});
	}, // massiveCreation

	list(req,res) {
		var sort = { longName: 1 };
		var skip = 0;
		var limit = 15;
		var query = {};
		if(req.query.sort) { sort = { longName: req.query.sort }; }
		if(req.query.skip) { skip = parseInt( req.query.skip ); }
		if(req.query.limit) { limit = parseInt( req.query.limit ); }
		if(req.query.query) { query = JSON.parse(req.query.query); }
		var results = new Array();
		var result = {};
		Org.findOne({ name: req.query.org })
			.then((org) => {
				if(org) {
					query.org = org._id;
					Term.find(query)
						.sort(sort)
						.skip(skip)
						.limit(limit)
						.then((terms) => {
							terms.forEach(function(term) {
								result = {
									name: term.name,
									type: term.type,
									isVisible: term.isVisible
								};
								results.push(result);
							});
							res.status(200).json({
								'status': 200,
								'message': {
									'termNum': results.length,
									'results': results
								}
							});
						})
						.catch((err) => {
							sendError(res,err,'list.Term -- Finding Terms --');
						});
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'Org not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'list.Terms -- Finding Org --');
			});
	}, // list

	listTypes(req,res) {
		//if(req.query.query) { query = JSON.parse(req.query.query); }
		Org.findOne({name: req.query.org})
			.then((org) => {
				if(org) {
					Term.distinct('type', {org: org._id})
						.then((terms) => {
							if(terms.length > 0) {
								terms.sort();
								res.status(200).json({
									'status': 200,
									'message': {
										'numAreas': terms.length,
										'details': terms
									}
								});
							} else {
								res.status(404).json({
									'status': 404,
									'message': 'No terms found'
								});
							}
						})
						.catch((err) => {
							sendError(res,err,'listTypes.Terms -- Finding Terms --');
						});
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'Org not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'listAreas.Terms -- Finding Org --');
			});
	}
};


// Private Functions -----------------------------------------------------------

function sendError(res, err, section) {
	logger.info('Course controller -- Section: ' + section + '----');
	logger.info(err);
	res.status(500).json({
		'status': 500,
		'message': 'Error',
		'Error': err.message
	});
	return;
}
