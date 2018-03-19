const mailjet = require ('node-mailjet')
	.connect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);
const request = mailjet.post('send', {'version': 'v3.1'});

const fromEmail = 'soporte@superatemexico.com';
const fromName = 'Superate Mexico';

exports.sendMail = function(toEmail,toName,subject,templateID,link,errNum,controller,message) {
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
	if(templateID === 310518) {
		mail_message.Variables = {
			'Nombre': toName,
			'confirmation_link': link
		};
	}
	if(templateID === 311647) {
		mail_message.Variables = {
			'Nombre': toName,
			'confirmation_link': link
		};
	}
	if(templateID === 321554) {
		mail_message.Variables = {
			'errNum': errNum,
			'controller': controller,
			'message': message
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
