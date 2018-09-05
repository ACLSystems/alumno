const mailjet 	= require('../shared/mailjet'	);
const ErrorReg	= require('../src/errors'			);

const devEmail		= 'arturocastro@aclsystems.mx';
const devName			= 'Desarrollo API alumno';
const templateID	= 321554;

const logger = require('../shared/winston-logger');

exports.sendError = function(res,errorObj,controller,section,send,send_mail,message) {
	const stringError = errorObj.toString();
	var error = new ErrorReg({
		error 			: stringError,
		errorType		: errorObj.name,
		controller	:	controller,
		section			: section,
		stack				: errorObj.stack,
		info				: message
	});
	error.save()
		.then((errObj) => {
			logger.error(`id: ${errObj._id}\ncontroller: ${controller}\nSection: ${section}\nStringError: ${stringError}\nStack: ${errorObj.stack}`);
			if(!send_mail) {
				mailjet.sendMail(devEmail, devName, `API error at ${controller}`, templateID, '',500,controller,process.env.NODE_ENV,errObj._id,errObj.error,errObj.stack,errObj.section,message);
			}
			if(!send) {
				res.status(500).json({
					'status'	: 500,
					'message'	: 'Error',
					'Error'		: stringError,
					'id'			: errObj._id
				});
			}
		})
		.catch((otroError) => {
			console.log(otroError); //eslint-disable-line
		});
	return;
};
