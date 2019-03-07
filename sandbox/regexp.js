/*
var str = '{ MongoError: E11000 duplicate key error collection: alumno.users index: name_1 dup key: { : "usuario1" }';
var re = new RegExp("duplicate key error collection");
var found = str.match(re);
if (found) {
console.log(found);
}
*/


var palabra = '$2a$10$ecktqCwSMlDmS7KIqxC66eKZ7FOArtZ4YQJKz214sbTnLP5WeGYoW';
var palabra2 = 'miPassword';
var re = /^\$2a\$10\$.*/;
var found = re.test(palabra);
var found2 = re.test(palabra2);
console.log(found);
console.log(found2);
