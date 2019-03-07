const express = require('express');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();

const dir 									= '/Users/Arturo/data';
const fileSize 							= 1048576;
const files 								= 1;

var upload = multer({
	dest: dir,
	limits: {
		fileSize: fileSize,
		files: files
	}
});



router.post('/file', upload.single('file'), (req,res,next) => {
	console.log(req.file);
	const file 	= new File({
		name		: req.file.originalname,
		mimetype: req.file.mimetype,
		filename: req.file.filename,
		path		: '/' + file_dir + '/' + dir1 + '/' + dir2,
		size		: req.file.size
	});
	const localFile = fs.readFileSync(ordir + '/' + file.filename);
	console.log(localFile);
});

module.exports = router;
