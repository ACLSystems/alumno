const Org = require('../src/orgs');
//const User = require('../src/users');
const Career = require('../src/careers');

const logger = require('../shared/winston-logger');


module.exports = {

	create(req,res) {
		const key_user 	= res.locals.user;
		var career_req = req.body;
		var org = '';
		if(key_user.roles.isAdmin) {
			if(!career_req.org) {
				res.status(406).json({
					'status': 406,
					'message': 'Org missing'
				});
				return;
			} else {
				org = career_req.org;
			}
		} else {
			org = key_user.org._id;
		}
		var career = {
			name: career_req.name,
			longName: career_req.longName,
			area: career_req.area,
			isVisible: true,
			org: org
		};
		Career.create(career)
			.then((career) => {
				res.status(200).json({
					'status': 200,
					'message': 'Career -' + career.name + '- was created'
				});
			})
			.catch((err) => {
				sendError(res,err,'create.Career -- Finding User --');
			});
	}, // create

	massiveCreation(req,res) {
		const key_user 	= res.locals.user;
		var careers_req = req.body;
		var numCareers = {requested: req.body.length};
		Career.find({ org: key_user.org._id})
			.then((careers) => {
				var careerObj = {};
				var car_inserted = [];
				var car_updated = [];
				var failed = [];
				var nameStatus = 'ok';
				var longNameStatus = 'ok';
				var areaStatus = 'ok';
				var status = 'ok';
				careers_req.forEach(function(career) {
					careerObj = careers.find(function(careerObj) {return careerObj.name === career.name;});
					if(!careerObj) {
						if(!career.name) {
							nameStatus = 'Name Missing';
							status = 'not ok';
						}
						if(!career.longName) {
							longNameStatus = 'Long Name Missing';
							status = 'not ok';
						}
						if(!career.area) {
							areaStatus = 'Long Name Missing';
							status = 'not ok';
						}
						if(status === 'not ok') {
							failed.push({name: nameStatus, longName: longNameStatus, area: areaStatus});
							nameStatus = 'ok';
							longNameStatus = 'ok';
							areaStatus = 'ok';
							status = 'ok';
						} else {
							career.org = key_user.org._id;
							car_inserted.push(career);
						}
					} else {
						career.org = key_user.org._id;
						car_updated.push(careerObj);
					}
				});
				if(car_inserted.length > 0) {
					Career.insertMany(car_inserted)
						.catch((err) => {
							sendError(res,err,'massiveCreation.Career -- insert Many --');
						});
					numCareers.inserted = car_inserted.length;
				}
				if(car_updated.length > 0){
					car_updated.forEach(function(car2Up) {
						Career.update({_id: car_updated._id}, {$set: car2Up})
							.catch((err) => {
								sendError(res,err,'massiveCreation.Career -- Updating --');
							});
					});
					numCareers.updated = car_updated.length;
				}
				numCareers.failed = failed.length;
				var result = numCareers;
				result.details = failed;
				res.status(200).json({
					'status': 200,
					'message': result
				});
			})
			.catch((err) => {
				sendError(res,err,'massiveCreation.Career -- Finding Career --');
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
		var results = [];
		var result = {};
		Org.findOne({ name: req.query.org })
			.then((org) => {
				if(org) {
					query.org = org._id;
					Career.find(query)
						.sort(sort)
						.skip(skip)
						.limit(limit)
						.then((careers) => {
							careers.forEach(function(car) {
								result = {
									name: car.name,
									longName: car.longName,
									area: car.area,
									isVisible: car.isVisible
								};
								results.push(result);
							});
							res.status(200).json({
								'status': 200,
								'message': {
									'careerNum': results.length,
									'results': results
								}
							});
						})
						.catch((err) => {
							sendError(res,err,'list.Career -- Finding Careers --');
						});
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'Org not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'list.Career -- Finding Org --');
			});
	}, // list

	listAreas(req,res) {
		//if(req.query.query) { query = JSON.parse(req.query.query); }
		Org.findOne({name: req.query.org})
			.then((org) => {
				if(org) {
					Career.distinct('area', {org: org._id})
						.then((areas) => {
							if(areas.length > 0) {
								areas.sort();
								res.status(200).json({
									'status': 200,
									'message': {
										'numAreas': areas.length,
										'details': areas
									}
								});
							} else {
								res.status(404).json({
									'status': 404,
									'message': 'No areas found'
								});
							}
						})
						.catch((err) => {
							sendError(res,err,'listAreas.Career -- Finding Areas --');
						});
				} else {
					res.status(404).json({
						'status': 404,
						'message': 'Org not found'
					});
				}
			})
			.catch((err) => {
				sendError(res,err,'listAreas.Career -- Finding Org --');
			});
	}
};


// Private Functions -----------------------------------------------------------

function sendError(res, err, section) {
	logger.error('Carrer controller -- Section: ' + section + '----');
	logger.error(err);
	res.status(500).json({
		'status': 500,
		'message': 'Error',
		'Error': err.message
	});
	return;
}
