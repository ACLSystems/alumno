module.exports = {
	help(req, res) {
		res.status(200);
		res.json({
			'Usage': 'In general, to use APIs you need to send JSON in body and authentication tokens in headers, like: x-key (user logged) x-access-token (token received after login). Responses are same send in json format and every API has it own',
			'help': {
				'access': '/api/help',
				'description': 'This help'
			},
			'login': {
				'access': '/login',
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
					'description': 'used to validate user email when he/she losts his/her password. This returns token to construct URL for password change',
					'usage': 'Send json in body or in header',
					'example': {
						'email': 'user@custom.com'
					}
				},
				'passwordChange': {
					'access': '/api/user/passwordChange',
					'description': 'used to change user password (user explicity changes password) or an admin changes another user password',
					'usage': 'Send authentication tokens in headers, and user to change password and password in JSON format at body',
					'example': {
						'name': 'user01',
						'password': 'pass01'
					}
				},
				'getDetails': {
					'access': '/api/v1/user/getDetails',
					'description': 'get user details',
					'usage': 'Send authentication tokens in headers, and username to get details in JSON format at body',
					'example': {
						'name': 'user01'
					}
				},
				'modify': {
					'access': '/api/v1/user/modify',
					'description': 'modify user details. This API is intended for user. Do not modify admin properties',
					'usage': 'Send authentication tokens in headers, and username to get details in JSON format at body',
					'example': {
						'person.name': 'Bimbo',
						'person.fatherName': 'User',
						'person.motherName': 'Admin'
					}
				}
			},
			'org': {
				'register': {
					'access': '/api/v1/admin/org/register',
					'description': 'register organization. Requires token obtained from login. Only Admin can create organizations',
					'usage': 'Send authentication tokens in headers, and org data in JSON format at body',
					'example': {
						'name': 'bimbo',
						'longName': 'Bimbo SA',
						'alias': ['bimbote', 'bimbito', 'otro bimbo']
					}
				},
				'massiveRegister': {
					'massiveRegister': {
						'access': '/api/v1/orgadm/user/massiveRegister',
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
					}
				}
			},
			'orgunit': {
				'register': {
					'access': '/api/v1/orgadm/orgunit/register',
					'description': 'register organizational unit. Requires token obtained from login. Only Org can create OUs',
					'usage': 'Send authentication tokens in headers, and orgunit data in JSON format at body',
					'example': {
						'name': 'bimbo',
						'longName': 'Bimbo OU',
						'alias': 'bimbito',
						'org': 'bimbo'
					}
				}
			}
		});
	}
};
