var array = new Array();

var elem1 = {
	name: 'hola',
	type: 1
};

var elem2 = {
	name: 'cómo',
	type: 2
};

var elem3 = {
	name: 'estas',
	type: 3
};


array.push(elem1);
array.push(elem2);

console.log(JSON.stringify(array));

array.splice(1,0,elem3);

console.log(JSON.stringify(array));
