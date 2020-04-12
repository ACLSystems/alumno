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
				return res.status(200).json({
					'message': 'No hay certificado con ese número de folio',
					noCert: true
				});
			}
			const roster = item.roster || null;
			if(!roster){
				return res.status(200).json({
					'message': 'No existe registro de calificaciones con ese número de folio',
					noCert: true
				});
			}
			if(roster.status !== 'active') {
				return res.status(200).json({
					'message': 'No ha completado los trámites para  adquirir constancia oficial de acreditación verificada, que comprueba sus conocimientos y habilidades desarrollados en este curso.',
					noCert: true,
					studentName: roster.student.person.fullName,
					email: roster.student.person.email
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
