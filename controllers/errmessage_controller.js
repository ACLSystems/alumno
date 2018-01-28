//const version = require('../shared/version');

module.exports = {
	errorCodes(req,res){
		const errcode = parseInt(req.query.errcode);
		switch (errcode) {
		case 51:
			res.status(200).json({
				'status': 200,
				'message': {
					'errorCode': 51,
					'message': 'Please, give data by query to process',
					'explain': 'API received request without params to process',
					'recomendation': 'Send a GET request and include an errcode param with a number as a value with the error code you want to explain'
				}
			});
			break;
		case 52:
			res.status(200).json({
				'status': 200,
				'message': {
					'errorCode': 52,
					'message': 'Data given in errcode param is not a number',
					'explain': 'API received request with errcode param, but value is not a number. API needs a number to process',
					'recomendation': 'Send a GET request and include an errcode param with a number as a value with the error code you want to explain'
				}
			});
			break;

		case 1700:
			res.status(200).json({
				'status': 200,
				'message': {
					'errorCode': 1700,
					'message': 'Please, give data by body to process',
					'explain': 'API received a request to user registration, but without data to process',
					'recomendation': 'Send a POST request including a valid JSON document to process the user registration'
				}
			});
			break;

		default:
			res.status(404).json({
				'status': 404,
				'message': 'Error code not found'
			});
		} // switch
	} //errorCodes
};
