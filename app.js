/* eslint no-unused-vars: "error" */
const express 						= require('express');
const multer 							= require('multer');
const bodyParser 					= require('body-parser');
const bodyParserJsonError = require('./shared/validatejson');
const helmet 							= require('helmet');
const StatusCodes 				= require('http-status-codes');
// const cors 								= require('cors');
const db 									= require('./src/db'); // eslint-disable-line no-unused-vars
const cache 							= require('./src/cache'); // eslint-disable-line no-unused-vars
const FileController 			= require('./controllers/file_controller');
// const routes 							= require('./routes/routes');
const publicRoutes				= require('./routes/public_routes');
const exportRoutes 				= require('./routes/export_routes');
const authorRoutes 				= require('./routes/author_routes');
const userRoutes					= require('./routes/user_routes');
const filesRoutes					= require('./routes/files_routes');
const instructorRoutes 		= require('./routes/instructor_routes');
const adminRoutes 				= require('./routes/admin_routes');
const orgAdmRoutes 				= require('./routes/orgAdm_routes');
const supervisorRoutes 		= require('./routes/supervisor_routes');
const requesterRoutes 		= require('./routes/requester_routes');
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

/** MULTER */
var upload = multer({
	dest: dir,
	limits: {
		fileSize: fileSize,
		files: files
	}
});

app.disable('x-powered-by');
/** Encabezados CORS */
app.use(function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*'); // restrict it to the required domain
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,Authorization');
	if (req.method == 'OPTIONS') {
		res.status(StatusCodes.OK).end();
	} else {
		next();
	}
});

/** Encabezados de seguridad */
app.use(helmet());

/**
	*	Auth Middleware - Esto revisa si tenemos un token válido
	* Solo peticiones que comiencen con /api/v1/* serán revisadas
	* cualquier otro URL que no tenga este patrón debería ser
	* evitado a menos que estemos seguros que no requiere
	* autenticación
	*/

app.all	('/api/v1/*', [require('./middleware/validateRequest')]);

/**
	* API para carga de archivos. Esta ruta usa Multer
 	* por lo que no debe pasar por el bodyParser
	*/
app.post('/api/v1/file/upload', upload.single('file'), FileController.upload);

app.post('/api/v1/user/image', upload.single('file'), FileController.imageUpload);

/**  Para el resto de APIs validaciones del body */

/** Esto solo si en un momento dado necesitamos un cuerpo URL encoded */
// app.use(bodyParser.urlencoded({extended:true, limit: '10mb'}));

app.use(bodyParser.json({limit: jsonBodyLimit}));
app.use(bodyParserJsonError());

/**
	* RUTAS
	*/
//routes(app);
filesRoutes(app);
userRoutes(app);
instructorRoutes(app);
authorRoutes(app);
publicRoutes(app);
exportRoutes(app);
supervisorRoutes(app);
adminRoutes(app);
orgAdmRoutes(app);
requesterRoutes(app);

/**
	* Si no hay rutas que matchen debemos notificar que no
	* existen RUTAS
	* NO USAMOS next() porque ya no debería haber más middleware a partir de aquí
	*/
//app.use(function(req, res, next) {
app.use(function(req, res) {
	res.status(StatusCodes.NOT_FOUND).json({
		'message': `Error: API solicitada no existe: ${req.method} ${req.url}`
	});
});

module.exports = app;
