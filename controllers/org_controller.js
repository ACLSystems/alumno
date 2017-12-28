const Org = require('../src/orgs');
const winston = require('winston');
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
    if(!req.query) return res.sendStatus(400);
    const orgProps = req.query;
    var temp = orgProps.alias;
    if(temp.constructor !== Array) {
      orgProps.alias = [temp];
    };
    const date = new Date();
    const mod = {by: orgProps.username, when: date};
    orgProps.mod = new Array();
    orgProps.mod.push(mod);
    delete orgProps.username;
    Org.create(orgProps)
      .then(org => {
        logger.info('Organizacion -' + orgProps.name + '- creada');
        const mess = {id: 201, message: 'Organizacion -' + orgProps.name + '- creada'};
        res.status(201).send(mess);
      })
      .catch((err) => {
          logger.info(err);
          //logger.info('Error: Organizacion -' + orgProps.name + '- ya existe');
          const mess = {id: 422, error: 'Error: Organizacion -' + orgProps.name + '- ya existe'};
          res.status(422).send(mess);
      });
  }
};
