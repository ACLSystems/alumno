const UserController = require('../controllers/user_controller');
const OrgController = require('../controllers/org_controller');
const OrgUnitController = require('../controllers/orgUnit_controller');
const GetNothing = require('../controllers/get_nothing');

module.exports = (app) => {
  app.get('/', GetNothing.greeting);
  app.get('/api', GetNothing.greeting);
  app.get('/api/user', GetNothing.greeting);
  app.get('/api/user/getdetails', UserController.getDetails);
  app.get('/api/org', GetNothing.greeting);
  app.get('/api/orgunit', GetNothing.greeting);
  app.post('/api/user/register', UserController.register);
  app.post('/api/org/register', OrgController.register);
  app.post('/api/orgunit/register', OrgUnitController.register);
};
