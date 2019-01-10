//const moment = require('moment');
const Time = require('../shared/time');


//var now = moment.utc();


//console.log(now);

//var cst = moment.utc(now).utcOffset("-06:00");

//console.log(cst);

var now = new Date();

console.log(Time.displayLocalTime(now));
