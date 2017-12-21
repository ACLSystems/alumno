const assert = require('assert');
const User = require('../src/users');
const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');

describe('--- Prueba para crear registros ---', () => {
  // Crear organizacion ---
  it('- Prueba para crear organizacion', (done) => {
    const aclsystems = new Org({
      name: 'ACL Systems',
      alias: ['acl1']
    });
    aclsystems.save()
      .then(() => {
        assert(!aclsystems.isNew);
        done();
      });
  });
  // Crear organizacion ---
}); //describe
