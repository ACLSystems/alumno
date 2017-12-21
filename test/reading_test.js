const assert = require('assert');
const User = require('../src/users');
const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');

describe('--- Prueba para leer registros ---', () => {

  beforeEach((done) => {
    const aclsystems = new Org({
      name: 'ACL Systems',
      alias: ['aclsystems']
    });
    const sistemas = new OrgUnit({
      name: 'Sistemas',
      longName: 'Departamento de Sistemas',
      alias: ['sistemas1'],
      parent: null
    });
    sistemas.org = aclsystems;

    Promise.all([
        aclsystems.save(),
        sistemas.save()
      ])
      .then(() => done());
  });

  it('-- Leer organizaciones --', (done) => {
    Org.find({})
      .then((myOrgs) => {
        //console.log(myOrgs[0].name);
        assert(myOrgs[0].name === 'ACL Systems');
        done();
      })
  });

  it('-- Leer unidades org --', (done) => {
    OrgUnit.find({})
      .populate('org')
      .then((myUnits) => {
        //console.log(myUnits[0].name);
        //console.log(myUnits[0].org.name);
        assert(myUnits[0].name === 'Sistemas' && myUnits[0].org.name === 'ACL Systems');
        done();
      })
  });

}); //describe
