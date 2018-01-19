/* eslint no-unused-vars: "error" */
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const db = require('./src/db'); // eslint-disable-line no-unused-vars
const routes = require('./routes/routes');
const app = express();

app.use(helmet());
app.use(bodyParser.json());
routes(app);

// If no route is matched by now, it must be a 404
//app.use(function(req, res, next) {
app.use(function(req, res) {
	const mess = {id: 404, err: 'API not found'};
	res.status(404).send(mess);
});


module.exports = app;
