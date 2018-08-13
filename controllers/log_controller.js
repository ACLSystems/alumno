const fs 			= require('fs');
const moment 	= require('moment');
const path		=	'./logs/';
const Err 		= require('./err500_controller');
const logger 	= require('../shared/winston-logger');

module.exports = {

	read(req,res) {
		const lines = 0 || req.query.lines;
		const todayLog = path + 'alumno-' + moment().format('YYYY-MMM-DD') + '.log';
		fs.readFile(todayLog,'utf8',(err,data) => {
			if(err) {
				Err.sendError(res,err,'log_controller','read -- Reading log file --');
				res.status(200).json({
					'status': 404,
					'message': 'Error with log file: ' + err
				});
				//console.log(err);
			} else {
				var dataArray = (data).split('\n');
				if(dataArray && dataArray.length > 0) {
					if(dataArray[dataArray.length - 1] === '')
					{
						dataArray.pop();
					}
					if(lines !== 0) {
						dataArray = dataArray.slice(-lines);
					}
					//console.log(dataArray)
					res.status(200).json({
						'status': 200,
						'message': dataArray
					});
				} else {
					res.status(200).json({
						'status': 200,
						'message': 'No data or no file found'
					});
				}
			}
		});
	}, // read

	truncate(req,res) {
		const key_user 	= res.locals.user;
		const todayLog = path + 'alumno-' + moment().format('YYYY-MMM-DD') + '.log';
		fs.truncate(todayLog,0,(err) => {
			if(err) {
				Err.sendError(res,err,'log_controller','truncate -- Emptying log file --');
				//console.log(err);
			} else {
				logger.info('This log file was emptied by admin -' + key_user.name + ' at ' + moment().format('YYYY-MMM-DD HH:MM'));
				res.status(200).json({
					'status': 200,
					'message': 'Log empty'
				});
			}
		});
	} // truncate
};
