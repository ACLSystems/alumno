const winston = require('winston');
const User = require('../src/users');
const Org = require('../src/orgs');
const OrgUnit = require('../src/orgUnits');
const generate = require('nanoid/generate');
const moment = require('moment');
const bcrypt = require('bcrypt-nodejs');
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
      var numUsers = {
        requested: usersReq.length
      };
      var key = (req.body && req.body.x_key) || req.headers['x-key'];
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
                var failed = new Array();
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
                    failed.push({ name: val.name, nStat: 'ok', org: val.org, oStat: orgStatus, orgUnit: val.orgUnit, ouStat: orgUnitStatus });
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
                    val.roles = addRoles();
                    var admin = {
                      isActive: true,
                      isVerified: false,
                      recoverString: '',
                      passwordSaved: ''
                    };
                    val.admin = admin;
                    usersToInsert.push(val);
                    usersToInsertNames.push(val.name);
                    if(val.person.name) { val.person.name = properCase(val.person.name) };
                    if(val.person.fatherName) { val.person.fatherName = properCase(val.person.fatherName) };
                    if(val.person.motherName) { val.person.motherName = properCase(val.person.motherName) };
                  };
                });
                User.find({name: {$in: usersToInsertNames}})
                  .then((usersFound) => {
                    usersFound.forEach(function(val1,index1) {
                      usersToInsert.forEach(function(val2,index2) {
                        if(val2.name === val1.name) {
                          var user = usersToInsert.splice(index2,1);
                          user[0]._id = val1._id;
                          user[0].mod = val1.mod;
                          user[0].admin = val1.admin;
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
                      numUsers.inserted = usersToInsert.length;
                    };
                    if(usersToUpdate) {
                      usersToUpdate.forEach(function(userToUpdate,index) {
                        delete userToUpdate.roles;
                        delete userToUpdate.perm;
                        const date = new Date();
                        const mod = {
                          by: key,
                          when: date,
                          what: 'Massive User Modification'
                        };
                        userToUpdate.mod.push(mod);
                        if(userToUpdate.password) {
                          userToUpdate.password = encryptPass(userToUpdate.password);
                          userToUpdate.admin.passwordSaved = 'saved';
                        };
                        User.update({_id: userToUpdate._id}, {$set: userToUpdate})
                        .catch((err) => {
                          const mess = {id: 500, error: 'Error: ' + err};
                          logger.info(mess);
                          res.status(500).send(mess);
                        });
                      });
                      numUsers.updated = usersToUpdate.length;
                    };
                    numUsers.failed = failed.length;
                    var result = numUsers;
                    result.details = failed;
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

// Private Functions

function properCase(obj) {
  var name = new String(obj);
  var newName = new String();
  var nameArray = name.split(" ");
  var arrayLength = nameArray.length - 1;
  nameArray.forEach(function(word,i) {
    word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    if(i === arrayLength) { newName += word } else { newName += word + ' '};
  });
  return newName;
};

function addRoles() {
  return {
    isAdmin: false,
    isBusiness: false,
    isOrg: false,
    isOrgContent: false,
    isAuthor: false,
    isInstructor: false,
    isSupervisor: false
  };
};

function encryptPass(obj) {
    var salt = bcrypt.genSaltSync(10);
    obj = bcrypt.hashSync(obj, salt);
    return obj;
};

function sendError(err) {
    const mess = {id: 500, error: 'Error: ' + err};
    logger.info(mess);
    res.status(500).send(mess);
    return;
}
