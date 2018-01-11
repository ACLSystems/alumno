const winston = require('winston');
const User = require('../src/users');
const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
const generate = require('nanoid/generate');
const moment = require('moment');
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
  massiveRegister(req,res,next) {
    if(!req.body ) {
      const mess = {id: 417, err: 'Please, give data to process'};
      res.status(417).send(mess);
    } else {
      usersReq = req.body;
      var key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
      if(!key) {
        key = 'admin';
      }
      Org.find({}, {name: true})
        .then((orgs) => {
            OrgUnit.find({})
              .populate('org')
              .then((orgUnits) => {
                var objOrg = '';
                var objOrgUnit = '';
                var result = new Array();
                var status = 'ok';
                var admin = {
                  isActive: true,
                  isVerified: false
                };
                var permRoles = new Array();
                var permRole = { name: 'Admin', canRead: true, canModify: true, canSec: true };
                permRoles.push(permRole);
                var usersToInsert = new Array();
                var usersToInsertNames = new Array();
                var usersToUpdate = new Array();
                var usersToUpdateNames = new Array();
                usersReq.forEach(function(val,index) {
                  objOrg = orgs.find(function(objOrg) {return objOrg.name === val.org; });
                  objOrgUnit = orgUnits.find(function(objOrgUnit) {return (objOrgUnit.parent === val.parent || !objOrgUnit.parent) && objOrgUnit.name === val.orgUnit && objOrgUnit.org.name === val.org; });
                  var orgStatus = 'ok';
                  var orgUnitStatus = 'ok';
                  if(!objOrg) {
                    orgStatus = 'Not found';
                    status = 'Some errors found';
                  };
                  if(!objOrgUnit) {
                    orgUnitStatus = 'Not found';
                    status = 'Some errors found';
                  }
                  if(status === 'Some errors found') {
                    result.push({ name: val.name, nStat: 'ok', org: val.org, oStat: orgStatus, orgUnit: val.orgUnit, ouStat: orgUnitStatus });
                    status = 'ok';
                  } else {
                    var permUsers = new Array();
                    var permUser = { name: key, canRead: true, canModify: true, canSec: true };
                    permUsers.push(permUser);
                    permUser = { name: val.name, canRead: true, canModify: true, canSec: false };
                    permUsers.push(permUser);
                    var permOrgs = new Array();
                    var permOrg = { name: val.org, canRead: true, canModify: true, canSec: false };
                    permOrgs.push(permOrg);
                    val.perm = { users: permUsers, roles: permRoles, orgs: permOrgs };
                    const date = new Date();
                    const mod = {
                      by: key,
                      when: date,
                      what: 'User creation'
                    };
                    val.mod = new Array();
                    val.mod.push(mod);
                    val.org = objOrg._id;
                    val.orgUnit = objOrgUnit._id;
                    var admin = {
                      isActive: true,
                      isVerified: false,
                      recoverString: '',
                      passwordSaved: ''
                    };
                    val.admin = admin;
                    usersToInsert.push(val);
                    usersToInsertNames.push(val.name);
                  };
                });
                User.find({name: {$in: usersToInsertNames}}, {name: true})
                  .then((usersFound) => {
                    usersFound.forEach(function(val1,index1) {
                      usersToInsert.forEach(function(val2,index2) {
                        if(val2.name === val1.name) {
                          var user = usersToInsert.splice(index2,1);
                          user[0]._id = val1._id;
                          usersToUpdate.push(user[0]);
                          usersToUpdateNames.push(user[0].name);
                        }
                      });
                    });
                    if(usersToInsert) {
                      User.insertMany(usersToInsert)
                        .catch((err) => {
                          const mess = {id: 500, error: 'Error: ' + err};
                          logger.info(mess);
                          res.status(500).send(mess);
                        });
                    };
                    if(usersToUpdate) {
                      usersToUpdate.forEach(function(userToUpdate,index) {
                        const date = new Date();
                        const mod = {
                          by: key,
                          when: date,
                          what: 'User Modification'
                        };
                        userToUpdate.mod.push(mod);
                        User.update({_id: userToUpdate._id}, {$set: userToUpdate})
                        .catch((err) => {
                          const mess = {id: 500, error: 'Error: ' + err};
                          logger.info(mess);
                          res.status(500).send(mess);
                        });
                      });
                    };
                    res.status(200);
                    res.json({
                      "status": 200,
                      "message": result
                    });
                  })
                  .catch((err) => {
                    const mess = {id: 500, error: 'Error: ' + err};
                    logger.info(mess);
                    res.status(500).send(mess);
                  });
              })
              .catch((err) => {
                const mess = {id: 500, error: 'Error: ' + err};
                logger.info(mess);
                res.status(500).send(mess);
              });
        })
        .catch((err) => {
          const mess = {id: 500, error: 'Error: ' + err};
          logger.info(mess);
          res.status(500).send(mess);
        });
    };
  }
};
