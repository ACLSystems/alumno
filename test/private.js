const permissions = require('../shared/permissions');

const user = {
 "name" : "adminito",
 "password" : "$2a$10$xa5IJczpliqv9xSUeGIeeuDLSAPE1lZC.wRjtVxUJ3/5hU6cM9l0a",
 "org" : 'acl',
 "orgUnit" : 'acl',
 "roles" : {
  "isSupervisor" : false,
  "isInstructor" : false,
  "isAuthor" : false,
  "isOrgContent" : false,
  "isOrg" : true,
  "isBusiness" : false,
  "isAdmin" : false
 },
 "perm" : {
  "orgUnits" : [
   {
    "name" : "acl",
    "canSec" : true,
    "canModify" : true,
    "canRead" : true
   }
  ],
  "orgs" : [
   {
    "name" : "acl",
    "canSec" : true,
    "canModify" : true,
    "canRead" : true
   }
  ],
  "roles" : [
   {
    "name" : "isAdmin",
    "canSec" : true,
    "canModify" : true,
    "canRead" : true
   }
  ],
  "users" : [
   {
    "name" : "admin",
    "canSec" : true,
    "canModify" : true,
    "canRead" : true
   }
  ]
 },
 "admin" : {
  "passwordSaved" : "saved",
  "recoverString" : "",
  "isVerified" : true,
  "isActive" : true
 },
 "mod" : [
  {
   "what" : "User creation",
   "when" : '',
   "by" : "init"
  }
 ]
};

const object = {
 "name" : "acl",
 "longName" : "ACL Systems S.A. de C.V.",
 "perm" : {
  "orgUnits" : [
   {
    "name" : "acl",
    "canSec" : true,
    "canModify" : true,
    "canRead" : true
   }
  ],
  "orgs" : [
   {
    "name" : "acl",
    "canSec" : true,
    "canModify" : true,
    "canRead" : true
   }
  ],
  "roles" : [{
    name: 'isAdmin',
    canRead: true,
    canModify: true,
    canSec: true
  },{
    name: 'isOrg',
    canRead: true,
    canModify: true,
    canSec: true
  }],
  "users" : [
   {
    "name" : "adminito",
    "canSec" : true,
    "canModify" : true,
    "canRead" : true
   }
  ]
 },
 "mod" : [
  {
   "what" : "Org creation",
   "when" : '',
   "by" : "init"
  }
 ],
 "isActive" : true,
 "alias" : [
  "acl systems",
  "ACL",
  "ACL Systems"
 ]
};

var result = permissions.access(user,object,'group');
console.log('Resultado: ---');
console.log(result);
