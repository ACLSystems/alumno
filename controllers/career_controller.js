const winston = require('winston');
const User = require('../src/users');
const Career = require('../src/careers');
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

	create(req,res) {
		const key = req.headers.key;
		var career_req = req.body;
		var org = '';
		User.findOne({ name: key })
			.populate('org')
			.populate('orgUnit')
			.then((key_user) => {
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
			})
			.catch((err) => {
				sendError(res,err,'create.Career -- Finding User --');
			});
	}, // create

	massiveCreation(req,res) {
		const key = req.headers.key;
		var careers_req = req.body;
		var careers_length = req.body.length;
		User.findOne({ name: key })
			.populate('org')
			.populate('orgUnit')
			.then((key_user) => {
				Career.find({ org: key_user.org._id})
					.then((careers) => {
						var careerObj = {};
						var car_inserted = new Array();
						var car_updated = new Array();
						careers_req.forEach(function(career) {
							careerObj = careers.find(function(careerObj) { return careerObj.name === career.name});
						});
					})
			})
			.catch((err) => {
				sendError(res,err,'create.Career -- Finding User --');
			});
	} // massiveCreation

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
