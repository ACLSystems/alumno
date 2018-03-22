const mailjet = require ('node-mailjet')
	.connect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);
const request = mailjet.post('send', {'version': 'v3.1'});

const fromEmail = 'soporte@superatemexico.com';
const fromName = 'Superate Mexico';

exports.sendMail = function(toEmail,toName,subject,templateID,param1,param2,param3,param4) {
	var mail_message =
		{
			'From': {
				'Email': fromEmail,
				'Name': fromName
			},
			'To': [
				{
					'Email': toEmail,
					'Name': toName
				}
			],
			'TemplateID': templateID,
			'TemplateLanguage': true,
			'Subject': subject,
			'TemplateErrorDeliver': true,
			'TemplateErrorReporting': {
				'Email': 'arturocastro@aclsystems.mx',
				'Name': 'Air traffic control'
			}
		};
	if(templateID === 310518 || templateID === 339990) { // Plantilla para enviar registro de usuario
		mail_message.Variables = {
			'Nombre': toName,
			'confirmation_link':param1 // link
		};
	}
	if(templateID === 311647) {			// Plantilla para recuperación de contraseña
		mail_message.Variables = {
			'Nombre': toName,
			'confirmation_link':param1 // link
		};
	}
	if(templateID === 339994) {	// Plantilla para notificar registro de alumno en grupo
		mail_message.Variables = {
			'Nombre': toName,
			'confirmation_link':param1, // link
			'curso':  param2 						// curso
		};
	}
	if(templateID === 321554) { // Plantilla para reportar errores 500 en el API
		mail_message.Variables = {
			'errNum': param2,						// errNum
			'controller': param3,				// controller
			'message': param4						// message
		};
	}
	return new Promise(function(resolve,reject) {
		request.request({'Messages': [mail_message]})
			.then((result) => {
				resolve(result.body.Messages[0].Status);
			})
			.catch((err) => {
				reject(err.statusCode + ': ' + err.response.res.statusMessage);
			});
	});
};
