const str = 'hello!';
var result = str.endsWith('lo!');

console.log(result);

result = str.endsWith('ell', 4);

// prints "false"
console.log(result);

const name = 'Arturo Castro';
result = name.includes('Arturo');
console.log(result);

result = name.startsWith('Hola');
console.log(result);

result = String.raw`Hello, my name is ${name}`;

console.log(result);
