const version = '1.17.15';

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
