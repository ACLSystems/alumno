var array = new Array();


array[2] = {};

console.log(JSON.stringify(array,null,2));



var array2 = [
	{ w: 1,
		question: "123456"
	},
	{ w: 1,
		question: "123457"
	},
	{ w: 1,
		question: "123458"
	}
];

var array3 = Array.from(array2, x => x.question);

console.log(JSON.stringify(array3,null,2));
