//const winston = require('winston');
//require('winston-daily-rotate-file');
const mailjet = require('../shared/mailjet');

const devEmail		= 'arturocastro@aclsystems.mx';
const devName			= 'Desarrollo API alumno';
const templateID	= 321554;

const logger = require('../shared/winston-logger');

exports.sendError = function(res, err, controller,section,send,send_mail) {
	logger.error(controller, ' controller -- Section: ' + section + '---- Error message: ' + err.message);
	logger.error(err);
	if(!send_mail) {
		mailjet.sendMail(devEmail, devName, 'API error at '+ controller, templateID, '',500,controller, 'Section: ' + section + '----' + err.message);
	}
	if(!send) {
		res.status(500).json({
			'status': 500,
			'message': 'Error',
			'Error': err.message
		});
	}
	return;
};
