const Default = require('../src/default');
const mailjet = require ('node-mailjet')
	.connect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);
const request = mailjet.post('send', {'version': 'v3.1'});


/**
	* CONFIG
	* Todo se extrae de variables de Ambiente
	*/
/** @const {string} - Correo FROM - correo de donde proviene la notificación */
const fromEmail = process.env.MJ_FROMEMAIL;
/** @const {string} - Nombre FROM - nombre del que proviene la notificación */
const fromName = process.env.MJ_FROMNAME;
/** @const {number} - plantilla para notificar al tutor sobre la asignación de un grupo */
// const genericTemplate 					= parseInt(process.env.MJ_TEMPLATE_GENERIC);
const defaultModule	= 'mail';
const code 		= 'genericMailTemplate-01';

exports.sendMail = function(toEmail,toName,subject,templateID,variables) {
	if(!toEmail || !toName) {
		console.log('No está definido el destinatario de correo');
		return;
	}
	if(!templateID) {
		console.log('No está definida la plantilla de correo');
		return;
	}
	templateID = (typeof templateID != 'number') ? parseInt(templateID): templateID;
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
			},
			'Variables': variables
		};
	// console.log(mail_message);

	// Regresamos la promesa
	return new Promise(function(resolve) {
		request.request({'Messages': [mail_message]})
			.then((result) => {
				resolve(result.body.Messages[0].Status);
			})
			.catch((err) => {
				//reject(err.statusCode + ': ' + err.response.res.statusMessage);
				console.log('Error(es) de mailjet:');
				if(err.response &&
					err.response.res &&
					err.response.res.text
				){
					let text = JSON.parse(err.response.res.text);
					console.log(JSON.stringify(text,null,2));
				}
				console.log(mail_message);
				return;
			});
	});
};

exports.sendGenericMail =
async function(toEmail,toName,subject,
	message,instance) {
	const genericTemplate = await Default.findOne({module: defaultModule, code, instance});
	var mail_message = {
		// 'From': {
		// 	'Email': fromEmail,
		// 	'Name': fromName
		// },
		'To': [
			{
				'Email': toEmail,
				'Name': toName
			}
		],
		'TemplateID': +genericTemplate.config,
		'TemplateLanguage': true,
		'Subject': subject,
		'TemplateErrorDeliver': true,
		'TemplateErrorReporting': {
			'Email': 'arturocastro@aclsystems.mx',
			'Name': 'Air traffic control'
		},
		'Variables': {
			'message': message,
			'name': toName,
			'subject': subject
		}
	};
	// console.log(mail_message);
	// Regresamos la promesa
	return new Promise(function(resolve) {
		request.request({'Messages': [mail_message]})
			.then((result) => {
				resolve(result.body.Messages[0].Status);
			})
			.catch((err) => {
				//reject(err.statusCode + ': ' + err.response.res.statusMessage);
				console.log('Error(es) de mailjet:');
				if(err.response &&
					err.response.res &&
					err.response.res.text
				){
					let text = JSON.parse(err.response.res.text);
					console.log(JSON.stringify(text,null,2));
				}
				console.log(mail_message);
				return;
			});
	});
};
