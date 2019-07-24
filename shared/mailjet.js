const mailjet = require ('node-mailjet')
	.connect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);
const request = mailjet.post('send', {'version': 'v3.1'});

// Configuración ----------------------------
// Correo FROM - correo de donde proviene la notificación
const fromEmail = process.env.MJ_FROMEMAIL;
// Nombre FROM - nombre del que proviene la notificación
const fromName = process.env.MJ_FROMNAME;
// Arreglo de Ids para el registro de usuarios
const mailRegUser = process.env.MJ_REG_REGUSER;
// Arreglo de Ids para recuperación de contraseña
const mailPassRec = process.env.MJ_REG_PASSREC;
// Arreglo de Ids para registro en grupo
const mailGroupReg = process.env.MJ_REG_GROUPREG;
// Arreglo de Ids para envio de errores
const mailError = process.env.MJ_REG_MAILERROR;
// Arreglo de Ids para notificar a alumnos de un grupos
const mailNotGroup = process.env.MJ_REG_NOTGROUP;
// Arreglo de Ids para notificar a un alumno
const mailNotUser = process.env.MJ_REG_NOTUSER;
// Arreglo de Ids para cambio de contraseña
const mailPassChange = process.env.MJ_REG_PASSCHANGE;
// Arreglo de Ids para notificar al admin la creación de un grupo
const mailNotGroupCreate = process.env.MJ_REG_NOTGROUPCREATE;

var find;

exports.sendMail = function(toEmail,toName,subject,templateID,param1,param2,param3,param4,param5,param6,param7,param8,param9) {
	var mail_message =
		{
			'From': {
				'Email': fromEmail,
				'Name': fromName
			},
			'To': [
				{
					'Email': toEmail,
					'Name': toName
				}
			],
			'TemplateID': templateID,
			'TemplateLanguage': true,
			'Subject': subject,
			'TemplateErrorDeliver': true,
			'TemplateErrorReporting': {
				'Email': 'arturocastro@aclsystems.mx',
				'Name': 'Air traffic control'
			}
		};

	// Plantillas para enviar registro de usuario
	//if(templateID === 310518 || templateID === 339990 || templateID === 630058 || templateID === 877911) {
	find = mailRegUser.find(template => template === templateID);
	if(find){
		mail_message.Variables = {
			'Nombre': toName,						// Nombre
			'confirmation_link':param1 // link
		};
	}

	// Plantillas para enviar recuperación de contraseña
	//if(templateID === 311647) {			// Plantilla para recuperación de contraseña
	find = mailPassRec.find(template => template === templateID);
	if(find){
		mail_message.Variables = {
			'Nombre': toName,						// Nombre
			'confirmation_link':param1 // link
		};
	}

	// Plantilla para notificar registro de alumno en grupo
	//if(templateID === 339994 || templateID === 877918 || templateID === 880116) {
	find = mailGroupReg.find(template => template === templateID);
	if(find){
		mail_message.Variables = {
			'Nombre': toName,						// Nombre
			'confirmation_link':param1, // link
			'curso':  param2 						// curso
		};
	}

	// Plantilla para reportar errores 500 en el API
	//if(templateID === 321554) {
	find = mailError.find(template => template === templateID);
	if(find){
		mail_message.Variables = {
			'errNum': param2,					// errNum
			'controller': param3,			// controller
			'section': param8,				// section
			'env': param4,						// environment
			'id': param5,							// id
			'stringError': param6,		// stringError
			'errorStack': param7,			// errorStack
			'message': param9					// mensaje
		};
	}

	// Plantilla para notificaciones a los usuarios de un grupo
	//if(templateID === 391119) {
	find = mailNotGroup.find(template => template === templateID);
	if(find){
		mail_message.Variables = {
			'Nombre': toName,					// Nombre
			'curso': param1,					// curso
			'mensaje': param2					// message
		};
	}

	// Plantilla para notificaciones a un usuario
	//if(templateID === 493237) {
	find = mailNotUser.find(template => template === templateID);
	if(find){
		mail_message.Variables = {
			'Nombre': toName,					// Nombre
			'mensaje': param1					// message
		};
	}

	// Plantilla para notificar cambio de contraseña
	//if(templateID === 393450) {
	find = mailPassChange.find(template => template === templateID);
	if(find){
		mail_message.Variables = {
			'Nombre': toName,					// Nombre
		};
	}

	// Plantilla para notificar creación de grupo
	//if(templateID === 679640) {
	find = mailNotGroupCreate.find(template => template === templateID);
	if(find){
		mail_message.Variables = {
			'Nombre': toName,					// Nombre
			'portal': param1,					// portal
			'mensaje': param2					// mensaje
		};
	}

	// Regresamos la promesa
	return new Promise(function(resolve,reject) {
		request.request({'Messages': [mail_message]})
			.then((result) => {
				resolve(result.body.Messages[0].Status);
			})
			.catch((err) => {
				reject(err.statusCode + ': ' + err.response.res.statusMessage);
				//reject(err);
			});
	});
};
