const UserController = require('../controllers/user_controller');
const OrgController = require('../controllers/org_controller');
const OrgUnitController = require('../controllers/orgUnit_controller');
const GetNothing = require('../controllers/get_nothing');
const auth = require('./auth');
const MassUsersController = require('../controllers/massiveUsers_Controller');
const HelpController = require('../controllers/help_controller');

module.exports = (app) => {

app.all('/*', function(req, res, next) {
  // CORS headers
  res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  // Set custom headers for CORS
  res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
  if (req.method == 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
});

// Auth Middleware - This will check if the token is valid
// Only the requests that start with /api/v1/* will be checked for the token.
// Any URL's that do not follow the below pattern should be avoided unless you
// are sure that authentication is not needed
app.all('/api/v1/*', [require('../controllers/validateRequest')]);

// Rutas que cualquiera puede acceder

app.get('/', GetNothing.greeting);
app.post('/login', auth.login);
app.post('/api/user/register', UserController.register);
app.get('/api/user/validateEmail', UserController.validateEmail);
app.put('/api/user/passwordChange', UserController.passwordChange);
app.get('/api/help', HelpController.help);

// Rutas que pueden acceder solo usuarios autenticados

app.get('/api/v1/user/getdetails', UserController.getDetails);
app.put('/api/v1/user/modify', UserController.modify);


// Rutas que pueden acceder solo usuarios autenticados y autorizados

// Rutas para roles de "Admin"

app.post('/api/v1/admin/org/register', OrgController.register);

// Rutas para roles de organizacion

app.post('/api/v1/orgadm/user/massiveRegister', MassUsersController.massiveRegister);
app.post('/api/v1/orgadm/orgunit/register', OrgUnitController.register);

};
