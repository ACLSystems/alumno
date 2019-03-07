const request = require('../shared/mailjet');

const toEmail = process.argv[2];
const toName = process.argv[3];
const subject = process.argv[4];

request.sendMail(toEmail,toName,subject)
	.then((result) => {
		console.log(result); // eslint-disable-line
	})
	.catch((err) => {
		console.log(err);		// eslint-disable-line
	});
