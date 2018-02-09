const mailjet = require('node-mailjet')
	.connect('52a7fae539433873cf9a7e0910f101ec', '12cca867cddbbf1d5f7c8927cdf158c4');

const sendMail = mailjet.post('send');

//const sendMail = require('../shared/mailjet');

const mail = {
	'FromEmail': 'no-reply@aclsystems.mx',
	'FromName': 'Superate Mexico',
	'Recipients': [
		{
			'Email': 'arturocastro@aclsystems.mx',
			'Name': 'Elmer Homero'
		}
	],
	'Subject': 'Prueba desde Node 3',
	'TemplateId': 310505,
	'TemplateLanguage': true,
	'Variables': {
		'Nombre': 'Elmer Homero'
	}
};

sendMail.request(mail)
	.then((result) => {
		console.log(result.response.res.statusCode);
		console.log(result.response.res.statusMessage);
	})
	.catch((err) => {
		console.log(err.statusCode);
		console.log(err.response.res.statusMessage);
	});
