const StatusCodes = require('http-status-codes');
const mailjet 	= require('../shared/mailjet'	);
const ErrorReg	= require('../src/errors'			);
const version 	= require('../version/version'	);
const logger = require('../shared/winston-logger');

/**
	* CONFIG
	*/
/** @const {string} - ambiente */
const instanceName = process.env.NODE_INSTANCE_NAME;
/** @const {string} - ambiente */
const environment = process.env.NODE_ENV;
/** @const {string}	- correo al que llegan notificaciones (grupo de desarrollo) */
const devEmail		= process.env.NODE_DEV_EMAIL;
/** @const {string}	- nombre del grupo de desarrollo */
const devName 		= process.env.NODE_DEV_NAME;
/** @const {number}	- plantilla a usar para enviar notificaciones por correo */
const templateID	= parseInt(process.env.MJ_TEMPLATE_MAILERROR);

exports.sendError = function(res,errorObj,controller,section,send,send_mail,message) {
	const stringError = errorObj.toString();
	var error = new ErrorReg({
		error 			: stringError,
		errorObj		: JSON.stringify(errorObj),
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
				let subject = `API error at ${controller}`;
				let variables = {
					'errNum': StatusCodes.INTERNAL_SERVER_ERROR,					// errNum
					'controller': controller,			// controller
					'section': section,				// section,
					'instance': instanceName, // instancia
					'env': environment,						// environment
					'id': errObj._id,							// id
					'stringError': errObj.error,		// stringError
					'errorStack': errObj.stack,			// errorStack
					'message': message					// mensaje
				};
				mailjet.sendMail(devEmail,devName,subject,templateID,variables);
			}
			if(!send) {
				res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'message'	: 'Error',
					'Error'		: stringError,
					'app'			: version.app,
					'errorObj': errObj
				});
			}
		})
		.catch((otroError) => {
			console.log(otroError); //eslint-disable-line
		});
	return;
};
