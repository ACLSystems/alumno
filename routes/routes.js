const UserController = require('../controllers/user_controller');
const OrgController = require('../controllers/org_controller');
const OrgUnitController = require('../controllers/orgUnit_controller');
const GetNothing = require('../controllers/get_nothing');

module.exports = (app) => {
// raiz
  app.get('/', GetNothing.greeting);
  app.get('/api', GetNothing.greeting);
// User
  app.get('/api/user', GetNothing.greeting);
  app.get('/api/user/getdetails', UserController.getDetails);
  app.post('/api/user/register', UserController.register);
// Org
  app.get('/api/org', GetNothing.greeting);
  app.post('/api/org/register', OrgController.register);
// OrgUnit
  app.get('/api/orgunit', GetNothing.greeting);
  app.post('/api/orgunit/register', OrgUnitController.register);
};
