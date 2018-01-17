const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
const Users = require('../src/users');
const winston = require('winston');
const obj_type = 'orgunit';
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
    if(!req.body) {
      res.status(406).json({
        "status": 406,
        "message": "Please, give data to process"
      });
    } else {  //else1
      const ouProps = req.body;
      var key = (req.body && req.body.x_key) || req.headers['x-key'];
      Users.findOne({ name: key }, { name: true, org: true })
        .populate(org)
        .then((key_user) => {
          if( key_user.org !== ouProps.org ) { // Validamos si el usuario tiene permisos para crear  unidades en su organizacion
            const mess = {id: 403, err: 'User ' + key + ' does not have permissions for Org -' + ouProps.org + '-'};
            res.status(403).json({
              "status": 403,
              "message": "User " + key + " does not have permissions for Org -" + ouProps.org + '-'
            });
          } else { //else2
            if(key_user.roles.isOrg) {
              if(!ouProps.org) {
                res.status(406).json({
                  "status": 406,
                  "message": "Please, give OU"
                });
              } else { //else3
                Org.findOne({ name: ouProps.org }, { name: true} )
                  .then((org) => {
                    if(!org) {
                      res.status(404).json({
                        "status": 404,
                        "message": "Org -" + ouProps.org + "- does not exist"
                      });
                    } else {
                      // ------------
                      if(ouProps.parent) {
                        OrgUnit.findOne({ name: ouProps.parent}, { name: true })
                        .then((orgunitParent) => {
                          if(!orgunitParent) {
                            const mess = {id: 404, error: 'Error: Parent OU -' + ouProps.parent + '- does not exist'};
                            logger.info(mess);
                            res.status(404).json({
                              "status": 404,
                              "message": "Parent OU -" + ouProps.parent + "- does not exist"
                            });
                          } else {
                            var temp = ouProps.alias;
                            if(temp.constructor !== Array) {
                              ouProps.alias = [temp];
                            };
                            const date = new Date();
                            const mod = {by: key, when: date, what: 'OU creation'};
                            ouProps.org = org._id;
                            ouProps.mod = new Array();
                            ouProps.mod.push(mod);
                            OrgUnit.create(ouProps)
                              .then(orgUnit => {
                                logger.info('OU -' + ouProps.name + '- created');
                                res.status(201).json({
                                  "status": 201,
                                  "message": "OU -" + ouProps.name + "- created"
                                });
                              })
                              .catch((err) => {
                                  logger.info(err);
                                  const mess = {id: 409, error: 'Error: OU -' + ouProps.name + '- already exists'};
                                  logger.info(mess);
                                  res.status(409).json({
                                    "status": 409,
                                    "message": "OU -" + ouProps.name + "- already exists"
                                  });
                              });
                            };
                        })
                        .catch((err) => {
                          logger.info(err);
                          res.status(500).json({
                            "status": 500,
                            "message": "Error",
                            "Error": err
                          });
                        });
                      } else {
                        var temp = ouProps.alias;
                        if(temp.constructor !== Array) {
                          ouProps.alias = [temp];
                        };
                        ouProps.parent = ouProps.org;
                        const date = new Date();
                        const mod = {by: key, when: date};
                        ouProps.org = org._id;
                        ouProps.mod = new Array();
                        ouProps.mod.push(mod);
                        OrgUnit.create(ouProps)
                          .then(() => {
                            logger.info('OU -' + ouProps.name + '- created');
                            res.status(201).json({
                              "status": 201,
                              "message": "OU -" + ouProps.name + "- created"
                            });
                          })
                          .catch((err) => {
                              logger.info(err);
                              const mess = {id: 422, error: 'Error: OU -' + ouProps.name + '- already exists'};
                              logger.info(mess);
                              res.status(406).json({
                                "status": 406
                                "message": "OU -" + ouProps.name + "- already exists"
                              });
                          });
                      };
                    };
                  })
                  .catch((err) => {
                    logger.info(err);
                    res.status(500);
                    res.json({
                      "status": 500,
                      "message": "Error"
                      "Error": err
                    });
                  });
              }; //else3
            } else { // else aqui
              res.status(403);
              res.json({
                "status": 403,
                "message": "User is not authorized"
              });
            }  // aqui
          }; //else2
        })
        .catch((err) => {
          logger.info(err);
          res.status(500);
          res.json({
            "status": 500,
            "message": "Error"
            "Error": err
          });
        });
    }; //else1
  }
};
