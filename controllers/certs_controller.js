const Certificate = require('../src/certificates');
const Err 				= require('./err500_controller');

module.exports = {
	async getCertificate(req,res) {
		const cert = +req.query.certificate;
		try {
			const item = await Certificate.findOne({number: cert})
				.populate({
					path: 'roster',
					select: 'type status student group finalGrade passDate certificateNumber',
					populate: [
						{
							path: 'student',
							select: 'person'
						},
						{
							path: 'group',
							select: 'course beginDate endDate dates',
							populate: {
								path: 'course',
								select: 'title image duration durationUnits'
							}
						},{
							path: 'course',
							select: 'title image duration durationUnits'
						}
					]
				});
			if(!item){
				res.status(200).json({
					'message': 'No hay certificado con ese número de folio',
					noCert: true
				});
			}
			const roster = item.roster || null;
			if(!roster){
				res.status(200).json({
					'message': 'No existe registro de calificaciones con ese número de folio',
					noCert: true
				});
			}
			if(roster.status !== 'active') {
				return res.status(200).json({
					'message': `${roster.student.person.fullName} (${roster.student.person.email}) no ha completado los requisitos para obtener certificado`,
					noCert: true
				});
			}
			const course = roster.type === 'public' ? roster.course : roster.group.course || null;
			const courseName = course.title;
			const courseImage = course.image;
			const courseDuration = course.duration;
			const courseDurationUnits = course.durationUnits;
			const courseBeginDate = roster.type !== 'public' ? roster.group.beginDate : undefined;
			const courseEndDate = roster.type !== 'public' ? roster.group.endDate : undefined;
			if(roster.group && roster.group.dates &&
				Array.isArray(roster.group.dates) &&
				roster.group.dates.length > 0
			){
				let findCertificateDate = item.roster.group.dates.find(date => date.type === 'certificate');
				if(findCertificateDate) {
					item.roster.passDate = findCertificateDate.beginDate;
				}
			}
			return res.status(200).json({
				'message': {
					courseName,
					courseImage,
					courseDuration,
					courseDurationUnits,
					courseBeginDate,
					courseEndDate,
					studentName					: roster.student.person.fullName,
					finalGrade					: roster.finalGrade,
					passDate						: roster.passDate,
					certificateNumber		: item.number
				},
				noCert: false
			});
		} catch (err) {
			Err.sendError(res,err,'cert_controller','getCertificate -- Finding Roster, certNumber: ' +
				cert);
		}
	}
};
