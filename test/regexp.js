var str = '{ MongoError: E11000 duplicate key error collection: alumno.users index: name_1 dup key: { : "usuario1" }';
var re = new RegExp("duplicate key error collection");
var found = str.match(re);
if (found) {
console.log(found);
}
