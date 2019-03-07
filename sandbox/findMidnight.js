const Time = require('../shared/time');
const midnight = new Date();
console.log(midnight.toDateString());
var {date} = Time.displayLocalTime(midnight);
console.log(typeof date);
date = new Date(date);
const tzDiff = date.getTimezoneOffset();
date = new Date(date.getTime() + tzDiff * 60000);
console.log(date.toDateString());
