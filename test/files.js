const fs = require('fs');
const http = require('http');

http.createServer(function(req,res) {
	fs.readFile('./hello.html', function(err,data) {
		res.writeHead(200, {'Content-type': 'text/html'});
		res.write(data);
		res.end();
	});
}).listen(8080);
