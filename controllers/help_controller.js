module.exports = {
  help(req, res) {
    res.status(200);
    res.json({
      "help": {
          "access": "/api/help",
          "description": "This help"
      },
      "login": {
        "access": "/login",
        "description": "Use login to get access to must APIs"
      },
      "user": {
        "register": {
          "access": "/api/user/register",
          "description": "to register an user"
        },
        "validateEmail": {
          "access": "/api/user/validateEmail",
          "description": "used to validate email user when he/she losts his/her password. This returns token to construct URL for password change"
        },
        "passwordChange": {
          "access": "/api/user/passwordChange",
          "description": "used to change password. It must have token previously granted by validateEmail"
        },
        "getDetails": {
          "access": "/api/v1/user/getDetails",
          "description": "get user details"
        },
        "modify": {
          "access": "/api/v1/user/modify",
          "description": "modify user details. This API is intended for user. Do not modify admin properties"
        }
      },
      "massiveRegister": {
        "massiveRegister": {
          "access": "/api/v1/orgadm/user/massiveRegister",
          "description": "register users in massive way"
        }
      },
      "org": {
        "register": {
          "access": "/api/v1/admin/org/register",
          "description": "register organization. Requires token obtained from login. Only Admin can create organizations"
        }
      },
      "orgunit": {
        "register": {
          "access": "/api/v1/orgadm/orgunit/register",
          "description": "register organizational unit. Requires token obtained from login. Only Org can create OUs"
        }
      }
    });
  }
};
