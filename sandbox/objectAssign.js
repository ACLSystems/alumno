var user = {
	a: 1,
	b: {
		a: 1024,
		b: 2048
	},
	c: {
		a: 55,
		b: 99,
		c: 77
	}
}

const modify = {
	a: 2,
	b: {
		a: 1111
	},
	c: {
		b: 88
	},
	d: 2019
}

console.log(user);
console.log(modify);

var copy = mergeDeep({},user);

//Object.assign(user, modify);
user.b = mergeDeep(user.b,modify.b);

console.log(user);

var object = mergeDeep(user,{});

console.log(copy);
console.log(object);

function isObject(item) {
	return (item && typeof item === 'object' && !Array.isArray(item) && item !== null);
}

function mergeDeep(target, source) {
	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) Object.assign(target, { [key]: {} });
				mergeDeep(target[key], source[key]);
			} else {
				Object.assign(target, { [key]: source[key] });
			}
		}
	}
	return target;
}
