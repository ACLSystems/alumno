const mailjet = require ('node-mailjet')
	.connect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);
const request = mailjet.post('send', {'version': 'v3.1'});

const fromEmail = 'no-reply@aclsystems.mx';
const fromName = 'Superate Mexico';
//const TemplateID = 310518;

exports.sendMail = function(toEmail,toName,subject,templateID,link) {
	return new Promise(function(resolve,reject) {
		request.request({
			'Messages':[
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
					'Variables': {
						'Nombre': toName,
						'confirmation_link': link
					}
				}
			]
		})
			.then((result) => {
				resolve(result.body.Messages[0].Status);
			})
			.catch((err) => {
				reject(err.statusCode + ': ' + err.response.res.statusMessage);
			});
	});
};
