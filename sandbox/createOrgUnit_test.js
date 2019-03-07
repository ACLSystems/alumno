const assert = require('assert');
//const User = require('../src/users');
const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');

describe('--- Prueba para crear registros ---', () => {
	beforeEach((done) => {
		const aclsystems = new Org({
			name: 'ACL Systems',
			alias: ['acl2']
		});
		aclsystems.save()
			.then(() => done());
	});

	var org = {};

	const sistemas = new OrgUnit({
		name: 'Sistemas',
		longName: 'Departamento de Sistemas',
		alias: ['sistemas2'],
		parent: null
	});

	it('-- Prueba para crear orgUnits', (done) => {

		Org.findOne({ name: 'ACL Systems' })
			.then((myOrg) => {
				console.log('---------ACL Systems-------');
				org = myOrg;
				console.log(org);
			});
	});

	console.log('---------ACL Systems fuera del promise y del it-------');
	console.log(org);

	it('-- Prueba para buscar OrgUnit--', (done) => {
		OrgUnit.findOne({ name: 'Sistemas' })
			.then((unit) => {
				console.log('---buscando sistemas---');
				console.log(unit);
				done();
			})
	});

}); //describe
