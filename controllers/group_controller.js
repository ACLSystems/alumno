const winston = require('winston');
const User = require('../src/users');
//const Org = require('../src/orgs');
//const OrgUnit = require('../src/orgUnits');
const Course = require('../src/courses');
const Group = require('../src/groups');
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
		const key = req.headers.key;
		var group = req.body;
		User.findOne({ name: key })
			.populate('org')
			.populate('orgUnit')
			.then((key_user) => {
				Course.findOne({ _id: group.course })
					.then((course) => {
						if(course) {
							const date = new Date();
							group.org = key_user.org._id,
							group.orgUnit = key_user.orgUnit._id,
							group.own = {
								user: key_user.name,
								org: key_user.org.name,
								orgUnit: key_user.orgUnit.name
							};
							group.mod = {
								by: key_user.name,
								when: date,
								what: 'Group Creation'
							};
							group.perm = {
								users: [{ name: key_user.name, canRead: true, canModify: true, canSec: true }],
								roles: [{ name: 'isInstructor', canRead: true, canModify: false, canSec: false},
									{ name: 'isOrgContent', canRead: true, canModify: false, canSec: true}],
								orgs: [{ name: key_user.org.name, canRead: true, canModify: false, canSec: false}],
								orgUnits: [{ name: key_user.orgUnit.name, canRead: true, canModify: true, canSec: false}]
							};
							if(!group.instructor) {
								group.instructor = key_user._id;
							}
							group.roster = new Array();
							Group.create(group)
								.then((grp) => {
									res.status(200).json({
										'status': 200,
										'message': 'Group -' + grp.code + '- created'
									});
								})
								.catch((err) => {
									if(err.message.indexOf('E11000 duplicate key error collection') !== -1 ) {
										res.status(406).json({
											'status': 406,
											'message': 'Error -: group -' + group.code + '- already exists'
										});
									} else {
										sendError(res,err,'create.Group -- creating Group --');
									}
								});
						} else {
							res.status(404).json({
								'status': 404,
								'message': 'Error -: Course -'+ group.course + '- not found'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'create.Group -- Finding Course --');
					});
			})
			.catch((err) => {
				sendError(res,err,'create.Group -- Finding User --');
			});
	}, // create

	createRoster(req,res){
		const key = req.headers.key;
		var roster = req.body;
		User.findOne({ name: key })
			.then(() => {
				Group.findOne({ code: roster.code })
					.then((group) => {
						if(group) {
							roster.roster.forEach(function(student) {
								group.roster.push({status: 'pending'});
								group.students.push(student);
							});
							group.save()
								.then(() => {
									res.status(200).json({
										'status': 200,
										'message': 'Roster created'
									});
								})
								.catch((err) => {
									sendError(res,err,'createRoster.Group -- Saving Group --');
								});
						} else {
							res.status(404).json({
								'status': 404,
								'mesage': 'Group -' + roster.code + '- not found'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'createRoster.Group -- Finding Group --');
					});
			})
			.catch((err) => {
				sendError(res,err,'createRoster.Group -- Finding User --');
			});
	}, //createRoster

	listRoster(req,res) {
		const key = req.headers.key;
		var roster = req.query;
		User.findOne({ name: key })
			.then(() => {
				Group.findOne({ code: roster.code })
					.populate('instructor')
					.populate('orgUnit')
					.populate({
						path: 'roster.student',
						model: 'users'
					})
					.then((group) => {
						if(group) {
							var send_group = {
								code: group.code,
								name: group.name,
								instructor: group.instructor.name,
								beginDate: group.beginDate,
								endDate: group.endDate,
								orgUnit: group.orgUnit.name,
								roster: group.roster
							};

							var students = new Array();
							group.roster.forEach(function(s) {

								students.push({
									id: s.id,
									username: s.name,
									name: s.student.person.name,
									fatherName: s.student.person.fatherName,
									motherName: s.student.person.motherName,
									email: s.student.person.email,
									career: s.student.career,
									term: s.student.term
								});
							});
							send_group.roster = students;

							res.status(200).json({
								'status': 200,
								'message': send_group
							});
						} else {
							res.status(404).json({
								'status': 404,
								'mesage': 'Group -' + roster.code + '- not found'
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'createRoster.Group -- Finding Group --');
					});
			})
			.catch((err) => {
				sendError(res,err,'createRoster.Group -- Finding User --');
			});
	}, //listRoster

	mygroups(req,res) {
		const key = req.headers.key;
		User.findOne({$or: [{name: key},{'person.email': key}]})
			.then((key_user) => {
				Group.find({students: key_user._id})
					.populate('course')
					.populate('instructor')
					.then((groups) => {
						var send_groups = new Array();
						groups.forEach(function(group) {
							var students = group.students;
							var myStudent = students.findIndex(myStudent => myStudent == key_user._id + '');
							send_groups.push({
								code: group.code,
								name: group.name,
								course: group.course.title,
								courseCode: group.course.code,
								instructor: group.instructor.person.name + ' ' + group.instructor.person.fatherName,
								beginDate: group.beginDate,
								endDate: group.endDate,
								myStatus: group.roster[myStudent].status
							});
						});
						if(groups.length === 0) {
							res.status(200).json({
								'status': 200,
								'message': 'No groups found'
							});
						} else if (groups.length === -1) {
							res.status(500).json({
								'status': 500,
								'message': 'Error in collection. Please contact Admin'
							});
						} else {
							res.status(200).json({
								'status': 200,
								'message': {
									'numgroups': groups.length,
									'groups': send_groups
								}
							});
						}
					})
					.catch((err) => {
						sendError(res,err,'mygroups.Group -- Finding Groups --');
					});
			})
			.catch((err) => {
				sendError(res,err,'mygroups.Group -- Finding User --');
			});
	} // mygroups
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
