const randomize = require('randomatic');
const dir = '/User/Arturo/data';

var ran1 = randomize('01234567890abcdef',4);
var ran2 = randomize('01234567890abcdef',4);

console.log(dir + '/' + ran1 + '/' + ran2);
