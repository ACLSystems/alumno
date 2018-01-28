/* eslint no-unused-vars: "error" */
const express = require('express');
const bodyParser = require('body-parser');
const bodyParserJsonError = require('./shared/validatejson');
const helmet = require('helmet');
const db = require('./src/db'); // eslint-disable-line no-unused-vars
const routes = require('./routes/routes');
const app = express();

app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParserJsonError());
routes(app);

// If no route is matched by now, it must be a 404
//app.use(function(req, res, next) {
app.use(function(req, res) {
	res.status(404).json({
		'status': 404,
		'message': 'Error 100: API not found'
	});
});


module.exports = app;
