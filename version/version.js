const version = '1.42.8';

const now = new Date();
module.exports = {
	app: 'alumno',
	version: version,
	year: now.getFullYear(),
	time: now,
	vendor: 'ACL Systems SA de CV',
	numVersion: version.replace(/\./g, '')
	// se utiliza semver
};
