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
    // Query vacio
    if(!req.query ) {
      const mess = {id: 417, err: 'Por favor, proporcione los datos para procesar'};
      res.status(417).send(mess);
    } else {
      // extraemos el query
      const userProps = req.query;
      // No trae organizacion
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
                    var permUsers = new Array();
                    const permUser = { name: userProps.username, canRead: true, canModify: true, canSec: false };
                    permUsers.push(permUser);
                    var permRoles = new Array();
                    var permRole = { name: 'Admin', canRead: true, canModify: true, canSec: true };
                    permRoles.push(permRole);
                    var permOrgs = new Array();
                    var permOrgUnits = new Array();
                    if( org != 'public' ) {
                      permRole = { name: 'Org', canRead: true, canModify: true, canSec: true };
                      permRoles.push(permRole);
                      const permOrg = { name: userProps.org, canRead: true, canModify: true, canSec: false };
                      permOrgs.push(permOrg);
                      const permOrgUnit = { name: userProps.orgUnit, canRead: true, canModify: false, canSec: false };
                    };
                    userProps.perm = { users: permUsers, roles: permRoles, orgs: permOrgs, orgUnits: permOrgUnits };
                    userProps.org = org._id;
                    userProps.orgUnit = ou._id;
                    const date = new Date();
                    const mod = { by: userProps.username, when: date };
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
                        const mess = {id: 500, error: 'Error: ' + err};
                        logger.info(mess);
                        res.status(500).send(mess);
                      });
                  }
                })
                .catch((err) => {
                  const mess = {id: 500, error: 'Error: ' + err};
                  logger.info(mess);
                  res.status(500).send(mess);
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
  },

  validateEmail(req, res, next) {
      if(!req.query) {
        const mess = {id: 417, err: 'Por favor, proporcione los datos para procesar'};
        res.status(417).send(mess);
      } else {
        const userProps = req.query;
        if(!userProps.email) {
          const mess = {id: 417, err: 'Por favor, proporcione el correo elecronico'};
          res.status(417).send(mess);
        } else {
          console.log(userProps.email);
          User.findOne({ 'person.email': userProps.email})
            .then((email) => {
              if(email) {
                res.status(200);
                res.json({
                  "status": 200,
                  "message": "Email existe " + email
                });
              } else {
                res.status(404);
                res.json({
                  "status": 404,
                  "message": "Email no existe "
                });
              };
            })
            .catch((err) => {
              res.status(500);
              res.json({
                "status": 500,
                "message": "Error: " + err
              })
            });
        };
      };
  }
};
