const fs 			= require('fs');
const moment 	= require('moment');
const path		=	'./logs/';
const Err 		= require('./err500_controller');

module.exports = {

	read(req,res) {
		const todayLog = path + 'alumno-' + moment().format('YYYY-MMM-DD') + '.log';
		fs.readFile(todayLog,'utf8',(err,data) => {
			if(err) {
				Err.sendError(res,err,'log_controller','read -- Reading log file --');
				//console.log(err);
			} else {
				const dataArray = (data).split('\n');
				//console.log(dataArray)
				res.status(200).json({
					'status': 200,
					'message': dataArray
				});
			}
		});
	} // read
};
