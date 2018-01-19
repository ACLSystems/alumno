const winston = require('winston');
const User = require('../src/users');
//const Org = require('../src/orgs');
//const OrgUnit = require('../src/orgUnits');
//const permissions = require('../shared/permissions');
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
		var key = (req.body && req.body.x_key) || req.headers['x-key'];
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: Please, give data to process'
			});
			return;
		}
		if(!req.body.code) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: course code is required'
			});
			return;
		}
		if(!req.body.title) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: course title is required'
			});
			return;
		}
		if(!req.body.categories) {
			res.status(406).json({
				'status': 406,
				'message': 'Error: course categories are required'
			});
			return;
		}
		var course = req.body;
		User.findOne({ name: key })
			.populate('org')
			.populate('orgUnit')
			.then((user) => {
				const date = new Date();
				course.own = {
					user: user.name,
					org: user.org.name,
					orgUnit: user.orgUnit.name
				};
				course.mod = {
					by: user.name,
					when: date,
					what: 'Course Creation'
				};
				course.perm = {
					users: [{ name: user.name, canRead: true, canModify: true, canSec: true }],
					roles: [{ name: 'isAuthor', canRead: true, canModify: false, canSec: false},
						{ name: 'isOrgContent', canRead: true, canModify: false, canSec: true}],
					orgs: [{ name: user.org.name, canRead: true, canModify: false, canSec: false}],
					orgUnits: [{ name: user.orgUnit.name, canRead: true, canModify: true, canSec: false}]
				};
				course.status = 'Draft';
			})
			.catch((err) => {
				logger.info('Course controller Create ----');
				logger.info(err);
				res.status(500).json({
					'status': 500,
					'message': 'Error:',
					'Error': err
				});
			});
	} // fin del create
};
