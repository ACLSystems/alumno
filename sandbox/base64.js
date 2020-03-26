// 'use strict';
//
// let data = process.argv[2];
// let buff = new Buffer.from(data);
// let base64data = buff.toString('base64');
//
// console.log('"' + data + '" converted to Base64 is "' + base64data + '"');
const fs = require('fs');

const file = process.argv[2];

const text = fs.readFileSync(file, 'utf8');

const buff = Buffer.from(text);

const base64data = buff.toString('base64');

console.log(base64data);

// const buffOut = Buffer.from(base64data, 'base64');
//
// const textOut = buffOut.toString('utf-8');
//
// console.log(textOut);
