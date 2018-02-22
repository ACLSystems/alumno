const winston = require('winston');
require('winston-daily-rotate-file');
const mailjet = require('../shared/mailjet');

const devEmail		= 'arturocastro@aclsystems.mx';
const devName			= 'Desarrollo API alumno';
const templateID	= 321554;

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



exports.sendError = function(res, err, controller,section,send,send_mail) {
	logger.info(controller, ' controller -- Section: ' + section + '----');
	logger.info(err);
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
