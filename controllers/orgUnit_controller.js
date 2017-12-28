const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
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
    if(!req.query) {
      const mess = {id: 417, err: 'Por favor, proporcione los datos para procesar'};
      res.status(417).send(mess);
    } else {
      const ouProps = req.query;
      if(!ouProps.org) {
        const mess = {id: 417, err: 'Por favor, proporcione la unidad organizacional'};
        res.status(417).send(mess);
      } else {
        Org.findOne({ name: ouProps.org }, { name: true} )
          .then((org) => {
            if(!org) {
              const mess = {id: 422, err: 'Organizacion -' + ouProps.org + '- no existe'};
              res.status(422).send(mess);
            } else {
              // ------------
              var temp = ouProps.alias;
              if(temp.constructor !== Array) {
                ouProps.alias = [temp];
              };
              const date = new Date();
              const mod = {by: ouProps.username, when: date};
              ouProps.org = org._id;
              ouProps.mod = new Array();
              ouProps.mod.push(mod);
              delete ouProps.username;
              OrgUnit.create(ouProps)
                .then(orgUnit => {
                  logger.info('Unidad Organizacional -' + ouProps.name + '- creada');
                  const mess = {id: 201, message: 'Unidad Organizacional -' + ouProps.name + '- creada'};
                  res.status(201).send(mess);
                })
                .catch((err) => {
                    logger.info(err);
                    const mess = {id: 422, error: 'Error: Unidad Organizacional -' + ouProps.name + '- ya existe'};
                    logger.info(mess);
                    res.status(422).send(mess);
                });
              // ---------------
            };
          })
          .catch((err) => {
            logger.info(err);
            res.send(err);
          });
      };
    };
  }
};
