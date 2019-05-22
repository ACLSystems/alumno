const mongoose = require('mongoose');

const months = [
	'Jan','Feb','Mar',
	'Apr','May','Jun',
	'Jul','Aug','Sept',
	'Oct','Nov','Dec'
];

module.exports = function(req,res,next){

	// Revisión de la funcionalidad de turnos

	// Primero revisamos si está activada la funcionalidad.
	// Si la propiedad attachedToWShift no existe o es falsa
	// dejamos pasar al usuario
	if(!res.locals.user.attachedToWShift){
		next();
	} else { // Si es verdadera, entonces vamos a buscar los horarios
		var shifts = {};
		const now = new Date();
		// validateRequest va a extraer los horarios si estos existen
		// y se los pega al objeto res.locals.user en la propiedad
		// workShift
		// Si existen los horarios avanzamos. Si no, se le niega el accesso
		// al participante
		if(res.locals.user.workShift.shifts && res.locals.user.workShift.shifts.length > 0) {
			shifts = res.locals.user.workShift.shifts.filter(shift => shift.day === now.getDay());
			if(shifts) {
				// OK... si tenemos horarios definidos
				// ahora construimos las variables para comparar
				const date = now.getDate();
				const month = now.getMonth();
				const year = now.getFullYear();
				// la variable allow nos va a decir si encontró
				// un horario permitido y nos dirá si
				// el participante está tratando de ingresar
				// en ese horario
				// allow = true >> El participante va a poder ingresar
				// allow = false >> El participante no va a poder ingresar
				var allow = false;
				shifts.forEach(shift => {
					const beginToday = new Date(`${year}-${months[month]}-${date} ${shift.beginHour}:${shift.beginMinute}`);
					const endToday = new Date(`${year}-${months[month]}-${date} ${shift.endHour}:${shift.endMinute}`);
					if((beginToday < now && endToday > now)) {
						allow = true;
					}
				});
				if(!allow){
					res.status(403).json({
						'message': 'No se te permite el acceso. Tienes activada la funcionalidad de turnos y estás ingresando fuera de horario'
					});
				} else {
					next();
				}
			} else {
				res.status(403).json({
					'message': 'No se te permite el acceso. Tienes activada la funcionalidad de turnos y no tienes definido un horario para ingresar en estos momentos'
				});
			}
		} else {
			res.status(403).json({
				'message': 'No se te permite el acceso. Tienes activada la funcionalidad de turnos y no tienes definido un horario para ingresar en estos momentos'
			});
		}
	}
};
