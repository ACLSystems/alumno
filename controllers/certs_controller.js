const Certificate = require('../src/certificates'	);
const StatusCodes = require('http-status-codes'		);
const Roster 			= require('../src/roster'				);
const Instance 		= require('../src/instances'		);
const CertTemplate = require('../src/certTemplates');
const Err 				= require('./err500_controller'	);

module.exports = {
	async getCertificate(req,res) {
		const cert = +req.query.certificate;
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
			}).catch (err => {
				Err.sendError(res,err,'cert_controller','getCertificate -- Finding Roster, certNumber: ' + cert);
				return;
			});
		if(!item){
			return res.status(StatusCodes.NOT_FOUND).json({
				message: `No hay certificado con número de folio: ${cert}`,
				noCert: true
			});
		}
		const roster = item.roster || null;
		if(!roster){
			return res.status(200).json({
				message: `No existe registro de calificaciones (roster) con número de folio ${cert}`,
				noCert: true
			});
		}
		if(roster.status !== 'active') {
			return res.status(200).json({
				message: 'No ha completado los trámites para  adquirir constancia oficial de acreditación verificada, que comprueba sus conocimientos y habilidades desarrollados en este curso.',
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
		res.status(StatusCodes.OK).json({
			message: {
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
	}, //getCertificate

	async createCertTemplate(req,res) {
		const key_user = res.locals.user;
		const {
			isAdmin
		} = key_user.roles;
		if(!isAdmin) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes permisos'
			});
		}
		if(!req.file) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				message: 'Hace falta el archivo de plantilla'
			});
		}
		if(!req.query.name) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				message: 'Hace falta el nombre de la plantilla'
			});
		}
		if(!req.params.instance) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				message: 'Hace falta el id de la instancia'
			});
		}
		const instance = await Instance.findOne({orgUnitName:req.params.instance})
			.catch (err => {
				Err.sendError(res,err,'cert_controller','createCertTemplate -- Finding Instance, instance: ' + req.params.instance);
				return;
			});
		if(!instance) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: `Instancia ${req.params.instance} no existe`
			});
		}
		const DatauriParser = require('datauri/parser');
		const parser = new DatauriParser();
		const data = await parser.format('.png',req.file.buffer);
		var certTemplate = new CertTemplate({
			name: req.query.name,
			instance: instance._id,
			orgUnitName: req.params.instance,
			data: data.content,
			mod: [{
				by: `${key_user.person.email}`,
				when: new Date(),
				what: 'Creación de plantilla'
			}]
		});
		await certTemplate.save()
			.catch (err => {
				Err.sendError(res,err,'cert_controller','createCertTemplate -- Saving template');
				return;
			});
		res.status(StatusCodes.OK).json({
			message: 'Plantilla guardada'
		});
		// aquí poner código para leer archivo
		// y convertirlo en datauri
		// Guardarlo
	}, //createCertTemplate

	async getCertTemplate(req,res) {
		const key_user = res.locals.user;
		const {
			isAdmin,
			isSupervisor,
			isRequester,
			isInstructor
		} = key_user.roles;
		const rosterid = req.params.rosterid;
		const roster = await Roster.findById(rosterid)
			.select('status pass finalGrade track minGrade minTrack orgUnit instance')
			.catch(err => {
				Err.sendError(res,err,'cert_controller',`getCertTemplate -- Finding Roster, rosterid: ${rosterid}` );
				return;
			});
		if(!roster) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: `No existe roster: ${rosterid}`
			});
		}
		if(
			(key_user._id + '' !== roster.student + '') &&
			!isAdmin &&
			!isSupervisor &&
			!isRequester &&
			!isInstructor) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes permiso para obtener plantilla'
			});
		}
		const instance = roster.instance || await Instance.getInstance(roster.orgUnit,'instance') || req.query.name || null;
		if(!instance) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'No se encontró plantilla para constancia'
			});
		}
		const query = req.query.name ? {
			name: req.query.name
		} : {
			instance
		};
		const cert = await CertTemplate.findOne(query)
			.catch(err => {
				Err.sendError(res,err,'cert_controller',`getCertTemplate -- Finding CertTemplate, rosterid: ${rosterid} instance: ${instance}` );
				return;
			});
		if(!cert) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'No se encontró plantilla'
			});
		}
		if(!roster.instance) {
			roster.instance = cert.instance;
		}
		// Calcular requerimientos
		if(cert.conditions) {
			const cond = cert.conditions;
			if(cond.status !== roster.status && cond.status !== 'any' && !isAdmin && !isRequester && !isSupervisor && !isInstructor) {
				return res.status(StatusCodes.NOT_ACCEPTABLE).json({
					message: 'Roster no cumple con STATUS de pago'
				});
			}
			if(cond.pass && !roster.pass) {
				return res.status(StatusCodes.NOT_ACCEPTABLE).json({
					message: 'Roster no cumple con PASS'
				});
			}
			if(!cond.pass) {
				if(cond.finalGrade && roster.finalGrade < roster.minGrade) {
					return res.status(StatusCodes.NOT_ACCEPTABLE).json({
						message: 'Roster no cumple con finalGrade en roster'
					});
				}
				if(cond.track && roster.track < roster.minTrack) {
					return res.status(StatusCodes.NOT_ACCEPTABLE).json({
						message: 'Roster no cumple con track en roster'
					});
				}
				if(!cond.finalGrade && roster.finalGrade < cond.minGrade) {
					return res.status(StatusCodes.NOT_ACCEPTABLE).json({
						message: 'Roster no cumple con finalGrade en condiciones'
					});
				}
				if(cond.track && roster.track < cond.minTrack) {
					return res.status(StatusCodes.NOT_ACCEPTABLE).json({
						message: 'Roster no cumple con track en condiciones'
					});
				}
			}
		}
		roster.certTemplateDownload = true;
		await roster.save().catch(err => {
			Err.sendError(res,err,'cert_controller',`getCertTemplate -- Saving Roster, rosterid: ${rosterid} instance: ${instance}` );
			return;
		});
		res.status(StatusCodes.OK).json({
			data: cert.data,
			survey: cert.survey,
			drawing: cert.drawing
		});
	}, //getCertTemplate
};
