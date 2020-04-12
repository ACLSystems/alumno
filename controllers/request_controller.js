const StatusCodes 	= require('http-status-codes');
const HTTPRequest 	= require('request-promise-native');
const Config 				= require('../src/config'										);
const Request 			= require('../src/requests'									);
const Invoice 			= require('../src/invoices'									);
const Folio					= require('../src/folio'										);
const Roster 				= require('../src/roster'										);
const FiscalContact = require('../src/fiscalContacts'						);
const File 					= require('../src/files'										);
const mailjet				= require('../shared/mailjet'								);
const Err 					= require('../controllers/err500_controller');

/**
	* CONFIG
	* Todo se extrae de variables de Ambiente
	*/
/** @const {string} */
const portal	= process.env.NODE_PORTAL;
/** @const {string} */
const ordir 	= process.env.DBX_ORDIR;
// ---------


module.exports = {
	create(req,res) {
		const key_user 		= res.locals.user;
		var request = req.body;
		request.requester = key_user._id;
		request.mod = {
			by: key_user.name,
			when: new Date(),
			what: 'Request Creation'
		};
		request.own = {
			user: key_user.name,
			org: key_user.org.name,
			orgUnit: key_user.orgUnit.name
		};
		request.perm = {
			users: [{ name: key_user.name, canRead: true, canModify: true, canSec: true }],
			roles: [{ name: 'isSupervisor', canRead: true, canModify: false, canSec: false},
				{ name: 'isRequester', canRead: true, canModify: false, canSec: false},
				{ name: 'isOrg', canRead: true, canModify: false, canSec: false},
				{ name: 'isBusiness', canRead: true, canModify: false, canSec: true}],
			orgs: [{ name: key_user.org.name, canRead: true, canModify: false, canSec: false}],
			orgUnits: [{ name: key_user.orgUnit.name, canRead: true, canModify: true, canSec: false}]
		};
		Request.create(request)
			.then((request)  => {
				res.status(StatusCodes.OK).json({
					'message': 'Request -' + request.reqNumber + '- has been created',
					'request': {
						'number': request.reqNumber,
						'label'	:	request.label,
						'id'		: request._id
					}
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'request_controller','create -- Create request --');
			});
	}, //create

	get(req,res) {
		var query 			= {};
		if(req.query.number) {
			query = {reqNumber: req.query.number};
		}
		if(req.params.number) {
			query = {reqNumber: req.params.number};
		}
		if(req.query.id) {
			query = {_id: req.query.id};
		}
		Request.findOne(query)
			.populate([
				{
					path: 'requester',
					select: 'name fiscal person fiscalcurrent',
					populate: {
						path: 'fiscal',
						select: 'tag identification'
					}
				},
				{
					path: 'details.item',
					select: '-own -perm -mod -rubric -__v',
					populate: [{
						path: 'orgUnit',
						select: 'name longName parent type'
					},{
						path: 'course',
						select: 'code title type price cost'
					}]
				},
				{
					path: 'invoice',
					select: 'date dueDate invoice status client paymentMethod numberTemplate syncAPIExternal idAPIExternal total totalPaid balance decimalPrecision items termsConditions cdfiUse'
				},
				{
					path: 'files',
					select: 'name createDate'
				}
			])
			.select('requester date reqNumber label tags subtotal discount tax total status statusReason details paymentNotes files filesNotes fiscalFiles temp1 temp2 temp3 dateFinished dateCancelled paymentSystem paymentMethod paymentType paymentStatus invoiceFlag invoice')
			.lean()
			.then((request)  => {
				if(request) {
					if(request.invoice && request.invoice.numberTemplate && request.invoice.numberTemplate.prefix && request.invoice.numberTemplate.number) {
						res.status(StatusCodes.OK).json({
							'request': request,
							'invoiceNumber': '' + request.invoice.numberTemplate.prefix + request.invoice.numberTemplate.number
						});
					} else {
						res.status(StatusCodes.OK).json({
							'request': request
						});
					}
				} else {
					res.status(StatusCodes.NOT_FOUND).json({
						'message': 'Request -' + req.query.number + '- not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'request_controller','get -- Finding request --');
			});
	}, //get

	my(req,res) {
		const key_user 	= res.locals.user;
		var query = {requester:key_user._id};
		var active = true;
		active = JSON.parse(req.query.active);
		if(active) {
			query.status = {$in: ['init','payment']};
		}
		Request.find(query)
			.select('label date reqNumber status')
			.sort('-reqNumber')
			.then((requests)  => {
				if(requests && requests.length > 0) {
					res.status(StatusCodes.OK).json({
						'message': 'Requests for -' + key_user.name + '- found',
						'requests': requests
					});
				} else {
					res.status(StatusCodes.OK).json({
						'message': 'No requests found for -' + key_user.name
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'request_controller','my -- Finding requests --');
			});
	}, //my

	finish(req,res) {
		// Esta función busca la petición (Request) que queremos "terminar"
		// !!!! Reparar esta función porque tiene una mezcla de promesas y async
		// Lo que debería ser es totalmente ASYNC y meter try-catch para manejo de errores
		async function finishRequest(query) {
			let queryFC = {};
			if(body.fiscal && body.fiscal.fiscalTag) {
				queryFC = {tag: body.fiscal.fiscalTag};
			} else {
				queryFC = {tag: 'XAXX010101000'};
			}
			await Promise.all([
				Request.findOne(query),
				FiscalContact.findOne(queryFC).select('_id')])
				.then(async function(results) {
					var [request,fc] = results;
					if(request) {
						if(request.status === 'done') {
							res.status(StatusCodes.NOT_ACCEPTABLE).json({
								'message': 'Request -' + request.reqNumber + '- is in status done. Cannot be changed'
							});
							return;
						}
						if(request.status === 'cancelled') {
							res.status(StatusCodes.NOT_ACCEPTABLE).json({
								'message': 'Request -' + request.reqNumber + '- is cancelled. Cannot be finished'
							});
							return;
						}
						if(request.status === 'payment') {
							res.status(StatusCodes.NOT_ACCEPTABLE).json({
								'message': 'Request -' + request.reqNumber + '- is already in status Payment. Cannot be finished again'
							});
							return;
						}
						if(invoice){
							if(!request.fiscalTag && !body.fiscal.fiscalTag) {
								res.status(StatusCodes.NOT_ACCEPTABLE).json({
									'message': 'We need fiscal tag in order to create invoice. Please provice fiscal tag or invoice=false avoid invoice creation'
								});
								return;
							}
						}
						if(!req.body.items) {
							res.status(StatusCodes.NOT_ACCEPTABLE).json({
								'message': 'We need items in order to create invoice. Please provice items array in body to proceed'
							});
							return;
						}
						if(!Array.isArray(req.body.items)) {
							res.status(StatusCodes.NOT_ACCEPTABLE).json({
								'message': 'Items must be send in array to create invoice. Please provice items array in body to proceed'
							});
							return;
						}
						if(req.body.items.length === 0) {
							res.status(StatusCodes.NOT_ACCEPTABLE).json({
								'message': 'Items array is empty. Please provice items array in body to proceed'
							});
							return;
						}
						request.mod.push({
							by: key_user.name,
							when: new Date(),
							what: 'Request change status to Payment'
						});
						request.dateFinished = new Date();
						if(!request.paymentSystem && !body.fiscal.paymentSystem) {
							request.paymentSystem = 'payU';
						}
						request.invoiceFlag = invoice;
						request.paymentMethod = 'other';
						request.paymentStatus = 'pending';
						request.paymentNotes.push({
							note: 'Request finished and payment process begin',
							date: new Date()
						});
						request.fiscalTag = fc;
						var inv = new Invoice({
							requester			: request.requester,
							fiscalTag			: request.fiscalTag,
							request				: request._id,
							invoice				: invoice,
							items					: req.body.items,
							paymentMethod	: request.paymentMethod,
							createDate		: new Date(),
							mod: {
								by: key_user.name,
								when: new Date(),
								what: 'Invoice creation'
							}
						});
						request.invoice = inv._id;
						request.status = 'payment';
						await	inv.save().then((inv) => {
							request.save().then((request)  => {
								res.status(StatusCodes.OK).json({
									'message': 'Request -' + request.reqNumber +
									'- finished. Invoice '+ inv.numberTemplate.prefix +
									inv.numberTemplate.number +' created. Payment process can proceed',
									'invoiceNumber': '' + inv.numberTemplate.prefix + inv.numberTemplate.number
								});
							}).catch((err) => {
								processError(res,err,'request_controller','finish -- Updating Request --');
							});
						}).catch((err) => {
							processError(res,err,'request_controller','finish -- Saving Invoice --');
						});
					} else {
						res.status(StatusCodes.NOT_FOUND).json({
							'message': 'Request -' + body.number + '- not found'
						});
					}
				}).catch((err) => {
					Err.sendError(res,err,'request_controller','finish -- Finding request --');
				});
		}

		// -------------------------------

		const key_user 	= res.locals.user;
		var   query 		= {};
		var 	body 			= JSON.parse(JSON.stringify(req.body));

		// Seteamos propiedades
		if(body.number) {
			query = {reqNumber: body.number};
		}
		if(body.id) {
			query = {_id: body.id};
		}
		var invoice 		= false;
		if(body && body.fiscal && body.fiscal.invoice) {
			invoice = true;
		}
		if(body.fiscal && body.fiscal.tag && !body.fiscal.fiscalTag) {
			body.fiscal.fiscalTag = body.fiscal.tag;
			delete body.fiscal.tag;
		}

		// llamamos a la función para finalizar la petición
		finishRequest(query);

	}, //finish

	async sendEmail(req,res) {
		try {
			let config = await Config.findOne({});
			if(config &&
				config.apiExternal &&
				config.apiExternal.enabled &&
				config.apiExternal.uri &&
				config.apiExternal.username &&
				config.apiExternal.token) {
				try {
					const auth = new Buffer.from(config.apiExternal.username + ':' + config.apiExternal.token);
					let options = {
						method	: 'POST',
						uri			:	config.apiExternal.uri + '/api/v1/invoices/' + req.body.invNumber + '/email',
						headers	: {
							authorization: 'Basic ' + auth.toString('base64')
						},
						body		: { emails: req.body.emails},
						json		: true
					};
					let response = await HTTPRequest(options);
					if(response && response.code && response.code === '200') {
						res.status(StatusCodes.OK).json({
							'message': 'Correo enviado exitosamente',
							'recipients': req.body.emails
						});
					} else {
						res.status(StatusCodes.SERVICE_UNAVAILABLE).json(response);
					}
				} catch (err){
					res.status(err.statusCode).json({
						'code': err.error.code,
						'message': err.error.message
					});
				}
			} else {
				res.status(StatusCodes.NOT_IMPLEMENTED).json({
					message: 'No puede completarse su solicitud ya que el sistema no está configurado. Contacte al administrador con este mensaje: "No existe configuración de accesos para API de facturación"'
				});
			}
		} catch (err) {
			res.status(StatusCodes.NOT_IMPLEMENTED).json({
				message: 'No puede completarse su solicitud ya que el sistema no logró obtener la configuración. Contacte al administrador con este mensaje: "No se puede obtener configuración o hay un error al tratar de obtener la configuración"'
			});
		}
	}, // sendEmail

	modify(req,res) {
		const key_user 	= res.locals.user;
		var   query 		= {};
		if(req.body.number) {
			query = {reqNumber: req.body.number};
		}
		if(req.body.id) {
			query = {_id: req.body.id};
		}
		Request.findOne(query)
			.then((request)  => {
				if(request.status === 'done') {
					res.status(StatusCodes.NOT_ACCEPTABLE).json({
						'message': 'Request -' + request.reqNumber + '- is in status done. Cannot be changed'
					});
					return;
				}
				if(request.status === 'cancelled') {
					res.status(StatusCodes.NOT_ACCEPTABLE).json({
						'message': 'Request -' + request.reqNumber + '- is cancelled. Cannot be changed'
					});
					return;
				}
				if(request.status === 'payment') {
					res.status(StatusCodes.NOT_ACCEPTABLE).json({
						'message': 'Request -' + request.reqNumber + '- is in status Payment. Cannot be changed'
					});
					return;
				}
				if(request){
					request.mod.push({
						by: key_user.name,
						when: new Date(),
						what: 'Request modified'
					});
					if(req.body.details	) {request.details 	= req.body.details;	}
					if(req.body.subtotal) {request.subtotal = req.body.subtotal;}
					if(req.body.tax			) {request.tax 			= req.body.tax;			}
					if(req.body.total		) {request.total 		= req.body.total;		}
					if(req.body.files		) {request.files 		= req.body.files;		}
					if(req.body.temp1		) {request.temp1 		= req.body.temp1;		}
					if(req.body.temp2		) {request.temp2 		= req.body.temp2;		}
					if(req.body.temp3		) {request.temp3 		= req.body.temp3;		}
					if(!req.body.details 	&&
						!req.body.subtotal	&&
						!req.body.tax				&&
						!req.body.total			&&
						!req.body.files			&&
						!req.body.temp1			&&
						!req.body.temp2			&&
						!req.body.temp3) {
						res.status(StatusCodes.NOT_ACCEPTABLE).json({
							'message': 'Request -' + request.reqNumber + '- is not modified. Nothing valid to modify.'
						});
						return;
					}
					request.save()
						.then(() => {
							res.status(StatusCodes.OK).json({
								'message': 'Request -' + request.reqNumber + '- updated'
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'request_controller','modify -- Updating request --');
						});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'request_controller','modify -- Finding request --');
			});
	}, //modify

	cancel(req,res) {
		const key_user 	= res.locals.user;
		var   query 		= {};
		if(req.body.number) {
			query = {reqNumber: req.body.number};
		}
		if(req.body.id) {
			query = {_id: req.body.id};
		}
		Request.findOne(query)
			.then((request)  => {
				if(request){
					if(request.status === 'payment') {
						res.status(StatusCodes.NOT_ACCEPTABLE).json({
							'message': 'Request -' + request.reqNumber + '- is already in process to payment and cannot be cancelled'
						});
						return;
					}
					if(request.status === 'done') {
						res.status(StatusCodes.NOT_ACCEPTABLE).json({
							'message': 'Request -' + request.reqNumber + '- is already in status done. Cannot be cancelled'
						});
						return;
					}
					if(request.status === 'cancelled') {
						res.status(StatusCodes.NOT_ACCEPTABLE).json({
							'message': 'Request -' + request.reqNumber + '- is already cancelled'
						});
						return;
					}
					request.mod.push({
						by: key_user.name,
						when: new Date(),
						what: 'Request status change to Cancelled'
					});
					request.statusReason = req.body.statusReason;
					request.status = 'cancelled';
					request.dateCancelled = new Date();
					request.save()
						.then(() => {
							res.status(StatusCodes.OK).json({
								'message': 'Request -' + request.reqNumber + '- cancelled succesfully'
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'request_controller','cancel -- Updating request --');
						});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'request_controller','cancel -- Finding request --');
			});
	}, //cancel

	async setPayment(req,res) {
		const key_user 	= res.locals.user;
		if(!req.body.notes) {
			req.body.notes = '--Solicitante no ha enviado notas--';
		}
		try {
			let config = await Config.findOne({});
			let file = false;
			if(config &&
				config.support &&
				config.support.enabled &&
				config.support.uri &&
				config.support.apiKey) {
				try {
					const auth = new Buffer.from(config.support.apiKey + ':X');
					const headers = {
						'Authorization': 'Basic ' + auth.toString('base64')
					};
					var formData = {};
					if(req.body.cc_emails && Array.isArray(req.body.cc_emails)) {
						formData.cc_emails = req.body.cc_emails;
					}
					if(req.body.file) {
						try {
							file = await File.findOne({_id: req.body.file});
							if(file) {
								const sourceFile = ordir + '/' + file.filename;
								const fs = require('fs');

								formData = {
									description	: 'Se ha realizado la notificación desde el portal ' +
																portal +
																' sobre un pago con respecto a la solicitud ' +
																req.body.number +
																' y factura/ticket generado con número ' +
																req.body.invoiceNumber + '. ' +
																'<br>Favor de proceder con la liberación de constancias '+
																'de los grupos correspondientes a la solicitud mencionada. '+
																'Gracias. <br><br>' +
																'<br>Req: ' + req.body.number +
																'<br>F/T: ' + req.body.invoiceNumber +
																'<br>idAPIExternal: ' + req.body.idAPIExternal +
																'<br><br>Notas del solicitante:<br><br>' + req.body.notes,
									email				: req.body.email,
									subject			: 'Pago generado. Req: ' + req.body.number + ' Fac/Tick: ' + req.body.invoiceNumber,
									priority		: 3,
									status			: 2,
									source			: 2,
									type				: 'Solicitud',
									'tags[]' 		: ['Alumno','Solicitud','Pago'],
									'attachments[]': {
										value: fs.createReadStream(sourceFile),
										options: {
											filename: file.name,
											contentType: file.mimetype
										}
									}
								};
								let options = {
									method		: 'POST',
									uri				:	config.support.uri + '/api/v2/tickets/',
									headers		: headers,
									formData	: formData
								};
								let response = await HTTPRequest(options);
								if(typeof response === 'string') {
									response = JSON.parse(response);
								}
								if(response && response.status && response.status === 2) {
									let request = await Request.findOne({reqNumber: req.body.number});
									try {
										if(request){
											request.paymentMethod = req.body.paymentMethod || 'transfer';
											request.paymentSystem = 'direct';
											request.paymentNotes.push({
												note: 'Payment made by ' + key_user.name,
												date: new Date()
											});
											request.filesNotes.push(req.body.notes);
											request.files.push(file._id);
											request.save().then(() => {
												res.status(StatusCodes.OK).json({
													'message': 'Se ha registrado el pago y se notificó a la mesa de servicio con el ticket número: ' + response.id
												});
											}).catch((err) => {
												Err.sendError(res,err,'group_controller','setPayment -- Saving request --',false,false,'Request number: ' + request.number);
											});
										} else {
											res.status(StatusCodes.NOT_FOUND).json({
												message: 'No se encuentra la solicitud ' + req.body.number
											});
										}
									} catch (err) {
										res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
											message: 'No pudo actualizarse la solicitud ' + req.body.number
										});
									}
								} else {
									res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(response);
									return;
								}
							} else {
								res.status(StatusCodes.NOT_FOUND).json({
									'message': 'Archivo no encontrado'
								});
								return;
							}
						} catch (err) {
							res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(err);
							return;
						}
					}
				} catch (err){
					res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
						'message': err
					});
				}
			} else {
				res.status(StatusCodes.NOT_FOUND).json({
					message: 'No puede completarse su solicitud ya que el sistema no está configurado. Contacte al administrador con este mensaje: "No existe configuración de accesos para API de facturación"'
				});
			}
		} catch (err) {
			res.status(StatusCodes.NOT_IMPLEMENTED).json({
				message: 'No puede completarse su solicitud ya que el sistema no logró obtener la configuración. Contacte al administrador con este mensaje: "No se puede obtener configuración o hay un error al tratar de obtener la configuración"'
			});
		}
	}, //setPayment

	async setFolios(req,res) {
		const key_user 	= res.locals.user;
		const folios 		= req.body || [];

		if(folios.length === 0) {
			res.status(StatusCodes.NO_CONTENT).json({
				'message': 'No hay folios en la solicitud'
			});
			return;
		} else {
			var results = [];
			for(var i=0; i < folios.length; i++) {
				const res = await processFolio(folios[i],key_user.name);
				if(res == 1) {
					results.push({
						status: 'error',
						folio: folios[i],
						message: 'El folio no fue encontrado'
					});
				// } else if(res == 2) {
				// 	results.push({
				// 		status: 'error',
				// 		folio: folios[i],
				// 		message: 'El folio ya estaba procesado'
				// 	});
				} else if(res == 3) {
					results.push({
						status: 'error',
						folio: folios[i],
						message: 'El roster/alumno de este folio no fue encontrado'
					});
				} else if(res.folio) {
					let result = {
						status: 'ok',
						folio: folios[i],
						message: 'El pago del folio fue registrado correctamente',
						student: res.student.person,
						group: res.group
					};
					if(res.tempStatus === 'info') {
						result.message = 'El folio ya estaba procesado anteriormente';
						result.status = 'info';
					}
					results.push(result);
				}
			}
			return res.status(StatusCodes.OK).json({
				'meesage': `Se han procesado ${results.length} registros`,
				'results': results
			});
		}
	} //setFolios

};

//

function processError(res,err,controllerMessage) {
	if(err.statusCode && err.error) {
		const messageHeader = 'Hubo un error al intentar comunicarse con el sistema de facturación. Favor de contactar al administrador e indicar este mensaje: ';
		var message = {};
		if(typeof err.error === 'string') {
			message = err.error;
		} else if(typeof err.error === 'object') {
			message = err.error.message;
		}
		res.status(err.statusCode).json({
			'message': messageHeader + message
		});
	} else {
		Err.sendError(res,err,'request_controller',controllerMessage);
	}
}

async function processFolio(folio, user) {
	const template = parseInt(process.env.MJ_TEMPLATE_NOTUSER);
	try {
		/* Buscar folio */
		const folioFound = await Folio.findOne({folio: folio})
			.populate('student','name person')
			.populate({
				path: 'roster',
				select: 'course group type',
				populate: [{
					path: 'course',
					select: 'title'
				},{
					path: 'group',
					select: 'course',
					populate: {
						path: 'course',
						select: 'title'
					}
				}]
			});
		if(folioFound) {
			/* Validar que el folio esté en estatus 'pending'*/
			var course;
			if(folioFound.roster && folioFound.roster.type && folioFound.roster.type === 'public') {
				course = folioFound.roster.course.title;
			} else {
				course = folioFound.roster.group.course.title;
			}
			if(folioFound.status === 'pending') {
				/* Modificar registro de folio*/
				folioFound.status = 'payed';
				const date = new Date();
				folioFound.mod.push({
					by: user,
					when: date,
					what: 'Pago de folio procesado'
				});
				/* Buscar roster*/
				var item = await Roster.findById(folioFound.roster);
				if(item) {
					item.mod.push({
						by: user,
						when: date,
						what: `Pago de folio ${folioFound.folio} procesado`
					});
					item.status = 'active';
					await item.save();
					const variables = {
						Nombre: folioFound.student.person.name,
						mensaje: `El pago de tu curso - "${course}" - ha sido procesado. Puedes descargar tu constancia desde plataforma.`
					};
					mailjet.sendMail(
						folioFound.student.name,
						folioFound.student.person.name,
						'El pago de tu curso ha sido procesado',
						template,
						variables
					);
					await folioFound.save();
					return folioFound;
				} else {
					return 3;
				}
			} else {
				folioFound.tempStatus = 'info';
				return folioFound;
			}
		} else {
			return 1;
		}
	} catch (err) {
		console.log(err);
		return 1;
	}
}
