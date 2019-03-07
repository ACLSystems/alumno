function test(value) {
	var data = new Promise(function(resolve,reject) {
		setTimeout(() => {
			if(value < 10) {
				resolve(value);
			} else {
				reject('Valores menores a 10, por favor');
			}
		}, 1000);
	});
	return data;
}

async function makeRequest() {
	var data = await test(1).catch(err => {console.log(err);});
	console.log(data);
	data = await test(data*2).catch(err => {console.log(err);});
	console.log(data);
	data = await test(data*2).catch(err => {console.log(err);});
	console.log(data);
	data = await test(data*2).catch(err => {console.log(err);});
	console.log(data);
	data = await test(data*2).catch(err => {console.log(err);});
	console.log(data);
	data = await test(data*2).catch(err => {console.log(err);});
	console.log(data);
}

makeRequest();
