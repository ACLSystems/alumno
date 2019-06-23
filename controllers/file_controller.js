const File = require('../src/files');
const fs = require('fs');
const dropbox = require('dropbox').Dropbox;
const Err = require('../controllers/err500_controller');

// Este módulo usa "Multer" y la definición está en routes/routes.js

module.exports = {

	upload(req,res) {
		const key_user 	= res.locals.user;
		const filesize = 1048576;
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
		// El directorio se formará en dropbox con la siguiente estructura:
		// /file_dir/dir1/dir2 bajo la carpeta destinada en Dropbox
		// ordir es el directorio local
		var dir1 					= 'base1';
		var dir2 					= 'base2';
		var ordir 			= process.env.ORDIR;
		var file_dir		= process.env.NODE_ENV;
		var accessToken	= process.env.DBX_TOKEN;

		if(!file_dir) {
			file_dir = 'production';
		}
		if(!ordir) {
			ordir = '/usr/src/app/files';
		}
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
		if(req.file.size > filesize) {
			req.status(200).json({
				'status': 200,
				'message': 'File size is bigger than ' + filesize + ' bytes'
			});
			return;
		}
		const file 	= new File({
			name		: req.file.originalname,
			mimetype: req.file.mimetype,
			filename: filename,
			path		: '/' + file_dir + '/' + dir1 + '/' + dir2,
			size		: req.file.size
		});
		var pretty = JSON.stringify(file,null,2);

		file.save()
			.then((file) => {
				const localFile = fs.readFileSync(ordir + '/' + file.filename);
				require('isomorphic-fetch');
				//const fetch = require('isomorphic-fetch');
				//new dropbox({ accessToken: accessToken, fetch: fetch })
				new dropbox({ accessToken: accessToken})
					.filesUpload({path: file.path + '/' + file.filename, contents: localFile})
					.then(() => {
						res.status(200).json({
							'message'	: 'File -' + req.file.originalname + '- was successfully uploaded',
							'file'		: file.filename,
							'filepath': file.path,
							'fileId'	: file._id
						});
						return;
					})
					.catch((err) => {
						Err.sendError(res,err,'file_controller','upload dropbox -- uploading File -- User: ' + key_user.name + ' filepath: ' + file.path + ' filename: '+ file.filename +' req.file: ' + pretty + ' TKN: ' + accessToken);
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
		const file 			= req.query.filename;
		const fileid 		= req.query.fileid;
		var query 			= {};
		var properties	= false;
		if(req.query.properties && req.query.properties.toLowerCase() === 'true') {
			properties 		= true;
		}
		var link				= false;
		if(req.query.link && req.query.link.toLowerCase() === 'true') {
			link 		= true;
		}
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
					const accessToken	= process.env.DBX_TOKEN;
					var ordir = process.env.ORDIR;
					require('isomorphic-fetch');
					var dbx = new dropbox({ accessToken: accessToken});
					if(properties){
						res.status(200).json({
							status	: 200,
							message	: {
								name		: file.name,
								mimetype: file.mimetype,
								filename: file.filename,
								path		: file.path,
								size		: file.size
							}
						});
					} else if(link){
						dbx.sharingListSharedLinks({path: file.path + '/' + file.filename})
							.then((dbxshared) => {
								var dbxlink = '';
								if(dbxshared && dbxshared.links && dbxshared.links.length > 0) {
									dbxshared.links.forEach(function(link) {
										if(link['.tag'] === 'file') {
											dbxlink = parseDropboxUrl(link.url);
										}
									});
									if(dbxlink === ''){ // Este pedazo de código corre porque hay shared links pero del directorio padre
										dbx.sharingCreateSharedLinkWithSettings({path: file.path + '/' + file.filename})
											.then((dbxlink) => {
												if(dbxlink) {
													res.status(200).json({
														status	: 200,
														message : 'Shared link created',
														file	: {
															url					: parseDropboxUrl(dbxlink.url),
															name				: file.filename,
															mimetype		: file.mimetype,
															originalName:	file.name,
															size				: file.size
														}
													});
												} else {
													res.status(200).json({
														status	: 400,
														message	: 'No dropbox link could create'
													});
												}
											})
											.catch((err) => {
												Err.sendError(res,err,'file_controller','download -- Creating shared link in dropbox --');
											});
									} else {
										res.status(200).json({
											status	: 200,
											message	: 'Shared link',
											file 		: {
												url	: dbxlink,
												name				: file.filename,
												mimetype		: file.mimetype,
												originalName:	file.name,
												size				: file.size
											}
										});
									}
								} else { // Este corre porque no hay shared links del archivo o del directorio padre
									dbx.sharingCreateSharedLinkWithSettings({path: file.path + '/' + file.filename})
										.then((dbxlink) => {
											if(dbxlink) {
												res.status(200).json({
													status	: 200,
													message : 'Shared link created',
													file		: {
														url	: parseDropboxUrl(dbxlink.url),
														name				: file.filename,
														originalName:	file.name,
														size				: file.size
													}
												});
											} else {
												res.status(200).json({
													status	: 400,
													message	: 'No dropbox link could create'
												});
											}
										})
										.catch((err) => {
											Err.sendError(res,err,'file_controller','download -- Creating shared link in dropbox --');
										});
								}
							})
							.catch((err) => {
								Err.sendError(res,err,'file_controller','download -- Searching File in dropbox --');
							});
					} else {
						if(!ordir) {
							ordir = '/usr/src/app/files';
						}
						if(fs.existsSync(ordir + '/' + file.filename)) {
							res.set({'Content-type': file.mimetype});
							res.download(ordir + '/' + file.filename,file.name);
						} else {
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

//private functions

function parseDropboxUrl(dbx) {
	var regex = /\?dl=0/gi;
	return dbx.replace(regex,'?dl=1');
}
