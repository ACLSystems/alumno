const version = require('../shared/version');

module.exports = {
	help(req, res) {
		res.status(200);
		res.json({
			'App': version.app,
			'Version': version.version,
			'description': 'Minor corrections',
			'Usage': 'In general, to use APIs you need to send JSON in body and authentication tokens in headers, like: x-key (user logged) x-access-token (token received after login). Responses are same send in json format and every API has it own',
			'help': {
				'access': '/api/help',
				'method': 'GET',
				'description': 'This help'
			},
			'login': {
				'access': '/login',
				'method': 'POST',
				'description': 'Use login first to get access to most APIs.',
				'usage': 'Send JSON in body',
				'example': {
					'name': 'user20',
					'password': 'pass01'
				}
			},
			'user': {
				'General': 'APIs for most operations respect to user objects',
				'register': {
					'access': '/api/user/register',
					'method': 'POST',
					'description': 'to register an user. Must have org and orgunit. For public users use: public org and orgunit',
					'usage': 'Send headers with token, and json in body',
					'example': {
						'name':'bimbo_admin',
						'password': 'password',
						'person.name': 'Bimbo',
						'person.fatherName': 'User',
						'person.motherName': 'Admin',
						'person.email': 'user@bimbo.com.mx',
						'org': 'bimbo',
						'orgunit': 'bimbo'
					}
				},
				'validateEmail': {
					'access': '/api/user/validateEmail',
					'method': 'GET',
					'description': 'used to validate user email when he/she losts his/her password. This returns token to construct URL for password change',
					'usage': 'Send json in body or in header',
					'example': {
						'email': 'user@custom.com'
					}
				},
				'passwordChange': {
					'access': '/api/user/passwordChange',
					'method': 'PUT',
					'description': 'used to change user password (user explicity changes password) or an admin changes another user password',
					'usage': 'Send authentication tokens in headers, and user to change password and password in JSON format at body',
					'example': {
						'name': 'user01',
						'password': 'pass01'
					}
				},
				'getDetails': {
					'access': '/api/v1/user/getDetails',
					'method': 'GET',
					'description': 'get user details',
					'usage': 'Send authentication tokens in headers, and username to get details in JSON format at body',
					'example': {
						'name': 'user01'
					}
				},
				'modify': {
					'access': '/api/v1/user/modify',
					'method': 'PUT',
					'description': 'modify user details. This API is intended for user. Do not modify admin properties',
					'usage': 'Send authentication tokens in headers, and username to get details in JSON format at body',
					'example': {
						'person.name': 'Bimbo',
						'person.fatherName': 'User',
						'person.motherName': 'Admin'
					}
				},
				'massiveRegister': {
					'access': '/api/v1/orgadm/user/massiveRegister',
					'method': 'POST',
					'description': 'register users in massive way',
					'usage': 'Send authentication tokens in headers, and user array in JSON format at body',
					'example':
						[ { 'name': 'u1', 'password': 'pass1', 'org': 'bimbo', 'orgUnit': 'bimbo', 'person': { 'name': 'JuAn', 'fatherName': 'Perez', 'motherName': 'Prado', 'email': 'u1@mail.com', 'birthDate': '01/01/2000'} },
							{ 'name': 'u2', 'password': 'pass2', 'org': 'bimbo', 'orgUnit': 'bimbo', 'person': { 'name': 'FElipe', 'fatherName': 'Simon', 'motherName': 'gonzalez', 'email': 'u2@mail.com', 'birthDate': '02/02/2001'} },
							{ 'name': 'u3', 'password': 'pass3', 'org': 'bimbo', 'orgUnit': 'bimbo', 'person': { 'name': 'cArlos', 'fatherName': 'Manzano', 'motherName': 'Camarena', 'email': 'u3@mail.com', 'birthDate': '03/03/2002'} },
							{ 'name': 'u4', 'password': 'pass4', 'org': 'bimbo', 'orgUnit': 'otra', 'person': { 'name': 'Mike', 'fatherName': 'SollAn', 'motherName': 'Johnson', 'email': 'u4@mail.com', 'birthDate': '04/04/2003'} },
							{ 'name': 'u5', 'password': 'pass5', 'org': 'otra', 'orgUnit': 'bimbo', 'person': { 'name': 'FedeRico', 'fatherName': 'cano', 'motherName': 'millan', 'email': 'u5@mail.com', 'birthDate': '05/05/2004'} },
							{ 'name': 'u6', 'password': 'pass6', 'org': 'bimbo', 'orgUnit': 'bimbo', 'person': { 'name': 'alfoNso', 'fatherName': 'BlAde', 'motherName': 'Palomares', 'email': 'u6@mail.com', 'birthDate': '06/06/2005'} },
							{ 'name': 'u7', 'password': 'pass7', 'org': 'bimbo', 'orgUnit': 'bimbo', 'person': { 'name': 'SofiA', 'fatherName': 'MartInez', 'motherName': 'Vega', 'email': 'u7@mail.com', 'birthDate': '07/07/2006'} },
							{ 'name': 'u8', 'password': 'pass8', 'org': 'bimbo', 'orgUnit': 'bimbo', 'person': { 'name': 'JiMena', 'fatherName': 'SolorZano', 'motherName': 'Ruiz', 'email': 'u8@mail.com', 'birthDate': '08/08/2007'} }
						]
				},
				'list': {
					'access': '/api/v1/admin/user/list for isAdmin or /api/v1/orgadm/user/list for isOrg',
					'method': 'GET',
					'description': 'list users in org',
					'usage': 'For isAdmin you must provide org in params. There are available params to control flow data, like sort, skip and limit.'
				}
			},
			'org': {
				'register': {
					'access': '/api/v1/admin/org/register',
					'method': 'POST',
					'description': 'register organization. Requires token obtained from login. Only Admin can create orgs',
					'usage': 'Send authentication tokens in headers, and org data in JSON format at body',
					'example': {
						'name': 'bimbo',
						'longName': 'Bimbo SA',
						'alias': ['bimbote', 'bimbito', 'otro bimbo']
					}
				},
				'list': {
					'access': '/api/v1/admin/org/list',
					'method': 'GET',
					'description': 'list organizations. Requires token obtained from login. Only Admin can list orgs',
					'usage': 'Send authentication tokens in headers'
				},
				'modify': {
					'access': 'isAdmin: /api/v1/admin/org/modify isOrg: /api/v1/orgadm/modify',
					'method': 'PUT',
					'description': 'modify organization. Requires token obtained from login. Only Admin or Org Admins can access this API'
				}
			},
			'orgunit': {
				'register': {
					'access': '/api/v1/orgadm/orgunit/register',
					'method': 'POST',
					'description': 'register organizational unit. Requires token obtained from login. Only isOrg and isAdmin can create OUs',
					'usage': 'Send authentication tokens in headers, and orgunit data in JSON format at body',
					'example': {
						'name': 'bimbo',
						'longName': 'Bimbo OU',
						'alias': 'bimbito',
						'org': 'bimbo'
					}
				},
				'massiveRegister': {
					'access': '/api/v1/orgadm/orgunit/masiveregister',
					'method': 'POST',
					'description': 'register organizational units. Requires token obtained from login. Only isOrg and isAdmin can create OUs',
					'usage': 'Send authentication tokens in headers, and orgunit data in JSON format at body. Type could be any of: org,country,region,state,city,area,campus,department,building,section,floor,room]. org cannot be displayed to final user',
					'example': [
						{ 'name': 'dir_general', 'longName': 'Dirección General', 'alias': 'Dir. Gral.', 'type': 'department' },
						{	'name': 'sistemas', 'longName': 'Dirección de Sistemas', 'alias': 'Sistemas', 'type': 'department' },
						{ 'name': 'finanzas', 'longName': 'Dirección de Finanzas', 'alias': 'Finanzas', 'type': 'department' }
					]
				}
			},
			course: {
				'create': {
					'access': '/api/v1/author/course/create',
					'method': 'POST',
					'description': 'create content repository (course). Only for isAuthor',
					'usage': 'Send authentication tokens in headers, and data in JSON format at body',
					'example': {	'code': 'MA-1001',
						'title': 'Matemáticas I',
						'type': 'Self-paced',
						'level': 'Basic',
						'categories': ['Matemáticas'],
						'keywords': ['Matemáticas', 'Básicas'],
						'description': 'Curso de matemáticas básico',
						'image': 'http%3A%2F%2Fmaterialeducativo.org%2Fwp-content%2Fuploads%2F2014%2F09%2Fcuartogradomate.gif',
						'details': 'Excelentes actividades matemáticas para cuarto grado, les presentamos estas actividades para reforzar los conocimientos adquiridos por los alumnos de primaria, espero que les sea de mucha utilidad para llevarlas a la practica en su aula, espero que les sea de mucha utilidad para su grupo.',
						'syllabus': '<h1>Temario</h1><ol><li><b>Tema 1.</b> Sumas y Restas</li><li><b>Tema 2.</b> Multiplicación y División</li><li><b>Tema 3.</b> Cálculo Diferencial</li></ol>'
					}
				},
				'listCategories': {
					'access': '/api/v1/course/listCategories',
					'method': 'GET',
					'description': 'list courses categories',
					'usage': 'Send authentication tokens in headers. Use params (in url) for sort, skip and limit'
				},
				'listCourses': {
					'access': '/api/v1/course/listCourses',
					'method': 'GET',
					'description': 'list courses',
					'usage': 'Send authentication tokens in headers. Use params (in url) for sort, skip and limit. You can send JSON for query categories'
				}
			}
		});
	}
};
