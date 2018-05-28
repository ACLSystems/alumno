const File = require('../src/files');
//const winston = require('winston');
const fs = require('fs');
const dropbox = require('dropbox').Dropbox;
const Err = require('../controllers/err500_controller');

// Este módulo usa "Multer" y la definición está en routes/routes.js

module.exports = {

	upload(req,res) {
		if(!req.file) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1440: Please, give file to process'
			});
			return;
		}
		if (!req.query.dir1) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1432: Please, give dir1 by query to process'
			});
			return;
		}
		if (!req.query.dir2) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1432: Please, give dir2 by query to process'
			});
			return;
		}
		var dir1 					= 'base1';
		var dir2 					= 'base2';
		const ordir 			= process.env.ORDIR;
		const file_dir		= process.env.NODE_ENV;
		const accessToken	= process.env.DBX_TOKEN;
		if(req.query.dir1) {
			dir1 = req.query.dir1;
		}
		if(req.query.dir2) {
			dir2 = req.query.dir2;
		}
		var filename = req.file.filename;
		if(req.file && !req.file.filename) {
			filename = req.file.originalname;
		}
		const file 	= new File({
			name		: req.file.originalname,
			mimetype: req.file.mimetype,
			filename: filename,
			path		: '/' + file_dir + '/' + dir1 + '/' + dir2,
			size		: req.file.size
		});

		file.save()
			.then((file) => {
				const localFile = fs.readFileSync(ordir + '/' + file.filename);
				require('isomorphic-fetch');
				new dropbox({ accessToken: accessToken})
					.filesUpload({path: file.path + '/' + file.filename, contents: localFile})
					.then(() => {
						res.status(200).json({
							'status'	: 200,
							'message'	: 'File -' + req.file.originalname + '- was successfully uploaded',
							'file'		: file.filename,
							'filepath': file.path,
							'fileId'	: file._id
						});
					})
					.catch((err) => {
						Err.sendError(res,err,'file_controller','upload dropbox -- uploading File --');
					});
			})
			.catch((err) => {
				Err.sendError(res,err,'file_controller','upload -- Saving File --');
			});

	}, // upload

	download(req,res) {
		if(!req.query) {  // GET
			res.status(406).json({
				'status': 406,
				'message': 'Error 1441: Please, give data by query to process'
			});
			return;
		}
		if (!req.query.filename && !req.query.fileid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1442: Please, give fileid or filename by query to process'
			});
			return;
		}
		const file 		= req.query.filename;
		const fileid 	= req.query.fileid;
		var query 		= {};
		if(fileid){
			if (fileid.match(/^[0-9a-fA-F]{24}$/)) {
				query = { _id: fileid };
			} else {
				res.status(406).json({
					'status'	: 406,
					'message'	: 'File ID is not a valid ObjectId string'
				});
				return;
			}
		}
		if(file){
			query = {name: file};
		}
		File.findOne(query)
			.then((file) => {
				if(file) {
					const ordir = process.env.ORDIR;
					if(fs.existsSync(ordir + '/' + file.filename)) {
						res.set({'Content-type': file.mimetype});
						res.download(ordir + '/' + file.filename,file.name);
					} else {
						const accessToken	= process.env.DBX_TOKEN;
						require('isomorphic-fetch');
						var dbx = new dropbox({ accessToken: accessToken});
						dbx.filesDownload({path: file.path + '/' + file.filename})
							.then((dbxFile) => {
								fs.writeFileSync(ordir + '/'+ dbxFile.name, dbxFile.fileBinary, 'binary',function (err) {Err.sendError(res,err,'file_controller','download -- downloading file in dropbox --');});
								if(fs.existsSync(ordir + '/' + file.filename)) {
									res.set({'Content-type': file.mimetype});
									res.download(ordir + '/' + file.filename,file.name);
								}
							})
							.catch((err) => {
								Err.sendError(res,err,'file_controller','download -- Searching File in dropbox --');
							});
					}
				} else {
					res.status(404).json({
						'status'	: 404,
						'message'	: 'File not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'file_controller','download -- Searching File --');
			});

	}
};

/*
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
*/
