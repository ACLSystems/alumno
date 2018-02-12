var test = [
	{
		'name': 'a',
		'value': 'Compu Learning',
		'_id': '5a7faff04cb0fe71030a20d7'
	},
	{
		'name': 'b',
		'value': 'E-Learning',
		'_id': '5a7faff04cb0fe71030a20d6'
	},
	{
		'name': 'c',
		'value': 'Digital Room',
		'test': 'Esto es otro',
		'_id': '5a7faff04cb0fe71030a20d5'
	},
	{
		'name': 'd',
		'value': 'Clase Presencial',
		'_id': '5a7faff04cb0fe71030a20d4'
	}
];

var newtest = removeId(test);

console.log(newtest);

function removeId(array) {
	var newarray = new Array();
	array.forEach(elem => {
		var newelem = {};
		for(var key in elem) {
			console.log(key);
			if(key !== '_id') {
				newelem[key] = elem[key];
			}
		}
		newarray.push(newelem);
	});
	return newarray;
}
