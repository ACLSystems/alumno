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


exports.sendMail = function(toEmail,toName,subject,templateID,variables) {
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
