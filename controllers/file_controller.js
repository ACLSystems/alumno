const File = require('../src/files');
const winston = require('winston');

require('winston-daily-rotate-file');

var transport = new(winston.transports.DailyRotateFile) ({
	filename: './logs/log',
	datePattern: 'yyyy-MM-dd.',
	prepend: true,
	localTime: true,
	level: process.env.ENV === 'development' ? 'debug' : 'info'
});

var logger = new(winston.Logger) ({
	transports: [
		transport
	]
});


module.exports = {

	upload(req,res) {
		//		console.log(config.load_dir);
		const file = new File({
			name: req.file.originalname,
			mimetype: req.file.mimetype,
			filename: req.file.filename,
			path: req.file.path,
			size: req.file.size
		});
		file.save()
			.then((file) => {
				res.status(200).json({
					'status': 200,
					'message': 'File -' + req.file.originalname + '- was successfully uploaded',
					'file': file.filename,
					'fileId': file._id
				});
			})
			.catch((err) => {
				sendError(res,err,'upload -- Saving file --');
			});
	}, // upload

	download(req,res) {
		const file = req.query.filename;
		const fileid = req.query.fileid;
		if(fileid){
			File.findById(fileid)
				.then((file) => {
					res.setHeader('Content-disposition', 'attachment; filename=' + file.name);
					res.setHeader('Content-type', file.mimetype);
					res.download(file.path, file.filename);
				})
				.catch((err) => {
					sendError(res,err,'download -- Searching file --');
				});
		}
		if(file){
			File.findOne({name: file})
				.then((file) => {
					res.setHeader('Content-disposition', 'attachment; filename=' + file.name);
					res.setHeader('Content-type', file.mimetype);
					res.download(file.path, file.filename);
				})
				.catch((err) => {
					sendError(res,err,'download -- Searching file --');
				});
		}
	}

};


function sendError(res, err, section) {
	logger.info('Course controller -- Section: ' + section + '----');
	logger.info(err);
	res.status(500).json({
		'status': 500,
		'message': 'Error',
		'Error': err.message
	});
	return;
}
