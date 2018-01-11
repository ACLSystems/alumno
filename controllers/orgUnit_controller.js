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
      const mess = {id: 417, err: 'Please, give data to process'};
      res.status(417).send(mess);
    } else {  //else1
      const ouProps = req.query;
      if(!ouProps.org) {
        const mess = {id: 417, err: 'Please, give OU'};
        res.status(417).send(mess);
      } else { //else2
        Org.findOne({ name: ouProps.org }, { name: true} )
          .then((org) => {
            if(!org) {
              const mess = {id: 422, err: 'Org -' + ouProps.org + '- does not exist'};
              res.status(422).send(mess);
            } else {
              // ------------
              if(ouProps.parent) {
                OrgUnit.findOne({ name: ouProps.parent}, { name: true })
                .then((orgunitParent) => {
                  if(!orgunitParent) {
                    const mess = {id: 404, error: 'Error: Parent OU -' + ouProps.parent + '- does not exist'};
                    logger.info(mess);
                    res.status(404).send(mess);
                  } else {
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
                        logger.info('OU -' + ouProps.name + '- created');
                        const mess = {id: 201, message: 'OU -' + ouProps.name + '- created'};
                        res.status(201).send(mess);
                      })
                      .catch((err) => {
                          logger.info(err);
                          const mess = {id: 422, error: 'Error: OU -' + ouProps.name + '- already exists'};
                          logger.info(mess);
                          res.status(422).send(mess);
                      });
                    };
                })
                .catch((err) => {
                  logger.info(err);
                  res.send(err);
                });
              } else {
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
                  .then(() => {
                    logger.info('OU -' + ouProps.name + '- created');
                    const mess = {id: 201, message: 'OU -' + ouProps.name + '- created'};
                    res.status(201).send(mess);
                  })
                  .catch((err) => {
                      logger.info(err);
                      const mess = {id: 422, error: 'Error: OU -' + ouProps.name + '- already exists'};
                      logger.info(mess);
                      res.status(422).send(mess);
                  });
              };
            };
          })
          .catch((err) => {
            logger.info(err);
            res.send(err);
          });
      }; //else2
    }; //else1
  }
};
