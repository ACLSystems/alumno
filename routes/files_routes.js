// const multer = require('multer');
const FileController = require('../controllers/file_controller'					);

/**
 * CONFIG
 */
/** @const {string} - directorio local para almacenar archivos */
// const dir 								= process.env.DBX_ORDIR || '/usr/src/data/files' ;
/** @const {number} - tamaño máximo de archivos */
// const fileSize 						= parseInt(process.env.DBX_FILESIZE) || 1048576;
// /** @const {number} - número máximo de archivos por transacción */
// const files 							= parseInt(process.env.DBX_FILES) || 1;
// /** @const {string} - tamaño máximo del cuerpo JSON a procesar (ajustar) */


/** MULTER */
// var storage = multer.memoryStorage();
// var upload = multer({
// 	storage: storage,
// 	limits: {
// 		fileSize: fileSize,
// 		files: files
// 	}
// });

module.exports = (app) => {

	// RUTAS ---------------------------------------------------------------------------------
	// app.post('/api/v1/file/upload', 	upload.single('file'), FileController.upload);
	app.get ('/api/v1/file/download', FileController.download);
	// app.post('/api/v1/user/image', upload.single('file'), FileController.imageUpload);
	app.get ('/api/v1/user/image', FileController.imageDownload);

};
