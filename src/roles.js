// Esquema para modelar Unidades Organizacionales
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const rolesSchema = new Schema ({
  role: [
    "Admin",
    "Business",
    "Org",
    "OrgContent",
    "Author",
    "Instructor",
    "Supervisor"
  ]
});

const role = mongoose.model('role', rolesSchema);
module.exports = role;
