
var firstArray = [
	{ block: '12345', value : '1a' },
	{ block: '54321', value : '2a' },
	{ block: '12349', value : '3a' },
	{ block: '12358', value : '4a' },
	{ block: '12356', value : '5a' },
	{ block: '12367', value : '6a' },
	{ block: '12378', value : '7a' }
];

/*
var secondArray = [
	{ block: '12345', value : '1b' },
	{ block: '54321', value : '2b' }
]


var result = secondArray.reduce(function(r, e) {
	var f = firstArray.find(el => e.block == el.block);
	r.push(f ? f : e);
	return r;
}, []);

console.log(result);
console.log(result.length);
*/

var element = '12367';

var index = firstArray.findIndex(e => e.block === element);
if(index > -1){
	console.log(index);
	console.log(firstArray[index]);
} else {
	console.log('Not found');
}
