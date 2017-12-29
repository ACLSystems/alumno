const winston = require('winston');
const User = require('../src/users');
const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
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
      const userProps = req.query;
      if(!userProps.org) {
        const mess = {id: 417, err: 'Por favor, proporcione la organizacion'};
        res.status(417).send(mess);
      } else {
        Org.findOne({ name: userProps.org }, { name: true } )
          .then((org) => {
            if (!org) {
              const mess = {id: 422, err: 'Organizacion -' + userProps.org + '- no existe'};
              res.status(422).send(mess);
            } else {
              OrgUnit.findOne({ name: userProps.orgunit}, { name: true })
                .then((ou) => {
                  if (!ou) {
                    const mess = {id: 422, err: 'Unidad organizacional -' + userProps.orgUnit + '- no existe'};
                    res.status(422).send(mess);
                  } else {
                    const date = new Date();
                    const mod = {by: userProps.username, when: date};
                    userProps.org = org._id;
                    userProps.orgUnit = ou._id;
                    userProps.mod = new Array();
                    userProps.mod.push(mod);
                    delete userProps.username;
                    User.create(userProps)
                      .then((user) => {
                        const mess = {id: 201, message: 'Usuario -' + userProps.name + '- creado'};
                        logger.info(mess);
                        res.status(201).send(mess);
                      })
                      .catch((err) => {
                        const mess = {id: 422, error: 'Error: Usuario -' + userProps.name + '- ya existe'};
                        logger.info(mess);
                        res.status(422).send(mess);
                      });
                  }
                })
                .catch((err) => {
                  const mess = {id: 422, error: 'Error: Usuario -' + userProps.name + '- ya existe'};
                  logger.info(mess);
                  res.status(422).send(mess);
                });
            };
          })
          .catch((err) => {
            logger.info(err);
            res.send(err);
          });
      };
    };
  },

  getDetails(req, res, next) {
    if(!req.query) {
      const mess = {id: 417, err: 'Por favor, proporcione los datos para procesar'};
      res.status(417).send(mess);
    } else {
      const userProps = req.query;
      if(!userProps.name) {
        const mess = {id: 417, err: 'Por favor, proporcione nombre de usuario'};
        res.status(417).send(mess);
      } else {
        User.findOne({ name: userProps.name }, {password: false, __v: false})
          .populate('org','name')
          .populate('orgUnit', 'name')
          .then((user) => {
            if (!user) {
              const mess = {id: 422, message: 'Usuario -' + userProps.name + '- no existe'};
              logger.info(mess);
              res.status(422).send(mess);
            } else {
              res.status(200).send(user)
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
