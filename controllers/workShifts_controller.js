const WorkShift = require('../src/workShift');
const Err = require('../controllers/err500_controller');

module.exports = {

	create(req,res){
		const key_user = res.locals.user;
		var workShift = new WorkShift({
			name: req.body.name,
			org: req.body.org,
			orgUnit: req.body.orgUnit,
			allTime: req.body.allTime,
			shifts: req.body.shifts
		});
		if(!workShift.org) {
			workShift.org = key_user.org._id;
		}
		workShift.save()
			.then(() => {
				res.status(200).json({
					'message': 'Turno creado'
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'workShifts_controller','create -- Saving Shift --');
			});
	}, // create

	list(req,res) {
		const key_user 	= res.locals.user;
		const all 			= req.query.all || false;
		delete req.query.all;
		if(!req.query.org && !key_user.roles.isAdmin){
			req.query.org = key_user.org._id;
		}
		if(req.query.shifts) {
			req.query.shifts = JSON.parse(req.query.shifts);
			if(typeof req.query.shifts.day === 'string') {
				req.query.shifts.day = parseInt(req.query.shifts.day);
			}
		}
		if(all) {
			if(!key_user.roles.isAdmin){
				delete req.query.orgUnit;
				delete req.query.name;
				delete req.query.shifts;
				delete req.query.all;
			} else {
				req.query = {};
			}
		}
		WorkShift.find(req.query)
			.then(ws => {
				if(ws && ws.length > 1) {
					res.status(200).json({
						'message': `Se encontraron ${ws.length} turnos`,
						'turnos': ws,
						'query': req.query
					});
				} else if(ws && ws.length === 1) {
					res.status(200).json({
						'message': 'Un solo turno localizado',
						'turno': ws,
						'query': req.query
					});
				} else {
					res.status(200).json({
						'message': 'No se encontraron turnos',
						'query': req.query
					});
				}
			}).catch((err) => {
				Err.sendError(res,err,'workShifts_controller','create -- Saving Shift --');
			});
	} // list
};
