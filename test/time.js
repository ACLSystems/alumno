const moment = require('moment');


var now = moment.utc();


console.log(now);

var cst = moment.utc(now).utcOffset("-06:00");

console.log(cst);
