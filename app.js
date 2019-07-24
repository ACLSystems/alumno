/* eslint no-unused-vars: "error" */
const express 						= require('express');
const multer 							= require('multer');
const bodyParser 					= require('body-parser');
const bodyParserJsonError = require('./shared/validatejson');
const helmet 							= require('helmet');
// const cors 								= require('cors');
const db 									= require('./src/db'); // eslint-disable-line no-unused-vars
const cache 							= require('./src/cache'); // eslint-disable-line no-unused-vars
const routes 							= require('./routes/routes');
const FileController 			= require('./controllers/file_controller');
const app 								= express();

/**
 * CONFIG
 */
/** @const {string} - directorio local para almacenar archivos */
const dir 								= process.env.DBX_ORDIR || '/usr/src/data/files' ;
/** @const {number} - tamaño máximo de archivos */
const fileSize 						= parseInt(process.env.DBX_FILESIZE) || 1048576;
/** @const {number} - número máximo de archivos por transacción */
const files 							= parseInt(process.env.DBX_FILES) || 1;
/** @const {string} - tamaño máximo del cuerpo JSON a procesar (ajustar) */
const jsonBodyLimit				= process.env.NODE_JSONBODYLIMIT || '50mb';
// var whitelist = process.env.WHITELIST.split(' ') || '*';

var upload = multer({
	dest: dir,
	limits: {
		fileSize: fileSize,
		files: files
	}
});

app.disable('x-powered-by');
// Encabezados CORS
app.use(function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*'); // restrict it to the required domain
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
	if (req.method == 'OPTIONS') {
		res.status(200).end();
	} else {
		next();
	}
});

// Encabezados de seguridad
app.use(helmet());
// API para carga de archivos. Esta ruta usa Multer
// por lo que no debe pasar por el bodyParser
app.post('/api/v1/file/upload', upload.single('file'), FileController.upload);
// Para el resto de APIs validaciones del cuerpo
// Esto solo si en un momento dado necesitamos un cuerpo URL encoded
// app.use(bodyParser.urlencoded({extended:true, limit: '10mb'}));
app.use(bodyParser.json({limit: jsonBodyLimit}));
app.use(bodyParserJsonError());
routes(app);

// If no route is matched by now, it must be a 404
//app.use(function(req, res, next) {
app.use(function(req, res) {
	res.status(404).json({
		'message': 'Error 100: API not found'
	});
});


module.exports = app;
