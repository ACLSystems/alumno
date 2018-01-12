module.exports = {
  help(req, res) {
    res.status(200);
    res.json({
      "help": "/api/help",
      "login": "/login",
      "user": {
        "register": "/api/user/register",
        "validateEmail": "/api/user/validateEmail",
        "passwordChange": "/api/user/passwordChange",
        "getDetails": "/api/v1/user/getDetails",
        "modify": "/api/v1/user/modify"
      },
      "massiveRegister": {
        "massiveRegister": "/api/v1/user/massiveRegister"
      },
      "org": {
        "register": "/api/v1/org/register"
      },
      "orgunit": {
        "register": "/api/v1/orgunit/register"
      }
    });
  }
};
