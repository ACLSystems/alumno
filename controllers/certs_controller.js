const Certificate = require('../src/certificates');
const Err 				= require('./err500_controller');

module.exports = {
	getCertificate(req,res) {
		const cert = parseInt(req.query.certificate);
		Certificate.findOne({number: cert})
			.populate({
				path: 'roster',
				select: 'student group finalGrade passDate certificateNumber',
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
					}
				]
			})
			.then((item) => {
				if(item){
					if(item.roster &&
						item.roster.group &&
						item.roster.group.dates &&
						Array.isArray(item.roster.group.dates) &&
						item.roster.group.dates.length > 0
					){
						let findCertificateDate = item.roster.group.dates.find(date => date.type === 'certificate');
						if(findCertificateDate) {
							item.roster.passDate = findCertificateDate.beginDate;
						}
					}
					res.status(200).json({
						'message': {
							courseName					: item.roster.group.course.title,
							courseImage					: item.roster.group.course.image,
							courseDuration			: item.roster.group.course.duration,
							courseDurationUnits	: item.roster.group.course.durationUnits,
							courseBeginDate			: item.roster.group.beginDate,
							courseEndDate				:	item.roster.group.endDate,
							studentName					: item.roster.student.person.fullName,
							finalGrade					: item.roster.finalGrade,
							passDate						: item.roster.passDate,
							certificateNumber		: item.roster.certificateNumber
						}
					});

				} else {
					res.status(200).json({
						'message': 'No hay certificado con ese número de folio'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'cert_controller','Finding Roster -- Saving group -- certNumber: ' +
					cert);
			});
	}
};
