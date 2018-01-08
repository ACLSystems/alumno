const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const db = require('./src/db');
const routes = require('./routes/routes');
const app = express();

app.use(helmet());
app.use(bodyParser.json());
routes(app);

// If no route is matched by now, it must be a 404
app.use(function(req, res, next) {
  var err = new Error('API NOT FOUND');
  err.status = 404;
  next(err);
});


module.exports = app;
