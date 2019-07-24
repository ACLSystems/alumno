const version = require('../version/version');
const bcrypt = require('bcrypt-nodejs');

module.exports = {
	greeting(req, res) {
		res.status(200).json({
			app: version.app,
			version: version.version
		});
	},

	perf(req,res) {
		var 	unencrypted = 'part';
		var 	encrypted   = unencrypted;
		const loop 				= 100;
		var 	i 					= 0;
		res.writeHead(200,{'Content-type':'text/html'});
		while (i < loop) { // tic-tac
			encrypted = encryptPass(unencrypted);
			sendResponse(res,'<b>'+ i + '</b>: \t' + unencrypted + '\t' + encrypted + '<br>');
			i++;
		}
	}
};

function sendResponse(res,content) {
	res.write(content);
}

function encryptPass(obj) {
	var salt = bcrypt.genSaltSync(10);
	obj = bcrypt.hashSync(obj, salt);
	return obj;
}
