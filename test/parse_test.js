var testA = ['arturo'];
try {
	var testB = JSON.parse(testA)
} catch(err) {
	if(err instanceof SyntaxError ) {
		console.log('Error de sintaxis');
	}
};
//console.log(testB);
