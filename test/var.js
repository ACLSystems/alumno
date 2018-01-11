let var1 = 'Hola';

console.log(var1);

if (var1 === 'Hola') {
  var1 = 'Adios'
  var var2 = 'Tu eres lo maximo'
}

console.log(var1);
console.log(var2);
var var3 = imprime(var1,var2);
console.log(var3);

function imprime(var1, var2) {
  var1 = var1 + ' funcion var 1';
  console.log(var1);
  if( var2 === 'Tu eres lo maximo') {
    var2 = 'Lo se';
  }
  return var2;
}
