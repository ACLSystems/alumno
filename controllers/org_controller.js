const Org = require('../src/orgs');
const winston = require('winston');
const obj_type = 'org';
require('winston-daily-rotate-file');

var transport = new(winston.transports.DailyRotateFile) ({
  filename: './logs/log',
  datePattern: 'yyyy-MM-dd.',
  prepend: true,
  localTime: true,
  level: process.env.ENV === 'development' ? 'debug' : 'info'
});

var logger = new(winston.Logger) ({
  transports: [
    transport
  ]
});

module.exports = {
  register(req, res, next) {
    var key = (req.body && req.body.x_key) || req.headers['x-key'];
    if(!key) {
      key = 'admin';
    };
    if(!req.body) return res.sendStatus(400).res.send({id: 417, err: 'Please, give data to process'});
    const orgProps = req.body;
    var temp = orgProps.alias;
    if(temp.constructor !== Array) {
      orgProps.alias = [temp];
    };
    const date = new Date();
    const mod = {by: key, when: date};
    orgProps.mod = new Array();
    orgProps.mod.push(mod);
    Org.create(orgProps)
      .then(org => {
        logger.info('Org -' + orgProps.name + '- created');
        const mess = {id: 201, message: 'Org -' + orgProps.name + '- created'};
        res.status(201).send(mess);
      })
      .catch((err) => {
          logger.info(err);
          const mess = {id: 422, error: 'Error: Org -' + orgProps.name + '- already exists'};
          res.status(422).send(mess);
      });
  }
};
